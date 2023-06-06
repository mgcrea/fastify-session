import fastifyPlugin from "fastify-plugin";
import { plugin } from "./plugin";

export { HMAC, Hmac, SessionCrypto, type SecretKey } from "./crypto";
export type { FastifySessionOptions } from "./plugin";
export { Session, type SessionData } from "./session";
export { MemoryStore, SessionStore } from "./store";
export { CRYPTO_SPLIT_CHAR, ErrorWithCode, createError } from "./utils";

export default fastifyPlugin(plugin, {
  fastify: "4.x",
  name: "fastify-session",
});
