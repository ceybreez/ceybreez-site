import { renderList } from "./list.js";
import { renderDetails } from "./details.js";

export function applyFilters(ctx) {
  const search = (document.getElementById("inquirySearch")?.value || "").toLowerCase();
  const status = document.getElementById("inquiryStatusFilter")?.value || "";
  const type = document.getElementById("inquiryTypeFilter")?.value || "";

  ctx.filtered = ctx.items.filter(item => {
    const text = `${item.reference || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""} ${item.guestCountry || ""} ${item.serviceType || ""} ${item.itemName || ""} ${item.message || ""}`.toLowerCase();
    const statusOk = !status || String(item.status || "New") === status;
    const typeOk = !type || ctx.type(item) === type;
    return statusOk && typeOk && (!search || text.includes(search));
  });

  if (ctx.selectedId && !ctx.filtered.some(x => String(x.id) === String(ctx.selectedId))) {
    ctx.selectedId = ctx.filtered[0]?.id || null;
  }

  renderList(ctx);
  if (ctx.selectedId) renderDetails(ctx, ctx.selectedId);
}