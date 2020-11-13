/* eslint-disable @typescript-eslint/no-non-null-assertion */
import assert from 'assert';
import type { CookieSerializeOptions } from 'fastify-cookie';
import { nanoid } from 'nanoid';
import { createError, decryptMessage, encryptMessage, signMessage, verifyMessage } from '../utils';
import { SessionData } from './SessionData';
import { SessionStore } from './SessionStore';

export const kSessionData = Symbol('kSessionData');
export const kCookieOptions = Symbol('kCookieOptions');
export const kExpiry = Symbol('kExpiry');
export const kSecretKeys = Symbol('kSecretKeys');
export const kSessionStore = Symbol('kSessionStore');

export type SessionOptions = { cookieOptions?: CookieSerializeOptions; store?: SessionStore; secretKeys: Buffer[] };

export class Session<T extends SessionData = SessionData> {
  readonly id: string;
  rotated = false;
  changed = false;
  deleted = false;

  [kSessionData]: Partial<T>;
  [kCookieOptions]: CookieSerializeOptions;
  [kExpiry]: number | null;
  static [kSecretKeys]: Buffer[];
  static [kSessionStore]?: SessionStore;
  static [kCookieOptions]: CookieSerializeOptions;

  static configure({ secretKeys, store, cookieOptions = {} }: SessionOptions): void {
    Session[kSecretKeys] = secretKeys;
    Session[kSessionStore] = store;
    Session[kCookieOptions] = cookieOptions;
  }

  constructor(data: Partial<T> = {}, options: CookieSerializeOptions = {}) {
    this[kSessionData] = data;
    this[kCookieOptions] = options;
    this.id = Session[kSessionStore] ? nanoid() : '';
    this.touch();
  }

  // Decoding
  static async fromCookie(cookie: string): Promise<Session> {
    return Session[kSessionStore] ? Session.fromStatefulCookie(cookie) : Session.fromStatelessCookie(cookie);
  }
  private static async fromStatelessCookie(cookie: string): Promise<Session> {
    // Stateless sessions have data encrypted as the cookie
    const { buffer: decryptedCookie, rotated } = decryptMessage(cookie, Session[kSecretKeys]);
    const session = new Session(JSON.parse(decryptedCookie.toString()));
    session.rotated = rotated;
    return session;
  }
  private static async fromStatefulCookie(cookie: string): Promise<Session> {
    // Stateful sessions have ids signed as the cookie
    const { buffer: verifiedId, rotated } = verifyMessage(cookie, Session[kSecretKeys]);
    const sessionId = verifiedId.toString();
    assert(Session[kSessionStore]);

    const result = await Session[kSessionStore]!.get(sessionId);
    if (!result) {
      throw createError('SessionNotFound', 'did not found a matching session in the store');
    }
    const [data, expiry] = result;
    if (expiry && expiry > Date.now()) {
      throw createError('ExpiredSession', 'the store returned an expired session');
    }
    const session = new Session(data, { expires: expiry ? new Date(expiry) : undefined });
    session.rotated = rotated;
    return session;
  }

  // Encoding
  async toCookie(): Promise<string> {
    return Session[kSessionStore] ? this.toStatefulCookie() : this.toStatelessCookie();
  }
  private async toStatelessCookie(): Promise<string> {
    // Stateless sessions have data encrypted as the cookie
    return encryptMessage(Buffer.from(JSON.stringify(this[kSessionData])), Session[kSecretKeys][0]);
  }
  private async toStatefulCookie(): Promise<string> {
    // Stateful sessions have ids signed as the cookie
    return signMessage(Buffer.from(this.id), Session[kSecretKeys][0]);
  }

  async touch(): Promise<void> {
    if (!Session[kSessionStore]) {
      return;
    }
    const { maxAge, expires } = this[kCookieOptions];
    if (maxAge) {
      const expiry = Date.now() + maxAge;
      // Get the shortest lifespan between "expires" and "maxAge"
      this[kExpiry] = expires ? Math.min(expires.getTime(), expiry) : expiry;
      return;
    }
    if (expires) {
      this[kExpiry] = expires.getTime();
      return;
    }
  }

  async destroy(): Promise<void> {
    this.delete();
    if (!Session[kSessionStore]) {
      return;
    }
    await Session[kSessionStore]!.destroy(this.id);
  }

  async save(): Promise<void> {
    if (!Session[kSessionStore]) {
      return;
    }
    // Save session to store with store-handled expiry
    await Session[kSessionStore]!.set(this.id, this[kSessionData], this[kExpiry]);
  }

  get data(): SessionData {
    return this[kSessionData];
  }

  // Lifecycle
  get<K extends keyof T = keyof T>(key: K): T[K] | undefined {
    return this[kSessionData][key];
  }

  set<K extends keyof T = keyof T>(key: K, value: T[K]): void {
    this.changed = true;
    this[kSessionData][key] = value;
  }

  delete(): void {
    this.changed = true;
    this.deleted = true;
  }

  options(options: CookieSerializeOptions): void {
    Object.assign(this[kCookieOptions], options);
  }
}
