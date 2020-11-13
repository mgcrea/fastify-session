import type { CookieSerializeOptions } from 'fastify-cookie';
import { nanoid } from 'nanoid';
import { decryptMessage, encryptMessage, signMessage, verifyMessage } from '../utils';
import { SessionData } from './SessionData';
import { SessionStore } from './SessionStore';

export const kSessionData = Symbol('kSessionData');
export const kCookieOptions = Symbol('kCookieOptions');
export const kSecretKeys = Symbol('kSecretKeys');
export const kSessionStore = Symbol('kSessionStore');

export class Session<T extends SessionData = SessionData> {
  readonly id: string;
  rotated = false;
  changed = false;
  deleted = false;

  [kSessionData]: Partial<T>;
  [kCookieOptions]: CookieSerializeOptions;
  static [kSecretKeys]: Buffer[];
  static [kSessionStore]?: SessionStore;

  static configure({ secretKeys, store }: { store?: SessionStore; secretKeys: Buffer[] }): void {
    Session[kSecretKeys] = secretKeys;
    Session[kSessionStore] = store;
  }

  constructor(data: Partial<T> = {}) {
    this[kSessionData] = data;
    this.id = Session[kSessionStore] ? nanoid() : '';
  }

  // Decoding
  static async fromCookie(cookie: string): Promise<Session> {
    return Session[kSessionStore] ? Session.fromStatefulCookie(cookie) : Session.fromStatelessCookie(cookie);
  }
  private static async fromStatelessCookie(cookie: string) {
    // Stateless sessions have data encrypted as the cookie
    const { buffer: decryptedCookie, rotated } = decryptMessage(cookie, Session[kSecretKeys]);
    const session = new Session(JSON.parse(decryptedCookie.toString()));
    session.rotated = rotated;
    return session;
  }
  private static async fromStatefulCookie(cookie: string) {
    // Stateful sessions have ids encrypted as the cookie
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { buffer: verifiedCookie, rotated } = verifyMessage(cookie, Session[kSecretKeys]);
    const session = new Session();
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
    this[kCookieOptions] = options;
  }
}
