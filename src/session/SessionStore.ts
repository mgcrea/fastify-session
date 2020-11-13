import { SessionData } from '..';

export abstract class SessionStore {
  /**
   * Gets the session from the store given a session ID and passes it to `callback`.
   *
   * The `session` argument should be a `SessionData` object if found, otherwise `null` or `undefined` if the session was not found and there was no error.
   * A special case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.
   */
  abstract async get(sid: string): Promise<[SessionData, number | null] | null>;

  /** Upsert a session in the store given a session ID and `SessionData` */
  abstract async set(sid: string, session: SessionData, expiry?: number | null): Promise<void>;

  /** Destroys the session with the given session ID. */
  abstract async destroy(sid: string): Promise<void>;

  /** Returns all sessions in the store */
  async all?(): Promise<SessionData[] | { [sid: string]: SessionData } | null>;

  /** Returns the amount of sessions in the store. */
  async length?(): Promise<number>;

  /** Delete all sessions from the store. */
  async clear?(): Promise<void>;

  /** "Touches" a given session, resetting the idle timer. */
  async touch?(sid: string, session: SessionData): Promise<void>;
}
