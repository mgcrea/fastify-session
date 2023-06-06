import { HMAC } from "src/crypto";
import { CRYPTO_SPLIT_CHAR } from "src/utils/crypto";
import { hmacFixture, secretKey } from "test/fixtures";
import { describe, expect, it } from "vitest";

describe("SodiumAuth", () => {
  it("should properly sign a message", async () => {
    const message = Buffer.from(JSON.stringify({ hello: "world" }));
    const signed = HMAC.sealMessage(message, secretKey);
    expect(signed).toBeDefined();
    expect(typeof signed).toBe("string");
    expect(signed.length).toBe(68);
    expect(signed.split(CRYPTO_SPLIT_CHAR).length).toBe(2);
  });

  it("should properly verify a signed message", async () => {
    const result = HMAC.unsealMessage(hmacFixture, [secretKey]);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(Object.keys(result)).toEqual(["buffer", "rotated"]);
    expect(Buffer.isBuffer(result.buffer)).toBeTruthy();
    expect(result.buffer.toString("utf8")).toEqual(JSON.stringify({ hello: "world" }));
    expect(result.rotated).toBeFalsy();
  });
});
