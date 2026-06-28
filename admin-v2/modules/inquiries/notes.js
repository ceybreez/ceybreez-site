import { apiPost } from "../../utils/api.js";
import { renderDetails } from "./details.js";

export function notesHtml(ctx) {
  if (!ctx.notes.length) return `<div class="empty-state small-empty">No internal notes yet.</div>`;
  return ctx.notes.map(note => `
    <div class="note-item">
      <strong>${ctx.formatDate(note.createdAt || note.created_at)}</strong>
      <p>${ctx.escape(note.note || "")}</p>
    </div>
  `).join("");
}

export async function saveNote(ctx, id) {
  const box = document.getElementById("newInquiryNote");
  const note = (box?.value || "").trim();
  if (!note) { alert("Please type a note first."); return; }

  try {
    await apiPost(`/api/admin/inquiries/${id}/notes`, { note });
    await renderDetails(ctx, id);
    alert("Note saved");
  } catch (error) {
    alert(error.message);
  }
}