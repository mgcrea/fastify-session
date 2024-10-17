import { SODIUM_AUTH, SODIUM_SECRETBOX } from "@mgcrea/fastify-session-sodium-crypto";
import benchmark, { Suite } from "benchmark";
import { HMAC } from "src";
import { hmacFixture, secretKey, sodiumAuthFixture, sodiumSecretboxFixture } from "test/fixtures";

new benchmark.Suite()
  .add("SODIUM_SECRETBOX#unsealJson", function () {
    SODIUM_SECRETBOX.unsealMessage(sodiumSecretboxFixture, [secretKey]);
  })
  .add("SODIUM_AUTH#unsealJson", function () {
    SODIUM_AUTH.unsealMessage(sodiumAuthFixture, [secretKey]);
  })
  .add("HMAC#unsealJson", function () {
    HMAC.unsealMessage(hmacFixture, [secretKey]);
  })
  // add listeners
  .on("cycle", function (event: Event) {
    console.log(String(event.target));
  })
  .on("complete", function (this: Suite) {
    const fastest = this.filter("fastest").map("name");
    console.log(`Fastest is ${fastest[0]}`);
  })
  // run async
  .run({ async: true });
