import { DEFAULT_COOKIE_NAME } from "src/plugin";
import { MEMORY_STORE } from "src/store";
import { buildFastify, getRandomKey, waitFor } from "test/fixtures";
import { afterAll, describe, expect, it } from "vitest";

describe("store option", () => {
  describe("with a MemoryStore", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = new Map<string, any>([
      ["payload", { foo: "bar" }],
      ["update", { foo: "baz" }],
    ]);
    const fastify = buildFastify({
      session: { store: MEMORY_STORE, key: getRandomKey(), cookie: { maxAge: 60 } },
    });
    afterAll(() => {
      fastify.close();
    });
    it("should receive a cookie", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/",
        payload: context.get("payload"),
      });
      expect(response.statusCode).toBe(200);
      expect(Object.keys(response.headers)).toContain("set-cookie");
      expect(response.headers["set-cookie"]).toBeTruthy();
      // @ts-expect-error LightMyRequest.Response.cookies
      expect(response.cookies[0].name).toEqual(DEFAULT_COOKIE_NAME);
      context.set("cookie", response.headers["set-cookie"]);
    });
    it("should properly match an existing session", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/",
        headers: {
          cookie: context.get("cookie"),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(Object.keys(response.headers)).not.toContain("set-cookie");
      expect(response.payload).toEqual(JSON.stringify(context.get("payload")));
    });
    it("should properly update an existing session", async () => {
      const response = await fastify.inject({
        method: "POST",
        url: "/update",
        headers: {
          cookie: context.get("cookie"),
        },
        payload: context.get("update"),
      });
      expect(response.statusCode).toBe(200);
      expect(Object.keys(response.headers)).toContain("set-cookie");
      expect(response.headers["set-cookie"]).toBeTruthy();
      // @ts-expect-error LightMyRequest.Response.cookies
      expect(response.cookies[0].name).toEqual(DEFAULT_COOKIE_NAME);
      context.set("cookie", response.headers["set-cookie"]);
    });
    it("should properly match an updated session", async () => {
      const response = await fastify.inject({
        method: "GET",
        url: "/raw",
        headers: {
          cookie: context.get("cookie"),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(Object.keys(response.headers)).not.toContain("set-cookie");
      expect(response.payload).toEqual(
        JSON.stringify({ data: context.get("payload"), update: context.get("update") }),
      );
    });
    it("should properly touch an existing session", async () => {
      const beforeResponse = await fastify.inject({
        method: "GET",
        url: "/session",
        headers: {
          cookie: context.get("cookie"),
        },
        payload: context.get("update"),
      });
      const beforeResponseBody = JSON.parse(beforeResponse.body);
      await waitFor(500);
      const response = await fastify.inject({
        method: "POST",
        url: "/touch",
        headers: {
          cookie: context.get("cookie"),
        },
        payload: context.get("update"),
      });
      expect(response.statusCode).toBe(200);
      const afterResponse = await fastify.inject({
        method: "GET",
        url: "/session",
        headers: {
          cookie: context.get("cookie"),
        },
        payload: context.get("update"),
      });
      const afterResponseBody = JSON.parse(afterResponse.body);
      expect(afterResponseBody.expiry - beforeResponseBody.expiry).toBeGreaterThan(500);
    });
  });
});
