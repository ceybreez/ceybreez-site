export function timelineHtml(ctx, item) {
  const created = item.createdAt || item.created_at || item.dateFrom || "";
  const status = item.status || "New";

  const noteTimeline = ctx.notes.map(note => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <strong>Internal Note Added</strong>
        <small>${ctx.formatDate(note.createdAt || note.created_at)}</small>
        <p>${ctx.escape(note.note || "")}</p>
      </div>
    </div>
  `).join("");

  return `
    <div class="timeline">
      <div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><strong>Inquiry Received</strong><small>${ctx.formatDate(created)}</small></div></div>
      ${status !== "New" ? `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><strong>Status Updated: ${ctx.escape(status)}</strong><small>${ctx.formatDate(item.updatedAt || item.updated_at || created)}</small></div></div>` : ""}
      ${noteTimeline}
      ${ctx.status(item) === "booked" ? `<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><strong>Booking Confirmed</strong><small>${ctx.formatDate(item.updatedAt || item.updated_at || created)}</small></div></div>` : ""}
    </div>
  `;
}