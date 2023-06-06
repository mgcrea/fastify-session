import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { HMAC, SessionCrypto, type SecretKey } from "./crypto";
import { Session } from "./session";
import type { SessionStore } from "./store";

export const DEFAULT_COOKIE_NAME = "Session";
export const DEFAULT_COOKIE_PATH = "/";

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
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (
  fastify,
  options = {}
): Promise<void> => {
  const {
    key,
    secret,
    salt,
    cookieName = DEFAULT_COOKIE_NAME,
    cookie: cookieOptions = {},
    store,
    crypto = HMAC as SessionCrypto,
    saveUninitialized = true,
    logBindings = { plugin: "fastify-session" },
  } = options;

  if (!key && !secret) {
    throw new Error("key or secret must specified");
  }
  if (!crypto) {
    throw new Error("invalid crypto specified");
  }

  if (!cookieOptions.path) {
    cookieOptions.path = DEFAULT_COOKIE_PATH;
  }
  const secretKeys: Buffer[] = crypto.deriveSecretKeys(key, secret, salt);
  Session.configure({ cookieOptions, secretKeys, store, crypto });

  fastify.decorateRequest("session", null);
  async function destroySession(this: FastifyRequest) {
    if (!this.session) {
      return;
    }
    await this.session.destroy();
  }
  fastify.decorateRequest("destroySession", destroySession);

  // decode/create a session for every request
  fastify.addHook("onRequest", async (request) => {
    const { cookies, log } = request;
    const bindings = { ...logBindings, hook: "onRequest" };

    const cookie = cookies[cookieName];
    if (!cookie) {
      request.session = await Session.create();
      log.debug(
        { ...bindings, sessionId: request.session.id },
        "There was no cookie, created an empty session"
      );
      return;
    }
    try {
      log.debug(bindings, "Found an existing cookie, attempting to decode session ...");
      request.session = await Session.fromCookie(cookie);
      log.debug({ ...bindings, sessionId: request.session.id }, "Session successfully decoded");
      return;
    } catch (err) {
      request.session = await Session.create();
      log.warn(
        { ...bindings, err, sessionId: request.session.id },
        `Failed to decode existing cookie, created an empty session`
      );
      return;
    }
  });

  // encode a cookie
  fastify.addHook("onSend", async (request, reply) => {
    const { session, log } = request;
    const bindings = { ...logBindings, hook: "onSend" };

    if (!session) {
      log.debug(bindings, "There was no session, leaving it as is");
      return;
    } else if (session.deleted) {
      reply.setCookie(cookieName, "", {
        ...session.options,
        expires: new Date(0),
        maxAge: 0,
      });
      log.debug(
        { ...bindings, sessionId: session.id },
        `Deleted ${session.created ? "newly created" : "existing"} session`
      );
      return;
    } else if (!saveUninitialized && session.isEmpty()) {
      log.debug(
        { ...bindings, sessionId: session.id },
        "Created session is empty and won't be saved, leaving it as is"
      );
      return;
    } else if (!session.changed && !session.created && !session.rotated) {
      log.debug(
        { ...bindings, sessionId: session.id },
        "The existing session was not changed, leaving it as is"
      );
      return;
    } else if (session.skipped) {
      log.debug({ ...bindings, sessionId: session.id }, "Skipped session");
      return;
    }

    if (session.created || session.changed) {
      log.debug(
        { ...bindings, sessionId: session.id },
        `About to save a ${session.created ? "created" : "changed"} session, saving ...`
      );
      await session.save();
      log.debug(
        { ...bindings, sessionId: session.id },
        `${session.created ? "Created" : "Changed"} session successfully saved`
      );
    }
    reply.setCookie(cookieName, await session.toCookie(), session.options);
  });
};
