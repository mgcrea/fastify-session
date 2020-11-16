import { EventEmitter } from 'events';
import { SessionData } from './SessionData';
import { SessionStore } from './SessionStore';

type StoredData<T> = [T, number | null]; // [session data, expiry time in ms]
export type MemoryStoreOptions<T> = { store?: Map<string, StoredData<T>>; prefix?: string };

export class MemoryStore<T extends SessionData = SessionData> extends EventEmitter implements SessionStore {
  private store: Map<string, StoredData<T>>;
  private readonly prefix: string;

  constructor({ store = new Map(), prefix = 'sess:' }: MemoryStoreOptions<T> = {}) {
    super();
    this.store = store;
    this.prefix = prefix;
  }

  private getKey(sessionId: string) {
    return `${this.prefix}${sessionId}`;
  }

  async set(sessionId: string, session: T, expiry: number | null = null): Promise<void> {
    this.store.set(this.getKey(sessionId), [session, expiry]);
  }

  async get(sessionId: string): Promise<[T, number | null] | null> {
    const result = this.store.get(this.getKey(sessionId)) ?? null;
    if (!result) {
      return null;
    }
    const [session, expiry] = result;
    if (expiry && expiry <= Date.now()) {
      return null;
    }
    return [session, expiry];
  }

  async destroy(sessionId: string): Promise<void> {
    this.store.delete(this.getKey(sessionId));
  }

  async all(): Promise<{ [sid: string]: SessionData }> {
    return [...this.store.entries()].reduce<{ [sid: string]: SessionData }>((soFar, [k, v]) => {
      soFar[k] = v[0];
      return soFar;
    }, {});
  }
}
