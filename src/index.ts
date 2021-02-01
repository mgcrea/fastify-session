import fastifyPlugin from 'fastify-plugin';
import { plugin } from './plugin';

export { FastifySessionOptions } from './plugin';
export { Session, SessionData } from './session';
export { MemoryStore, SessionStore } from './store';

export default fastifyPlugin(plugin, {
  fastify: '3.x',
  name: 'fastify-session',
});
