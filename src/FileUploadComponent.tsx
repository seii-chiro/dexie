import { uploadFile } from "./file-upload";
import { db, type Attachment } from "../db";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function parseCustomTags(raw: string): string[] {
    return raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function buildAttachmentTags(selectedTags: string[], customTags: string): string[] {
    return Array.from(new Set([...selectedTags, ...parseCustomTags(customTags)]));
}

function FilePreview({ attachment }: { attachment: Attachment }) {
    const previewUrl = useMemo(() => {
        // If uploaded, use server URL
        if (attachment.url) {
            return `${API_URL}/${attachment.url}`;
        }

        // If pending with local blob, create object URL
        if (attachment.localBlob) {
            return URL.createObjectURL(attachment.localBlob);
        }

        return null;
    }, [attachment.url, attachment.localBlob]);

    const isImage = attachment.mimeType?.startsWith("image/");
    const isPdf = attachment.mimeType === "application/pdf";
    const isVideo = attachment.mimeType?.startsWith("video/");

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
                {/* Preview Section */}
                <div className="shrink-0">
                    {isImage && previewUrl ? (
                        <img
                            src={previewUrl}
                            alt={attachment.filename}
                            className="w-24 h-24 object-cover rounded border"
                        />
                    ) : isVideo && previewUrl ? (
                        <video
                            src={previewUrl}
                            className="w-24 h-24 object-cover rounded border"
                            controls={false}
                        />
                    ) : isPdf ? (
                        <div className="w-24 h-24 flex items-center justify-center bg-red-50 rounded border border-red-200">
                            <span className="text-4xl">📄</span>
                        </div>
                    ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-slate-100 rounded border">
                            <span className="text-4xl">📎</span>
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {attachment.uploadStatus === "pending" && (
                            <span className="text-orange-600 text-xs font-medium px-2 py-0.5 bg-orange-50 rounded">
                                ⏳ Pending sync
                            </span>
                        )}
                        {attachment.uploadStatus === "uploading" && (
                            <span className="text-blue-600 text-xs font-medium px-2 py-0.5 bg-blue-50 rounded">
                                ⬆️ Uploading...
                            </span>
                        )}
                        {attachment.uploadStatus === "uploaded" && (
                            <span className="text-green-600 text-xs font-medium px-2 py-0.5 bg-green-50 rounded">
                                ✅ Synced
                            </span>
                        )}
                        {attachment.uploadStatus === "failed" && (
                            <span className="text-red-600 text-xs font-medium px-2 py-0.5 bg-red-50 rounded">
                                ❌ Failed
                            </span>
                        )}
                    </div>

                    {previewUrl ? (
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium block truncate"
                        >
                            {attachment.filename}
                        </a>
                    ) : (
                        <span className="text-slate-700 font-medium block truncate">
                            {attachment.filename}
                        </span>
                    )}

                    <div className="text-xs text-slate-500 mt-1">
                        {attachment.mimeType} • {(attachment.size / 1024).toFixed(1)} KB
                    </div>
                </div>
            </div>
        </div>
    );
}

function FileUploadComponent({ friendId }: { friendId: string }) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTags, setCustomTags] = useState("");
    const availableTags = useLiveQuery(async () => {
        const items = await db.recordTags.toArray();
        return items.map((item) => item.tag_name).sort((a, b) => a.localeCompare(b));
    }, []);

    function toggleTag(tag: string) {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const attachmentId = await uploadFile(
                file,
                friendId,
                buildAttachmentTags(selectedTags, customTags),
            );
            console.log("File stored locally:", attachmentId);
            e.target.value = "";
        } catch (err) {
            console.error("Failed to store file:", err);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Record tags</span>
                <div className="flex flex-wrap gap-3">
                    {(availableTags ?? []).map((tag) => (
                        <label key={tag} className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={selectedTags.includes(tag)}
                                onChange={() => toggleTag(tag)}
                            />
                            <span>{tag}</span>
                        </label>
                    ))}
                </div>
                {availableTags && availableTags.length === 0 && (
                    <p className="text-xs text-slate-500">No tags in RecordTags table yet. Add some in Record Tags manager.</p>
                )}
                <input
                    className="mt-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="text"
                    value={customTags}
                    placeholder="Custom tags (comma separated)"
                    onChange={(ev) => setCustomTags(ev.target.value)}
                />
            </div>
            <input type="file" onChange={handleFileSelect} />
        </div>
    );
}

function UploadedFilesList() {
    const attachments = useLiveQuery(async () => {
        const items = await db.attachments.toArray();
        return items.sort((a, b) => b.updatedAt - a.updatedAt);
    }, []);

    return (
        <div>
            <h2 className="text-xl font-semibold mb-3">Files</h2>

            {!attachments || attachments.length === 0 ? (
                <p className="text-slate-500">No files yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attachments.map((att) => (
                        <FilePreview key={att.id} attachment={att} />
                    ))}
                </div>
            )}
        </div>
    );
}

export { FileUploadComponent, UploadedFilesList };
