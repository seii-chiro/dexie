import { uploadFile } from "./file-upload";
import { db, type Attachment } from "../db";
import { syncOnce } from "./sync";
import { useEffect, useState } from "react";

function FileUploadComponent({ friendId }: { friendId: string }) {
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const attachmentId = await uploadFile(file, friendId);
            console.log("File uploaded:", attachmentId);

            // Sync to propagate metadata
            await syncOnce();

        } catch (err) {
            console.error("Upload failed:", err);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileSelect} />
        </div>
    );
}

// Display attachments
function AttachmentsList({ friendId }: { friendId: string }) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    useEffect(() => {
        db.attachments
            .where("friendId")
            .equals(friendId)
            .toArray()
            .then(setAttachments);
    }, [friendId]);

    return (
        <ul>
            {attachments.map((att) => (
                <li key={att.id}>
                    {att.uploadStatus === "uploaded" && att.url ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                            {att.filename}
                        </a>
                    ) : (
                        <span>{att.filename} ({att.uploadStatus})</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

export { FileUploadComponent, AttachmentsList };