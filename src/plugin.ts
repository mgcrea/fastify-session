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
    const bindings = { ...logBindings, hook: 'onRequest' };

    const cookie = cookies[cookieName];
    if (!cookie) {
      request.session = new Session();
      log.debug({ ...bindings, sessionId: request.session.id }, 'There was no cookie, created an empty session');
      return;
    }
    try {
      log.debug(bindings, 'Found an existing cookie, attempting to decode session ...');
      request.session = await Session.fromCookie(cookie);
      log.info({ ...bindings, sessionId: request.session.id }, 'Session successfully decoded');
      return;
    } catch (err) {
      request.session = new Session();
      log.warn(
        { ...bindings, err, sessionId: request.session.id },
        `Failed to decode existing cookie, created an empty session`
      );
      return;
    }
  });

  // encode a cookie
  fastify.addHook('onSend', async (request, reply) => {
    const { session, log } = request;
    const bindings = { ...logBindings, hook: 'onSend' };

    if (!session) {
      log.debug(bindings, 'There was no session, leaving it as is');
      return;
    } else if (!saveUninitialized && !Object.keys(session.data).length) {
      log.debug(bindings, "Created session is empty and won't be saved, leaving it as is");
      return;
    } else if (!session.changed && !session.created && !session.rotated) {
      log.debug({ ...bindings, sessionId: session.id }, 'The existing session was not changed, leaving it as is');
      return;
    } else if (session.deleted) {
      reply.setCookie(cookieName, '', {
        ...cookieOptions,
        ...session[kCookieOptions],
        expires: new Date(0),
        maxAge: 0,
      });
      log.info({ ...bindings, sessionId: session.id }, 'Deleted session');
      return;
    }

    if (session.created || session.changed) {
      log.debug(
        { ...bindings, sessionId: session.id },
        `About to send a ${session.created ? 'created' : 'changed'} session, saving ...`
      );
      await session.save();
      log.info(
        { ...bindings, sessionId: session.id },
        `${session.created ? 'Created' : 'Changed'} session successfully saved`
      );
    }
    reply.setCookie(cookieName, await session.toCookie(), { ...cookieOptions, ...session[kCookieOptions] });
  });
};
