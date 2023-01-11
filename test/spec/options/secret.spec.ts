import { DEFAULT_COOKIE_NAME } from "src/plugin";
import { generateSalt } from "src/utils";
import { buildFastify } from "test/fixtures";
import { afterAll, describe, expect, it } from "vitest";

describe("secret option", () => {
  describe("without salt", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = new Map<string, any>([["payload", { foo: "bar" }]]);
    const fastify = buildFastify({
      session: { secret: "a secret with minimum length of 32 characters" },
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
      expect(response.statusCode).toEqual(200);
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
      expect(response.statusCode).toEqual(200);
      expect(Object.keys(response.headers)).not.toContain("set-cookie");
      expect(response.payload).toEqual(JSON.stringify(context.get("payload")));
    });
  });

  describe("with salt as a base64 string", () => {
    const context = new Map<string, any>([["payload", { foo: "bar" }]]);
    const fastify = buildFastify({
      session: {
        secret: "a secret with minimum length of 32 characters",
        salt: generateSalt().toString("base64"),
      },
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
      expect(response.statusCode).toEqual(200);
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
      expect(response.statusCode).toEqual(200);
      expect(Object.keys(response.headers)).not.toContain("set-cookie");
      expect(response.payload).toEqual(JSON.stringify(context.get("payload")));
    });
  });
});
