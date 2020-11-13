import fastifyPlugin from 'fastify-plugin';
import { plugin } from './plugin';

export { FastifySessionOptions } from './plugin';
export { MemoryStore, Session, SessionData, SessionStore } from './session';

export default fastifyPlugin(plugin, {
  fastify: '3.x',
  name: 'fastify-session',
});
