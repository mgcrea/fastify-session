import type { SessionData } from "../session/SessionData";
export type { SessionData };

export abstract class SessionStore {
  // Gets the session from the store given a session ID.
  abstract get(sid: string): Promise<[SessionData, number | null] | null>;

  // Upsert a session in the store given a session ID and `SessionData`.
  abstract set(sid: string, session: SessionData, expiry?: number | null): Promise<void>;

  // Destroys the session with the given session ID.
  abstract destroy(sid: string): Promise<void>;

  // Returns all sessions in the store
  async all?(): Promise<SessionData[] | Record<string, SessionData> | null>;

  // Returns the amount of sessions in the store.
  async length?(): Promise<number>;

  // Delete all sessions from the store.
  async clear?(): Promise<void>;

  // "Touches" a given session, resetting the idle timer.
  async touch?(sid: string, expiry?: number | null): Promise<void>;
}
