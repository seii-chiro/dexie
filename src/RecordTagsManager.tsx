import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import SyncButton from "./SyncButton";

function RecordTagsManager() {
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [status, setStatus] = useState("");

  const tags = useLiveQuery(async () => {
    return db.recordTags.orderBy("updatedAt").reverse().toArray();
  }, []);

  async function createTag() {
    const tagName = newTagName.trim();
    if (!tagName) {
      setStatus("Tag name is required.");
      return;
    }

    try {
      const existing = await db.recordTags.where("tag_name").equalsIgnoreCase(tagName).first();
      if (existing) {
        setStatus(`Tag "${tagName}" already exists.`);
        return;
      }

      await db.recordTags.add({
        id: crypto.randomUUID(),
        tag_name: tagName,
      });
      setNewTagName("");
      setStatus(`Created tag "${tagName}".`);
    } catch (error) {
      setStatus(`Failed to create tag: ${error}`);
    }
  }

  function beginEdit(id: string, tagName: string) {
    setEditingId(id);
    setEditingTagName(tagName);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTagName("");
  }

  async function saveEdit(id: string) {
    const tagName = editingTagName.trim();
    if (!tagName) {
      setStatus("Tag name is required.");
      return;
    }

    try {
      const duplicate = await db.recordTags.where("tag_name").equalsIgnoreCase(tagName).first();
      if (duplicate && duplicate.id !== id) {
        setStatus(`Tag "${tagName}" already exists.`);
        return;
      }

      await db.recordTags.update(id, { tag_name: tagName });
      setStatus(`Updated tag to "${tagName}".`);
      cancelEdit();
    } catch (error) {
      setStatus(`Failed to update tag: ${error}`);
    }
  }

  async function deleteTag(id: string, tagName: string) {
    try {
      await db.recordTags.delete(id);
      setStatus(`Deleted tag "${tagName}".`);
      if (editingId === id) {
        cancelEdit();
      }
    } catch (error) {
      setStatus(`Failed to delete tag: ${error}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Record Tags</h2>
        <SyncButton />
      </div>

      <p
        className={`text-sm ${
          status.startsWith("Failed") || status.includes("required") || status.includes("exists")
            ? "text-red-700"
            : status
              ? "text-green-700"
              : "text-slate-500"
        }`}
      >
        {status || "Create, edit, or delete tags. Sync to push changes to server."}
      </p>

      <div className="flex flex-col gap-2 md:flex-row">
        <input
          className="flex-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          type="text"
          placeholder="New tag name"
          value={newTagName}
          onChange={(ev) => setNewTagName(ev.target.value)}
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={createTag}
        >
          Add Tag
        </button>
      </div>

      {!tags ? (
        <p className="text-sm text-slate-500">Loading tags...</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-slate-500">No record tags yet.</p>
      ) : (
        <ul className="space-y-2">
          {tags.map((tag) => {
            const isEditing = editingId === tag.id;
            return (
              <li
                key={tag.id}
                className="flex flex-col gap-2 rounded border bg-slate-50 p-3 md:flex-row md:items-center"
              >
                {isEditing ? (
                  <input
                    className="flex-1 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="text"
                    value={editingTagName}
                    onChange={(ev) => setEditingTagName(ev.target.value)}
                  />
                ) : (
                  <div className="flex-1 font-medium">{tag.tag_name}</div>
                )}

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded hover:bg-emerald-700 text-sm"
                        onClick={() => saveEdit(tag.id)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-slate-500 text-white px-3 py-1.5 rounded hover:bg-slate-600 text-sm"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
                      onClick={() => beginEdit(tag.id, tag.tag_name)}
                    >
                      Edit
                    </button>
                  )}

                  <button
                    className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 text-sm"
                    onClick={() => deleteTag(tag.id, tag.tag_name)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default RecordTagsManager;
