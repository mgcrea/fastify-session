import type { FastifyPluginAsync } from 'fastify';
import type { CookieSerializeOptions } from 'fastify-cookie';
import { kCookieOptions, Session, SessionStore } from './session';
import './typings';
import { asBuffer, buildKeyFromSecretAndSalt, sanitizeSecretKeys } from './utils';

export const DEFAULT_COOKIE_NAME = 'session';

export type SecretKey = Buffer | string | (Buffer | string)[];

export type FastifySessionOptions = {
  salt?: Buffer | string;
  secret?: Buffer | string;
  key?: SecretKey;
  cookieName?: string;
  cookie?: CookieSerializeOptions;
  store?: SessionStore;
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (fastify, options): Promise<void> => {
  const { key, secret, salt, cookieName = DEFAULT_COOKIE_NAME, cookie: cookieOptions = {}, store } = options;

  if (!key && !secret) {
    throw new Error('key or secret must specified');
  }

  const secretKeys: Buffer[] = secret
    ? [buildKeyFromSecretAndSalt(asBuffer(secret), salt ? asBuffer(salt, 'base64') : undefined)]
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      sanitizeSecretKeys(key!);

  Session.configure({ secretKeys, store });

  // decode/create a session for every request
  fastify.addHook('onRequest', async (request) => {
    const { cookies, log } = request;
    const cookie = cookies[cookieName];
    if (!cookie) {
      log.debug('fastify-session: there is no cookie, creating an empty session');
      request.session = new Session();
      return;
    }
    try {
      request.session = await Session.fromCookie(cookie);
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

    if (!session || (!session.changed && !session.rotated)) {
      // nothing to do
      log.debug("fastify-session: there is no session or the session didn't change, leaving it as is");
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

    log.debug('fastify-session: setting session');
    reply.setCookie(cookieName, await session.toCookie(), { ...cookieOptions, ...session[kCookieOptions] });
  });
};
