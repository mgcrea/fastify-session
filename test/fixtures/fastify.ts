import fastifyCookie from "@fastify/cookie";
import createFastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import fastifySession, { type FastifySessionOptions } from "src/index";
import type { JsonObject } from "src/typings";

type BuilfFastifyOptions = FastifyServerOptions & { session?: FastifySessionOptions };

const logger: FastifyServerOptions["logger"] = {
  level: "debug",
  transport: {
    target: "@mgcrea/pino-pretty-compact",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss.l",
      ignore: "pid,hostname",
      levelFirst: true,
    },
  },
};

export const buildFastify = (options: BuilfFastifyOptions = {}): FastifyInstance => {
  const { session: sessionOptions, ...fastifyOptions } = options;
  const fastify = createFastify({ logger, ...fastifyOptions });

  fastify.register(fastifyCookie);
  fastify.register(fastifySession, sessionOptions);

  fastify.post<{ Body: JsonObject }>("/", (request, reply) => {
    request.session.set("data", request.body);
    reply.send("hello world");
  });
  fastify.post<{ Body: JsonObject }>("/auth", (request, reply) => {
    request.session.set("data", request.body);
    reply.send("hello world");
  });
  fastify.post<{ Body: JsonObject }>("/update", (request, reply) => {
    request.session.set("update", request.body);
    reply.send("hello world");
  });
  fastify.post<{ Body: JsonObject }>("/touch", async (request, reply) => {
    await request.session.touch();
    reply.send("hello world");
  });
  fastify.get("/session", (request) => {
    return { id: request.session.id, data: request.session.data, expiry: request.session.expiry };
  });
  fastify.post("/noop", () => {
    return { ok: 1 };
  });

  const schema = {
    body: {
      type: "object",
      properties: {
        foo: { type: "string" },
      },
      required: ["foo"],
    },
  };
  fastify.post<{ Body: JsonObject }>("/schema", { schema }, (request, reply) => {
    request.session.set("data", request.body);
    reply.send("hello world");
  });
  fastify.get("/", (request, reply) => {
    const data = request.session.get("data");
    if (!data) {
      reply.code(404).send();
      return;
    }
    reply.send(data);
  });
  fastify.get("/raw", (request, reply) => {
    const data = request.session.data;
    reply.send(data);
  });
  return fastify;
};

export const waitFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
