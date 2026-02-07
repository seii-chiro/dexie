import {
  db,
  type Friend,
  type Attachment,
  type RecordTag,
} from "../db";
import { setSyncing } from "./outbox-logger";
import { uploadPendingFiles } from "./file-upload";

const API = import.meta.env.VITE_API_URL;

async function pushChanges(batchSize = 100) {
  const batch = await db.outbox.orderBy("ts").limit(batchSize).toArray();
  if (batch.length === 0) return;

  const res = await fetch(`${API}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes: batch }),
  });

  if (!res.ok) throw new Error(`push failed: ${res.status}`);
  const data = await res.json();

  await db.outbox.bulkDelete(data.ackedChangeIds);
}

async function pullChanges(limit = 500) {
  const state = (await db.syncState.get("friends")) ?? {
    key: "friends",
    lastSeq: 0,
  };

  const res = await fetch(`${API}/sync/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // use lastSeq from state so we don't pull everything every time
    body: JSON.stringify({ sinceSeq: state.lastSeq, limit }),
  });

  if (!res.ok) throw new Error(`pull failed: ${res.status}`);
  const data = await res.json();

  console.debug(
    "[sync] pull received",
    data.changes?.length,
    "changes",
    "newSeq=",
    data.newSeq,
  );
  setSyncing(true);

  try {
    await db.transaction(
      "rw",
      db.friends,
      db.attachments,
      db.recordTags,
      db.syncState,
      async () => {
        for (const ch of data.changes) {
          try {
            console.debug(
              "[sync] applying change",
              ch.table,
              ch.op,
              ch.pk ?? ch.data?.id,
            );
            if (ch.table === "friends") {
              if (ch.op === "upsert") {
                const friend: Friend = {
                  id: ch.data.id,
                  name: ch.data.name,
                  age: ch.data.age,
                  record_tags: ch.data.record_tags ?? [],
                  updatedAt: ch.data.updatedAt,
                  deletedAt: ch.data.deletedAt,
                };
                await db.friends.put(friend);
                console.debug("[sync] friend upsert applied", friend.id);
              } else if (ch.op === "delete") {
                await db.friends.delete(String(ch.pk));
                console.debug("[sync] friend delete applied", ch.pk);
              }
            } else if (ch.table === "attachments") {
              if (ch.op === "upsert") {
                const attachment: Attachment = {
                  id: ch.data.id,
                  record_tags: ch.data.record_tags ?? [],
                  filename: ch.data.filename,
                  mimeType: ch.data.mimeType,
                  size: ch.data.size,
                  url: ch.data.url,
                  uploadStatus: ch.data.uploadStatus || "uploaded",
                  friendId: ch.data.friendId,
                  updatedAt: ch.data.updatedAt,
                  deletedAt: ch.data.deletedAt,
                };
                await db.attachments.put(attachment);
                console.debug(
                  "[sync] attachment upsert applied",
                  attachment.id,
                );
              } else if (ch.op === "delete") {
                await db.attachments.delete(String(ch.pk));
                console.debug("[sync] attachment delete applied", ch.pk);
              }
            } else if (ch.table === "record_tags") {
              if (ch.op === "upsert") {
                const recordTag: RecordTag = {
                  id: ch.data.id,
                  tag_name: ch.data.tag_name,
                  updatedAt: ch.data.updatedAt,
                  deletedAt: ch.data.deletedAt,
                };
                await db.recordTags.put(recordTag);
                console.debug("[sync] record tag upsert applied", recordTag.id);
              } else if (ch.op === "delete") {
                await db.recordTags.delete(String(ch.pk));
                console.debug("[sync] record tag delete applied", ch.pk);
              }
            }
          } catch (err) {
            console.error("[sync] failed applying change", ch, err);
            throw err; // abort transaction so the failure is visible
          }
        }

        await db.syncState.put({ key: "friends", lastSeq: data.newSeq });
        console.debug("[sync] transaction committed, newSeq:", data.newSeq);
      },
    );
  } catch (err) {
    console.error("[sync] transaction failed:", err);
    throw err;
  } finally {
    setSyncing(false);
  }

  return data.hasMore as boolean;
}

export async function syncOnce() {
  // Upload any pending files first
  await uploadPendingFiles();
  
  // Push until outbox drained
  while ((await db.outbox.count()) > 0) {
    await pushChanges(100);
  }

  // Pull until no more pages
  while (await pullChanges(500)) {
    // loop
  }
}
