import type { CookieSerializeOptions } from "@fastify/cookie";
import { nanoid } from "nanoid";
import assert from "node:assert";
import { HMAC } from "../crypto/Hmac";
import type { SessionCrypto } from "../crypto/SessionCrypto";
import { MEMORY_STORE, SessionStore } from "../store";
import { createError } from "../utils";
import type { SessionData } from "./SessionData";

export const kSessionData = Symbol("kSessionData");
export const kCookieOptions = Symbol("kCookieOptions");

export type SessionConfiguration = {
  cookieOptions?: CookieSerializeOptions;
  crypto?: SessionCrypto;
  store?: SessionStore | undefined;
  secretKeys: Buffer[];
};

export type SessionOptions = CookieSerializeOptions & {
  id?: string;
};

/**
 * The Session class is responsible for managing user session data.
 * It can operate in a stateful or stateless mode depending on the configuration.
 */
export class Session<T extends SessionData = SessionData> {
  // Session metadata
  public readonly id: string;
  public created = false;
  public rotated = false;
  public changed = false;
  public deleted = false;
  public saved = false;
  public skipped = false;

  // Private instance fields
  #sessionData: Partial<T>;
  #cookieOptions: CookieSerializeOptions;
  #expiry: number | null = null; // expiration timestamp in ms

  // Private static fields
  static #secretKeys: Buffer[];
  static #sessionCrypto: SessionCrypto;
  static #sessionStore?: SessionStore;
  static #globalCookieOptions: CookieSerializeOptions;
  static #configured = false;

  /**
   * This method is used to setup the Session class with global options.
   */
  static configure({
    secretKeys,
    crypto = HMAC,
    store = MEMORY_STORE,
    cookieOptions = {},
  }: SessionConfiguration): void {
    Session.#secretKeys = secretKeys;
    Session.#sessionCrypto = crypto;
    Session.#sessionStore = store;
    Session.#globalCookieOptions = cookieOptions;
    Session.#configured = true;
  }

  /**
   * Private constructor - instances should be created via the static `create` method
   */
  private constructor(data?: Partial<T>, options: SessionOptions = {}) {
    const { id = nanoid(), ...cookieOptions } = options;
    this.#sessionData = data || {};
    this.#cookieOptions = { ...Session.#globalCookieOptions, ...cookieOptions };
    this.id = id;
    this.created = !data;
  }

  /**
   * Create a new session instance.
   * Checks if the class is configured before creating a session.
   */
  static async create<T extends SessionData = SessionData>(
    data?: Partial<T>,
    options: SessionOptions = {},
  ): Promise<Session> {
    if (!Session.#configured) {
      throw createError(
        "MissingConfiguration",
        "Session is not configured. Please call Session.configure before creating a Session instance.",
      );
    }
    const session = new Session(data, options);
    await session.touch();
    return session;
  }

  /**
   * Decoding
   */

  /**
   * Create a Session from a serialized cookie.
   * Determines the type of the session (stateful/stateless) and delegates to the appropriate method.
   */
  static async fromCookie(cookie: string): Promise<Session> {
    const { buffer: cleartext, rotated } = Session.#sessionCrypto.unsealMessage(cookie, Session.#secretKeys);

    if (Session.#sessionCrypto.stateless) {
      return await Session.fromStatelessCookie(cleartext.toString(), rotated);
    }
    return await Session.fromStatefulCookie(cleartext.toString(), rotated);
  }

  /**
   * Create a Session from a stateless cookie. The session data is all stored in the cookie.
   */
  private static async fromStatelessCookie(payload: string, rotated: boolean): Promise<Session> {
    let data;
    try {
      data = JSON.parse(payload);
    } catch (error) {
      throw createError(
        "InvalidData",
        "Failed to parse session data from cookie. Original error: ${error.message}",
      );
    }
    const session = await Session.create(data, { id: data.id });
    session.rotated = rotated;
    return session;
  }

