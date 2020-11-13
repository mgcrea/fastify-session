import { EventEmitter } from 'events';
import { SessionData } from '..';

export abstract class SessionStore extends EventEmitter {
  /**
   * Gets the session from the store given a session ID and passes it to `callback`.
   *
   * The `session` argument should be a `SessionData` object if found, otherwise `null` or `undefined` if the session was not found and there was no error.
   * A special case is made when `error.code === 'ENOENT'` to act like `callback(null, null)`.
   */
  abstract get(sid: string, callback: (err: any, session?: SessionData | null) => void): void;

  /** Upsert a session in the store given a session ID and `SessionData` */
  abstract set(sid: string, session: SessionData, callback?: (err?: any) => void): void;

  /** Destroys the dession with the given session ID. */
  abstract destroy(sid: string, callback?: (err?: any) => void): void;

  /** Returns all sessions in the store */
  all?(callback: (err: any, obj?: SessionData[] | { [sid: string]: SessionData } | null) => void): void;

  /** Returns the amount of sessions in the store. */
  length?(callback: (err: any, length: number) => void): void;

  /** Delete all sessions from the store. */
  clear?(callback?: (err?: any) => void): void;

  /** "Touches" a given session, resetting the idle timer. */
  touch?(sid: string, session: SessionData, callback?: () => void): void;
}
