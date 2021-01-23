import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
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
  logBindings?: Record<string, unknown>;
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (fastify, options = {}): Promise<void> => {
  const {
    key,
    secret,
    salt,
    cookieName = DEFAULT_COOKIE_NAME,
    cookie: cookieOptions = {},
    store,
    saveUninitialized = true,
    logBindings = { plugin: 'fastify-session' },
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
  async function destroySession(this: FastifyRequest) {
    if (!this.session) {
      return;
    }
    await this.session.destroy();
  }
  fastify.decorateRequest('destroySession', destroySession);

  // decode/create a session for every request
  fastify.addHook('onRequest', async (request) => {
    const { cookies, log } = request;

    const cookie = cookies[cookieName];
    if (!cookie) {
      log.debug(logBindings, 'There is no cookie, creating an empty session');
      request.session = new Session();
      return;
    }
    try {
      log.debug(logBindings, 'Found an existing cookie, attempting to decode session');
      request.session = await Session.fromCookie(cookie);

      log.debug(logBindings, 'Session successfully decoded');
      return;
    } catch (err) {
      log.debug(logBindings, `Decoding error: ${err.message}, creating an empty session`);
      request.session = new Session();
      return;
    }
  });

  // encode a cookie
  fastify.addHook('onSend', async (request, reply) => {
    const { session, log } = request;

    if (!session) {
      log.debug(logBindings, 'There is no session, leaving it as is');
      return;
    } else if (!saveUninitialized && !Object.keys(session.data).length) {
      log.debug(logBindings, "Session is empty and won't be saved, leaving it as is");
      return;
    } else if (!session.changed && !session.created && !session.rotated) {
      log.debug(logBindings, 'The existing session was not changed, leaving it as is');
      return;
    } else if (session.deleted) {
      log.debug(logBindings, 'Deleting session');
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
      log.debug('Saving created/changed session');
      await session.save();
    }
    reply.setCookie(cookieName, await session.toCookie(), { ...cookieOptions, ...session[kCookieOptions] });
  });
};
