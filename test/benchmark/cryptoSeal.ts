import { SODIUM_AUTH, SODIUM_SECRETBOX } from "@mgcrea/fastify-session-sodium-crypto";
import benchmark, { Suite } from "benchmark";
import { HMAC } from "src";
import { secretKey } from "test/fixtures";

const jsonMessage = Buffer.from(JSON.stringify({ hello: "world" }));

new benchmark.Suite()
  .add("SODIUM_SECRETBOX#sealJson", function () {
    SODIUM_SECRETBOX.sealMessage(jsonMessage, secretKey);
  })
  .add("SODIUM_AUTH#sealJson", function () {
    SODIUM_AUTH.sealMessage(jsonMessage, secretKey);
  })
  .add("HMAC#sealJson", function () {
    HMAC.sealMessage(jsonMessage, secretKey);
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
