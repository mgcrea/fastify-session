import { Session } from '../session';

declare module 'fastify' {
  interface FastifyInstance {
    destroySession: () => Promise<void>;
  }
  interface FastifyRequest {
    session: Session;
  }
}
