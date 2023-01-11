import fastifyPlugin from "fastify-plugin";
import { plugin } from "./plugin";

export { Hmac, HMAC, SessionCrypto, type SecretKey } from "./crypto";
export type { FastifySessionOptions } from "./plugin";
export { Session, type SessionData } from "./session";
export { MemoryStore, SessionStore } from "./store";
export { createError, CRYPTO_SPLIT_CHAR, ErrorWithCode } from "./utils";

export default fastifyPlugin(plugin, {
  fastify: "4.x",
  name: "fastify-session",
});
