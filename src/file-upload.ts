import { db } from "../db";

const API = import.meta.env.VITE_API_URL;

function normalizeAttachmentTags(recordTags?: string[]): string[] {
  const tags = (recordTags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

// Store file locally in IndexedDB (offline-first)
export async function uploadFile(
  file: File,
  friendId?: string,
  recordTags?: string[],
): Promise<string> {
  const attachmentId = crypto.randomUUID();

  // Save file and metadata to IndexedDB only
  await db.attachments.add({
    id: attachmentId,
    record_tags: normalizeAttachmentTags(recordTags),
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    localBlob: file, // Store the actual file
    uploadStatus: "pending",
    friendId,
    updatedAt: Date.now(),
  });

  console.log("📎 [upload] File stored locally:", attachmentId);
  return attachmentId;
}

// Upload pending files to server (called during sync)
export async function uploadPendingFiles() {
  const pending = await db.attachments
    .where("uploadStatus")
    .equals("pending")
    .toArray();

  console.log(`📤 [upload] Found ${pending.length} pending files to upload`);

  for (const attachment of pending) {
    if (!attachment.localBlob) {
      console.warn("⚠️ [upload] No local blob for", attachment.id);
      continue;
    }

    try {
      await db.attachments.update(attachment.id, { uploadStatus: "uploading" });

      const formData = new FormData();
      formData.append("file", attachment.localBlob, attachment.filename);
      formData.append("id", attachment.id);
      formData.append("filename", attachment.filename);
      formData.append("mimeType", attachment.mimeType);
      if (attachment.friendId) {
        formData.append("friendId", attachment.friendId);
      }

      const res = await fetch(`${API}/sync/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ [upload] Upload successful:", attachment.filename);

      // Update with server URL and remove local blob
      await db.attachments.update(attachment.id, {
        url: data.url,
        uploadStatus: "uploaded",
        localBlob: undefined, // Clear local blob after successful upload
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error("❌ [upload] Upload failed:", attachment.filename, err);
      await db.attachments.update(attachment.id, { uploadStatus: "failed" });
    }
  }
}

// Helper to get file URL (local or remote)
export async function getFileUrl(attachmentId: string): Promise<string | null> {
  const attachment = await db.attachments.get(attachmentId);
  if (!attachment) return null;

  // If uploaded, use server URL
  if (attachment.url) {
    return attachment.url;
  }

  // If still pending/failed, show placeholder or retry
  return null;
}
