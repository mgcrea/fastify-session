/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { JsonObject } from "src/typings";

/**
 * This interface allows you to declare additional properties on your session object
 * using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html).
 *
 * @example
 * declare module '@mgcrea/fastify-session' {
 *     interface SessionData {
 *         views: number;
 *     }
 * }
 *
 */
export interface SessionData extends JsonObject {
  id?: string; // required for stateless sessions
}
