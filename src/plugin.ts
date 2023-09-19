import type { CookieSerializeOptions } from "@fastify/cookie";
import { parse } from "cookie";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { IncomingMessage } from "http";
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

export type cookie = {
  name: string;
  value: string;
  options: CookieSerializeOptions;
};

export const plugin: FastifyPluginAsync<FastifySessionOptions> = async (
  fastify,
  options = {},
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

  // Allow sessions to be loaded to a request with cookies
  fastify.decorate("loadSession", async (request: FastifyRequest | IncomingMessage) => {
    let cookies: FastifyRequest["cookies"];
    let log: FastifyRequest["log"];
    if (request instanceof IncomingMessage) {
      if (request.headers.cookie === undefined) return;

      log = fastify.log;
      cookies = parse(request.headers.cookie);
    } else {
      cookies = request.cookies;
      log = request.log;
    }

    await decodeRequestCookie(request, cookies, log);
  });

  // Save a session to a cookie to manually set headers
  fastify.decorate(
    "encodeSession",
    async (request: FastifyRequest | IncomingMessage): Promise<cookie | undefined> => {
      let log = fastify.log;
      if (!(request instanceof IncomingMessage)) {
        log = request.log;
      }

      return await encodeSession(request, log);
    },
  );

  // decode/create a session for every request
  fastify.addHook("onRequest", async (request) => {
    await decodeRequestCookie(request, request.cookies, request.log);
  });

  // encode a cookie
  fastify.addHook("onSend", async (request, reply) => {
    const cookie = await encodeSession(request, request.log);
    if (cookie === undefined) return;

    reply.setCookie(cookie.name, cookie.value, cookie.options);
  });

  async function decodeRequestCookie(
    request: FastifyRequest | IncomingMessage,
    cookies: FastifyRequest["cookies"],
    log: FastifyRequest["log"],
  ) {
    const bindings = { ...logBindings, hook: "onRequest" };

    const cookie = cookies[cookieName];
    if (!cookie) {
      request.session = await Session.create();
      log.debug(
        { ...bindings, sessionId: request.session.id },
        "There was no cookie, created an empty session",
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
        `Failed to decode existing cookie, created an empty session`,
      );
      return;
    }
  }

  async function encodeSession(
    request: FastifyRequest | IncomingMessage,
    log: FastifyRequest["log"],
  ): Promise<cookie | undefined> {
    const { session } = request;
    const bindings = { ...logBindings, hook: "onSend" };

    if (!session) {
      log.debug(bindings, "There was no session, leaving it as is");
      return;
    } else if (session.deleted) {
      log.debug(
        { ...bindings, sessionId: session.id },
        `Deleted ${session.created ? "newly created" : "existing"} session`,
      );

      return {
        name: cookieName,
        value: "",
        options: {
          ...session.options,
          expires: new Date(0),
          maxAge: 0,
        },
      };
    } else if (!saveUninitialized && session.isEmpty()) {
      log.debug(
        { ...bindings, sessionId: session.id },
        "Created session is empty and won't be saved, leaving it as is",
      );
      return;
    } else if (!session.changed && !session.created && !session.rotated) {
      log.debug(
        { ...bindings, sessionId: session.id },
        "The existing session was not changed, leaving it as is",
      );
      return;
    } else if (session.skipped) {
      log.debug({ ...bindings, sessionId: session.id }, "Skipped session");
      return;
    }

    if (session.created || session.changed) {
      log.debug(
        { ...bindings, sessionId: session.id },
        `About to save a ${session.created ? "created" : "changed"} session, saving ...`,
      );
      await session.save();
      log.debug(
        { ...bindings, sessionId: session.id },
        `${session.created ? "Created" : "Changed"} session successfully saved`,
      );
    }
    return {
      name: cookieName,
      value: await session.toCookie(),
      options: session.options,
    };
  }
};
