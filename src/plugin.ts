import type { FastifyPluginAsync } from 'fastify';
import type { CookieSerializeOptions } from 'fastify-cookie';
import { kCookieOptions, Session, SessionStore } from './session';
import './typings';
import { asBuffer, buildKeyFromSecretAndSalt, sanitizeSecretKeys } from './utils';

export const DEFAULT_COOKIE_NAME = 'Session';
export const DEFAULT_COOKIE_PATH = '/';

export type SecretKey = Buffer | string | (Buffer | string)[];

export type FastifySessionOptions = {
  salt?: Buffer | string;
  secret?: Buffer | string;
  key?: SecretKey;
  cookieName?: string;
  cookie?: CookieSerializeOptions;
  store?: SessionStore;
  saveUninitialized?: boolean;
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (fastify, options): Promise<void> => {
  const {
    key,
    secret,
    salt,
    cookieName = DEFAULT_COOKIE_NAME,
    cookie: cookieOptions = {},
    store,
    saveUninitialized = true,
  } = options;

  if (!key && !secret) {
    throw new Error('key or secret must specified');
  }

  const secretKeys: Buffer[] = secret
    ? [buildKeyFromSecretAndSalt(asBuffer(secret), salt ? asBuffer(salt, 'base64') : undefined)]
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      sanitizeSecretKeys(key!);

  if (!cookieOptions.path) {
    cookieOptions.path = DEFAULT_COOKIE_PATH;
  }

  Session.configure({ cookieOptions, secretKeys, store });

  fastify.decorateRequest('session', null);
  fastify.decorateRequest('sessionStore', null);
  fastify.decorateRequest('destroySession', null);

  // decode/create a session for every request
  fastify.addHook('onRequest', async (request) => {
    request.sessionStore = store;

    request.destroySession = async () => {
      if (!request.session) {
        return;
      }

      await request.session.destroy();
    };

    const { cookies, log } = request;
    const cookie = cookies[cookieName];
    if (!cookie) {
      log.debug('fastify-session/onRequest: there is no cookie, creating an empty session');
      request.session = new Session();
      return;
    }
    try {
      log.debug('fastify-session: found an existing cookie, attempting to decode session');
      request.session = await Session.fromCookie(cookie);
      log.debug('fastify-session: session successfully decoded');
      return;
    } catch (err) {
      log.debug(`fastify-session: decoding error: ${err.message}, creating an empty session`);
      request.session = new Session();
      return;
    }
  });

  // encode a cookie
  fastify.addHook('onSend', async (request, reply) => {
    const { log, session } = request;

    if (!session) {
      log.debug('fastify-session: there is no session, leaving it as is');
      return;
    } else if (!saveUninitialized && !Object.keys(session.data).length) {
      log.debug('fastify-session: session is empty and !saveUninitialized, leaving it as is');
      return;
    } else if (!session.changed && !session.created && !session.rotated) {
      log.debug('fastify-session: the existing session was not changed, leaving it as is');
      return;
    } else if (session.deleted) {
      log.debug('fastify-session: deleting session');
      reply.setCookie(cookieName, '', {
        ...cookieOptions,
        ...session[kCookieOptions],
        expires: new Date(0),
        maxAge: 0,
      });
      return;
    }

    // code: reply.statusCode
    if (session.created || session.changed) {
      log.debug('fastify-session: saving session');
      await session.save();
    }
    reply.setCookie(cookieName, await session.toCookie(), { ...cookieOptions, ...session[kCookieOptions] });
  });
};