  /**
   * Create a Session from a stateful cookie. The cookie only contains the session id.
   * The rest of the session data is retrieved from the session store.
   */
  private static async fromStatefulCookie(sessionId: string, rotated: boolean): Promise<Session> {
    assert(Session.#sessionStore);
    const result = await Session.#sessionStore.get(sessionId);
    if (!result) {
      throw createError("SessionNotFound", "did not found a matching session in the store");
    }
    const [data, expiry] = result;
    if (expiry && expiry <= Date.now()) {
      throw createError("ExpiredSession", "the store returned an expired session");
    }
    const session = await Session.create(data, {
      id: sessionId,
      expires: expiry ? new Date(expiry) : undefined,
    });
    session.rotated = rotated;
    return session;
  }

  /**
   * Encoding
   */

  /**
   * Serialize the Session into a cookie.
   * The format of the cookie depends on whether the session is stateful or stateless.
   */
  async toCookie(): Promise<string> {
    const buffer = Buffer.from(
      Session.#sessionCrypto.stateless ? JSON.stringify({ ...this.#sessionData, id: this.id }) : this.id,
    );
    if (!Session.#secretKeys[0]) {
      throw createError("MissingSecretKey", "Missing secret key for session encryption");
    }
    return Session.#sessionCrypto.sealMessage(buffer, Session.#secretKeys[0]);
  }

  /**
   * Refresh the expiration time of the session. Only applicable for stateful sessions.
   */
  async touch(): Promise<void> {
    if (Session.#sessionCrypto.stateless) {
      return;
    }
    const { maxAge = Session.#globalCookieOptions.maxAge, expires = Session.#globalCookieOptions.expires } =
      this.#cookieOptions;
    if (maxAge) {
      const expiry = Date.now() + maxAge * 1000;
      // Get the longest lifespan between "expires" and "maxAge"
      this.#expiry = expires ? Math.max(expires.getTime(), expiry) : expiry;
    } else if (expires) {
      this.#expiry = expires.getTime();
    }
    assert(Session.#sessionStore);
    // Only relay touch to the store for existing sessions to propagate expiry changes
    if (!this.created && Session.#sessionStore.touch) {
      await Session.#sessionStore.touch(this.id, this.#expiry);
    }
  }

  /**
   * Delete the session.
   */
  async destroy(): Promise<void> {
    this.deleted = true;
    if (Session.#sessionCrypto.stateless) {
      return;
    }
    // Only relay destroy to the store for existing sessions that have not been saved
    if (this.created && !this.saved) {
      return;
    }
    assert(Session.#sessionStore);
    await Session.#sessionStore.destroy(this.id);
  }

  /**
   * Save the session data to the session store. Only applicable for stateful sessions.
   */
  async save(): Promise<void> {
    if (Session.#sessionCrypto.stateless) {
      return;
    }
    this.saved = true;
    // Save session to store with store-handled expiry
    assert(Session.#sessionStore);
    await Session.#sessionStore.set(this.id, this.#sessionData, this.#expiry);
  }

  get data(): SessionData {
    return this.#sessionData;
  }

  get expiry(): number | null {
    return this.#expiry;
  }

  /**
   * Get a value from the session data.
   */
  get<K extends keyof T = keyof T>(key: K): T[K] | undefined {
    return this.#sessionData[key];
  }

  set<K extends keyof T = keyof T>(key: K, value: T[K]): void {
    this.#sessionData[key] = value;
    this.changed = true;
  }

  get options(): CookieSerializeOptions {
    return this.#cookieOptions;
  }

  /**
   * Update the session cookie options.
   */
  setOptions(options: CookieSerializeOptions): void {
    Object.assign(this.#cookieOptions, options);
  }

  /**
   * Check if the session data is empty.
   */
  isEmpty(): boolean {
    return Object.keys(this.#sessionData).length === 0;
  }
}
