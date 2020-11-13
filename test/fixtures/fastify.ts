import createFastify, { FastifyInstance, FastifyLoggerOptions, FastifyServerOptions } from 'fastify';
import fastifyCookie from 'fastify-cookie';
import fastifySession, { FastifySessionOptions } from 'src/index';
import 'src/typings/fastify';

type BuilfFastifyOptions = FastifyServerOptions & { session?: FastifySessionOptions };

const logger: FastifyLoggerOptions = {
  level: 'debug',
  prettyPrint: {
    colorize: true,
    ignore: 'pid,hostname',
    translateTime: 'yyyy-mm-dd HH:MM:ss.l',
    levelFirst: true,
  },
};

export const buildFastify = (options: BuilfFastifyOptions = {}): FastifyInstance => {
  const { session: sessionOptions, ...fastifyOptions } = options;
  const fastify = createFastify({ logger, ...fastifyOptions });

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, sessionOptions);

  fastify.post('/', (request, reply) => {
    request.session.set('data', request.body);
    reply.send('hello world');
  });
  fastify.post('/auth', (request, reply) => {
    request.session.set('data', request.body);
    reply.send('hello world');
  });
  const schema = {
    body: {
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      required: ['foo'],
    },
  };
  fastify.post('/schema', { schema }, (request, reply) => {
    request.session.set('data', request.body);
    reply.send('hello world');
  });
  fastify.get('/', (request, reply) => {
    const data = request.session.get('data');
    if (!data) {
      reply.code(404).send();
      return;
    }
    reply.send(data);
  });

  return fastify;
};
