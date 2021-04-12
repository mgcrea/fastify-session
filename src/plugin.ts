import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { CookieSerializeOptions } from 'fastify-cookie';
import { isMatch } from 'micromatch';
import { HMAC, SecretKey, SessionCrypto } from './crypto';
import { kCookieOptions, Session } from './session';
import { SessionStore } from './store';
import './typings';
import { QuerystringOptions, Querystring } from './typings';

export const DEFAULT_COOKIE_NAME = 'Session';
export const DEFAULT_COOKIE_PATH = '/';
export const DEFAULT_QUERYSTRING_PATHS = '/*';
export const DEFAULT_QUERYSTRING_KEY = 'session';

export type FastifySessionOptions = {
  salt?: Buffer | string;
  secret?: Buffer | string;
  key?: SecretKey;
  cookieName?: string;
  cookie?: CookieSerializeOptions;
  store?: SessionStore;
  crypto?: SessionCrypto;
  saveUninitialized?: boolean;
  logBindings?: Record<string, unknown>;
  querystring?: QuerystringOptions;
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (fastify, options = {}): Promise<void> => {
  const {
    key,
    secret,
    salt,
    cookieName = DEFAULT_COOKIE_NAME,
    cookie: cookieOptions = {},
    store,
    crypto = HMAC as SessionCrypto,
    saveUninitialized = true,
    logBindings = { plugin: 'fastify-session' },
    querystring,
  } = options;

  if (!key && !secret) {
    throw new Error('key or secret must specified');
  }
  if (!crypto) {
    throw new Error('invalid crypto specified');
  }

  if (!cookieOptions.path) {
    cookieOptions.path = DEFAULT_COOKIE_PATH;
  }

  if (typeof querystring === 'object') {
    if (!querystring.paths) {
      querystring.paths = DEFAULT_QUERYSTRING_PATHS;
    }
  }

  const secretKeys: Buffer[] = crypto.deriveSecretKeys(key, secret, salt);
  Session.configure({ cookieOptions, secretKeys, store, crypto });

  fastify.decorateRequest('session', null);
  async function destroySession(this: FastifyRequest) {
    if (!this.session) {
      return;
    }
    await this.session.destroy();
  }
  fastify.decorateRequest('destroySession', destroySession);

  // decode/create a session for every request
  fastify.addHook<{ Querystring: Querystring }>('onRequest', async (request) => {
    const { cookies, log, query } = request;
    const bindings = { ...logBindings, hook: 'onRequest' };

    // set false cookie if session id provided in query parameter
    if (querystring) {
      log.debug({ ...bindings, querystring: query }, 'Query string option detected');

      // matching specified route
      if (isMatch(request.routerPath, querystring.paths)) {
        if (!cookies[cookieName] && query[querystring.key]) {
          cookies[cookieName] = decodeURIComponent(query[querystring.key]);
          log.debug(
            { ...bindings, [querystring.key]: query[querystring.key], cookies },
            'Path matches options, setting false cookie'
          );
        }
      } else log.debug({ ...bindings, [querystring.key]: query[querystring.key] }, "Path doesn't match options");
    }

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
      log.debug(
        { ...bindings, sessionId: session.id },
        "Created session is empty and won't be saved, leaving it as is"
      );
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
        `About to save a ${session.created ? 'created' : 'changed'} session, saving ...`
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
