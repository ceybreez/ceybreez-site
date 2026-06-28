export function renderStats(ctx) {
  const box = document.getElementById("inquiryStats");
  if (!box) return;
  const count = status => ctx.items.filter(x => ctx.status(x) === status.toLowerCase()).length;
  box.innerHTML = `
    <div class="mini-card"><span>Total</span><strong>${ctx.items.length}</strong></div>
    <div class="mini-card"><span>New</span><strong>${count("New")}</strong></div>
    <div class="mini-card"><span>Quoted</span><strong>${count("Quoted")}</strong></div>
    <div class="mini-card"><span>Booked</span><strong>${count("Booked")}</strong></div>
    <div class="mini-card"><span>Cancelled</span><strong>${count("Cancelled")}</strong></div>
  `;
}