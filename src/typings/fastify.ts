import type { Session } from "../session";

declare module "fastify" {
  interface FastifyRequest {
    session: Session;
    destroySession: () => Promise<void>;
  }
}

declare module "http" {
  interface IncomingMessage {
    session: Session;
  }
}
