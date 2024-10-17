/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { Session } from "../session";

declare module "fastify" {
  interface FastifyRequest {
    session: Session;
    destroySession: () => Promise<void>;
  }
}
