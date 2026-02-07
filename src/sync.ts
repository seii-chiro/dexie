import { db, type Friend, type Attachment } from "../db";
import { setSyncing } from "./outbox-logger";

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
    body: JSON.stringify({ sinceSeq: state.lastSeq, limit }),
  });

  if (!res.ok) throw new Error(`pull failed: ${res.status}`);
  const data = await res.json();

  setSyncing(true);
  try {
    await db.transaction(
      "rw",
      db.friends,
      db.attachments,
      db.syncState,
      async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const ch of data.changes as any[]) {
          if (ch.table === "friends") {
            if (ch.op === "upsert") {
              const friend: Friend = {
                id: ch.data.id,
                name: ch.data.name,
                age: ch.data.age,
                updatedAt: ch.data.updatedAt,
                deletedAt: ch.data.deletedAt,
              };
              await db.friends.put(friend);
            } else if (ch.op === "delete") {
              await db.friends.delete(ch.pk);
            }
          } else if (ch.table === "attachments") {
            if (ch.op === "upsert") {
              const attachment: Attachment = {
                id: ch.data.id,
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
            } else if (ch.op === "delete") {
              await db.attachments.delete(ch.pk);
            }
          }
        }

        await db.syncState.put({ key: "friends", lastSeq: data.newSeq });
      },
    );
  } finally {
    setSyncing(false);
  }

  return data.hasMore as boolean;
}

export async function syncOnce() {
  // Push until outbox drained
  while ((await db.outbox.count()) > 0) {
    await pushChanges(100);
  }

  // Pull until no more pages
  while (await pullChanges(500)) {
    // loop
  }
}
