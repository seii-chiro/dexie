import {
  db,
  type Friend,
  type Attachment,
  type RecordTag,
} from "../db";

console.debug("[outbox-logger] loaded and registering hooks");
console.log("🔴 [outbox-logger] MODULE LOADED - this should print immediately");

function uuid() {
  // Use crypto.randomUUID if available
  return crypto.randomUUID();
}

// Avoid logging changes while you’re applying server updates
let syncing = false;
export function setSyncing(v: boolean) {
  syncing = v;
}

db.friends.hook("creating", function (primKey, obj) {
  console.debug("[outbox] creating hook fired, syncing =", syncing);
  if (syncing) return;

  const now = Date.now();
  // Ensure sync fields exist
  (obj as Friend).record_tags = (obj as Friend).record_tags ?? [];
  (obj as Friend).updatedAt = now;
  (obj as Friend).deletedAt = undefined;

  const item = {
    changeId: uuid(),
    table: "friends" as const,
    primary_key: String(primKey ?? obj.id),
    op: "upsert" as const,
    payload: { ...obj, updatedAt: now, deletedAt: null },
    ts: now,
    attempts: 0,
  };
  // Defer adding to outbox so it occurs outside the current IDBTransaction
  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (creating)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (creating)", err),
      );
  }, 0);
  console.debug(
    "[outbox] scheduled (creating)",
    item.changeId,
    item.op,
    item.primary_key,
  );
});

db.friends.hook("updating", function (mods: Partial<Friend>, primKey, obj) {
  console.debug("[outbox] updating hook fired, syncing =", syncing);
  if (syncing) return;

  const now = Date.now();

  // Build the post-update snapshot (simple approach)
  const recordTags = mods.record_tags ?? obj.record_tags ?? [];
  const next = { ...obj, ...mods, updatedAt: now, record_tags: recordTags };

  // Ensure the write itself updates updatedAt
  mods.record_tags = recordTags;
  mods.updatedAt = now;

  const item = {
    changeId: uuid(),
    table: "friends" as const,
    primary_key: String(primKey),
    op: "upsert" as const,
    payload: next,
    ts: now,
    attempts: 0,
  };
  // Defer adding to outbox so it occurs outside the current IDBTransaction
  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (updating)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (updating)", err),
      );
  }, 0);
  console.debug(
    "[outbox] scheduled (updating)",
    item.changeId,
    item.op,
    item.primary_key,
  );
});

db.friends.hook("deleting", function (primKey) {
  console.debug("[outbox] deleting hook fired, syncing =", syncing);
  if (syncing) return;

  const now = Date.now();

  // Prefer tombstone delete (recommended for sync)
  // Instead of actual delete, you can call a "softDelete" API in your app.
  const item = {
    changeId: uuid(),
    table: "friends" as const,
    primary_key: String(primKey),
    op: "delete" as const,
    ts: now,
    attempts: 0,
  };
  // Defer adding to outbox so it occurs outside the current IDBTransaction
  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (deleting)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (deleting)", err),
      );
  }, 0);
  console.debug(
    "[outbox] scheduled (deleting)",
    item.changeId,
    item.op,
    item.primary_key,
  );
});

db.attachments.hook("creating", function (primKey, obj) {
  console.log("🎯 [hook] attachments creating fired, syncing =", syncing);
  if (syncing) {
    console.log("⏭️ [hook] skipping because syncing = true");
    return;
  }

  const now = Date.now();
  (obj as Attachment).record_tags = (obj as Attachment).record_tags ?? [];
  (obj as Attachment).updatedAt = now;
  (obj as Attachment).deletedAt = undefined;

  // Don't include localBlob in sync payload (it's only for local storage)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { localBlob: _localBlob, ...syncData } = obj as Attachment;

  const item = {
    changeId: uuid(),
    table: "attachments" as const,
    primary_key: String(primKey ?? obj.id),
    op: "upsert" as const,
    payload: { ...syncData, updatedAt: now, deletedAt: null },
    ts: now,
    attempts: 0,
  };

  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (attachments creating)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (attachments creating)", err),
      );
  }, 0);
});

