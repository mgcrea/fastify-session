import { buildFastify, getRandomKey } from "test/fixtures";
import { afterAll, describe, expect, it } from "vitest";

describe("with malformed-cookie reply", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = new Map<string, any>([["payload", { foo: "bar" }]]);
  const fastify = buildFastify({
    session: { cookieName: "foobar", key: getRandomKey() },
  });
  afterAll(async () => {
    await fastify.close();
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
    expect(response.cookies[0].name).toBe("foobar");
    context.set("cookie", response.cookies[0]);
  });
  it("should properly fail with a malformed cookie", async () => {
    const cookie = context.get("cookie");
    const response = await fastify.inject({
      method: "GET",
      url: "/",
      headers: {
        cookie: "session=",
      },
    });
    expect(response.statusCode).toBe(404);
    expect(Object.keys(response.headers)).toContain("set-cookie");
    expect(response.cookies[0]).not.toEqual(cookie);
  });
  it("should properly fail with a malformed nonce", async () => {
    const cookie = context.get("cookie");
    const response = await fastify.inject({
      method: "GET",
      url: "/",
      headers: {
        [cookie.name]: `${cookie.value}${"a".repeat(10)}`,
      },
    });
    expect(response.statusCode).toBe(404);
    expect(Object.keys(response.headers)).toContain("set-cookie");
    expect(response.cookies[0]).not.toEqual(cookie);
  });
});
