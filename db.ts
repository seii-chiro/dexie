// db.ts
import { Dexie, type EntityTable } from "dexie";

export interface Friend {
  id: string;
  name: string;
  age: number;
  updatedAt?: number;
  deletedAt?: number | null;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string; // Server URL after upload
  localPath?: string; // For accessing local blob
  uploadStatus: "pending" | "uploading" | "uploaded" | "failed";
  friendId?: string; // Optional: link to a friend
  updatedAt: number;
  deletedAt?: number | null;
}

export type OutboxOp = "upsert" | "delete";

export interface OutboxItem {
  changeId: string; // unique id for this change (uuid)
  table: "friends";
  primary_key: string; // Friend.id
  op: OutboxOp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any; // the row snapshot (or patch)
  ts: number; // when change happened
  attempts: number; // retry counter
  lastError?: string;
}

export interface SyncState {
  key: string; // one row per synced collection
  lastSeq: number; // last server cursor applied
}

const db = new Dexie("FriendsDatabase") as Dexie & {
  friends: EntityTable<Friend, "id">; // primary key "id" (for the typings only)
  attachments: EntityTable<Attachment, "id">;
  outbox: EntityTable<OutboxItem, "changeId">;
  syncState: EntityTable<SyncState, "key">;
};

// Schema declaration:
db.version(1).stores({
  friends: "id, name, age, updatedAt",
  attachments: "id, filename, mimeType, uploadStatus, updatedAt, friendId",
  outbox: "changeId, table, primary_key, op, ts, attempts",
  syncState: "key",
});

// Example usage:
// const byFriend = await db.attachments.where('friendId').equals(someFriendId).toArray();
// If you need `friendId` to be unique, prefix it with `&friendId` in the schema.

export { db };
