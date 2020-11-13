import { EventEmitter } from 'events';
import { SessionData } from './SessionData';
import { SessionStore } from './SessionStore';

export type MemoryStoreOptions<T> = { store?: Map<string, T>; prefix?: string };

export class MemoryStore<T extends SessionData = SessionData> extends EventEmitter implements SessionStore {
  private store: Map<string, T>;
  private readonly prefix: string;

  constructor({ store = new Map(), prefix = 'sess:' }: MemoryStoreOptions<T> = {}) {
    super();
    this.store = store;
    this.prefix = prefix;
  }

  private getKey(sessionId: string) {
    return `${this.prefix}${sessionId}`;
  }

  set(sessionId: string, session: T, callback: (err?: Error) => void): void {
    this.store.set(this.getKey(sessionId), session);
    callback();
  }

  get(sessionId: string, callback: (err?: Error, session?: T) => void): void {
    const session = this.store.get(this.getKey(sessionId));
    callback(undefined, session);
  }

  destroy(sessionId: string, callback: (err?: Error) => void): void {
    this.store.delete(this.getKey(sessionId));
    callback();
  }
}
