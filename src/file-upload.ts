import { db } from "../db";

const API = import.meta.env.VITE_API_URL;

export async function uploadFile(
  file: File,
  friendId?: string,
): Promise<string> {
  const attachmentId = crypto.randomUUID();

  // 1. Save metadata to IndexedDB immediately
  await db.attachments.add({
    id: attachmentId,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    uploadStatus: "pending",
    friendId,
    updatedAt: Date.now(),
  });

  console.log("📎 [upload] Created attachment metadata:", attachmentId);

  // 2. Upload file to server
  const formData = new FormData();
  formData.append("file", file);
  formData.append("id", attachmentId);
  formData.append("filename", file.name);
  formData.append("mimeType", file.type);
  if (friendId) {
    formData.append("friendId", friendId);
  }

  try {
    // Update status to uploading
    await db.attachments.update(attachmentId, { uploadStatus: "uploading" });
    console.log("📤 [upload] Uploading to server...");

    const res = await fetch(`${API}/sync/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.status}`);
    }

    const data = await res.json();
    console.log("✅ [upload] Upload successful:", data);

    // Update with server URL
    await db.attachments.update(attachmentId, {
      url: data.url,
      uploadStatus: "uploaded",
      updatedAt: Date.now(),
    });

    return attachmentId;
  } catch (err) {
    console.error("❌ [upload] Upload failed:", err);
    await db.attachments.update(attachmentId, { uploadStatus: "failed" });
    throw err;
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