db.attachments.hook(
  "updating",
  function (mods: Partial<Attachment>, primKey, obj) {
    console.log("🎯 [hook] attachments updating fired, syncing =", syncing);
    if (syncing) {
      console.log("⏭️ [hook] skipping because syncing = true");
      return;
    }

    const now = Date.now();
    const recordTags = mods.record_tags ?? obj.record_tags ?? [];
    const next = {
      ...obj,
      ...mods,
      updatedAt: now,
      record_tags: recordTags,
    };
    mods.record_tags = recordTags;
    mods.updatedAt = now;

    // Don't include localBlob in sync payload
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { localBlob: _localBlob, ...syncData } = next;

    const item = {
      changeId: uuid(),
      table: "attachments" as const,
      primary_key: String(primKey),
      op: "upsert" as const,
      payload: syncData,
      ts: now,
      attempts: 0,
    };

    setTimeout(() => {
      void db.outbox
        .add(item)
        .then(() =>
          console.debug(
            "[outbox] queued (attachments updating)",
            item.changeId,
            item.op,
            item.primary_key,
          ),
        )
        .catch((err) =>
          console.error("[outbox] failed to queue (attachments updating)", err),
        );
    }, 0);
  },
);

db.attachments.hook("deleting", function (primKey) {
  console.log("🎯 [hook] attachments deleting fired, syncing =", syncing);
  if (syncing) {
    console.log("⏭️ [hook] skipping because syncing = true");
    return;
  }

  const now = Date.now();

  const item = {
    changeId: uuid(),
    table: "attachments" as const,
    primary_key: String(primKey),
    op: "delete" as const,
    ts: now,
    attempts: 0,
  };

  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (attachments deleting)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (attachments deleting)", err),
      );
  }, 0);
});

db.recordTags.hook("creating", function (primKey, obj) {
  console.debug("[outbox] recordTags creating hook fired, syncing =", syncing);
  if (syncing) return;

  const now = Date.now();
  (obj as RecordTag).updatedAt = now;
  (obj as RecordTag).deletedAt = undefined;

  const item = {
    changeId: uuid(),
    table: "record_tags" as const,
    primary_key: String(primKey ?? obj.id),
    op: "upsert" as const,
    payload: { ...obj, updatedAt: now, deletedAt: null },
    ts: now,
    attempts: 0,
  };

  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (recordTags creating)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (recordTags creating)", err),
      );
  }, 0);
});

db.recordTags.hook(
  "updating",
  function (mods: Partial<RecordTag>, primKey, obj) {
    console.debug("[outbox] recordTags updating hook fired, syncing =", syncing);
    if (syncing) return;

    const now = Date.now();
    const next = { ...obj, ...mods, updatedAt: now };
    mods.updatedAt = now;

    const item = {
      changeId: uuid(),
      table: "record_tags" as const,
      primary_key: String(primKey),
      op: "upsert" as const,
      payload: next,
      ts: now,
      attempts: 0,
    };

    setTimeout(() => {
      void db.outbox
        .add(item)
        .then(() =>
          console.debug(
            "[outbox] queued (recordTags updating)",
            item.changeId,
            item.op,
            item.primary_key,
          ),
        )
        .catch((err) =>
          console.error("[outbox] failed to queue (recordTags updating)", err),
        );
    }, 0);
  },
);

db.recordTags.hook("deleting", function (primKey) {
  console.debug("[outbox] recordTags deleting hook fired, syncing =", syncing);
  if (syncing) return;

  const now = Date.now();

  const item = {
    changeId: uuid(),
    table: "record_tags" as const,
    primary_key: String(primKey),
    op: "delete" as const,
    ts: now,
    attempts: 0,
  };

  setTimeout(() => {
    void db.outbox
      .add(item)
      .then(() =>
        console.debug(
          "[outbox] queued (recordTags deleting)",
          item.changeId,
          item.op,
          item.primary_key,
        ),
      )
      .catch((err) =>
        console.error("[outbox] failed to queue (recordTags deleting)", err),
      );
  }, 0);
});
