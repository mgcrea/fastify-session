import { FastifySessionOptions } from 'src/plugin';
import { Session } from '../session';

declare module 'fastify' {
  interface FastifyRequest {
    destroySession: () => Promise<void>;
    session: Session;
    sessionStore: FastifySessionOptions['store'];
  }
}
