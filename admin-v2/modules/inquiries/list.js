export function renderList(ctx) {
  const box = document.getElementById("inquiriesList");
  if (!box) return;

  if (!ctx.filtered.length) {
    box.innerHTML = `<div class="empty-state">No inquiries found.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="inquiry-pro-layout">
      <div class="inquiry-list-panel">
        ${ctx.filtered.map(item => listItemHtml(ctx, item)).join("")}
      </div>
      <div id="inquiryDetailPanel" class="inquiry-detail-panel">
        <div class="empty-state">Select an inquiry to view details.</div>
      </div>
    </div>
  `;

  box.querySelectorAll("[data-inquiry-id]").forEach(btn => {
    btn.addEventListener("click", () => ctx.select(btn.dataset.inquiryId));
  });
}

function listItemHtml(ctx, item) {
  const active = String(ctx.selectedId) === String(item.id) ? "active" : "";
  return `
    <button class="inquiry-list-item ${active}" data-inquiry-id="${ctx.escape(item.id)}">
      <div>
        <strong>${ctx.escape(item.reference || item.id || "-")}</strong>
        <span>${ctx.escape(item.guestName || "Guest")}</span>
        <small>${ctx.escape(item.itemName || item.serviceType || "-")}</small>
      </div>
      <div class="inquiry-list-side">
        <span class="badge ${ctx.badgeClass(item.status)}">${ctx.escape(item.status || "New")}</span>
        <small>${ctx.formatDate(item.createdAt || item.created_at || item.dateFrom)}</small>
      </div>
    </button>
  `;
}