/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { CookieSerializeOptions } from 'fastify-cookie';
import { nanoid } from 'nanoid';
import { HMAC } from '../crypto/Hmac';
import { SessionCrypto } from '../crypto/SessionCrypto';
import { MEMORY_STORE, SessionStore } from '../store';
import { createError } from '../utils';
import { SessionData } from './SessionData';

export const kSessionData = Symbol('kSessionData');
export const kCookieOptions = Symbol('kCookieOptions');
export const kExpiry = Symbol('kExpiry');
export const kSecretKeys = Symbol('kSecretKeys');
export const kSessionStore = Symbol('kSessionStore');
export const kSessionCrypto = Symbol('kSessionCrypto');
export const kOtherOptions = Symbol('kOtherOptions');

export type SessionConfiguration = {
  cookieOptions?: CookieSerializeOptions;
  crypto?: SessionCrypto;
  store?: SessionStore;
  secretKeys: Buffer[];
};

export type SessionOptions = CookieSerializeOptions & {
  id?: string;
};

export class Session<T extends SessionData = SessionData> {
  public readonly id: string;
  public created = false;
  public rotated = false;
  public changed = false;
  public deleted = false;
  public skipped = false;

  private [kSessionData]: Partial<T>;
  private [kCookieOptions]: CookieSerializeOptions;
  private [kExpiry]: number | null; // expiration timestamp in ms
  private static [kSecretKeys]: Buffer[];
  private static [kSessionCrypto]: SessionCrypto;
  private static [kSessionStore]?: SessionStore;
  private static [kCookieOptions]: CookieSerializeOptions;

  static configure({
    secretKeys,
    crypto = HMAC,
    store = MEMORY_STORE,
    cookieOptions = {},
  }: SessionConfiguration): void {
    Session[kSecretKeys] = secretKeys;
    Session[kSessionCrypto] = crypto;
    Session[kSessionStore] = store;
    Session[kCookieOptions] = cookieOptions;
  }

  constructor(data?: Partial<T>, options: SessionOptions = {}) {
    const { id = nanoid(), ...cookieOptions } = options;
    this[kSessionData] = data || {};
    this[kCookieOptions] = { ...Session[kCookieOptions], ...cookieOptions };
    this.id = id;
    this.created = !data;
    this.touch();
  }

  // Decoding
  static async fromCookie(cookie: string): Promise<Session> {
    const { buffer: cleartext, rotated } = Session[kSessionCrypto].unsealMessage(cookie, Session[kSecretKeys]);

    // Stateless sessions have the whole session data encrypted as the cookie
    if (Session[kSessionCrypto].stateless) {
      const session = new Session(JSON.parse(cleartext.toString()));
      session.rotated = rotated;
      return session;
    }

    // Stateful sessions have ids signed as the cookie
    const sessionId = cleartext.toString();
    const result = await Session[kSessionStore]!.get(sessionId);
    if (!result) {
      throw createError('SessionNotFound', 'did not found a matching session in the store');
    }
    const [data, expiry] = result;
    if (expiry && expiry <= Date.now()) {
      throw createError('ExpiredSession', 'the store returned an expired session');
    }
    const session = new Session(data, { id: sessionId, expires: expiry ? new Date(expiry) : undefined });
    session.rotated = rotated;
    return session;
  }

  // Encoding
  async toCookie(): Promise<string> {
    const buffer = Buffer.from(
      Session[kSessionCrypto].stateless ? JSON.stringify({ ...this[kSessionData], id: this.id }) : this.id
    );
    return Session[kSessionCrypto].sealMessage(buffer, Session[kSecretKeys][0]);
  }

  async touch(): Promise<void> {
    if (Session[kSessionCrypto].stateless) {
      return;
    }
    const { maxAge = Session[kCookieOptions].maxAge, expires = Session[kCookieOptions].expires } = this[kCookieOptions];
    if (maxAge) {
      const expiry = Date.now() + maxAge * 1000;
      // Get the longest lifespan between "expires" and "maxAge"
      this[kExpiry] = expires ? Math.max(expires.getTime(), expiry) : expiry;
    } else if (expires) {
      this[kExpiry] = expires.getTime();
    }
    if (!this.created && Session[kSessionStore]!.touch) {
      await Session[kSessionStore]!.touch!(this.id, this[kExpiry]);
    }
  }

  async destroy(): Promise<void> {
    this.delete();
    if (Session[kSessionCrypto].stateless) {
      return;
    }
    await Session[kSessionStore]!.destroy(this.id);
  }

  async save(): Promise<void> {
    if (Session[kSessionCrypto].stateless) {
      return;
    }
    // Save session to store with store-handled expiry
    await Session[kSessionStore]!.set(this.id, this[kSessionData], this[kExpiry]);
  }

  get data(): SessionData {
    return this[kSessionData];
  }

  get expiry(): number | null {
    return this[kExpiry];
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

  get options(): CookieSerializeOptions {
    return this[kCookieOptions];
  }

  setOptions(options: CookieSerializeOptions): void {
    Object.assign(this[kCookieOptions], options);
  }
}
