function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  const n = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtAmount(currency, value) {
  const n = money(value);
  return `${escapeHtml(currency || "USD")} ${n.toFixed(2)}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function stat(label, value, sub = "") {
  return `<div class="v14-stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></div>`;
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("paid")) return "booked";
  if (s.includes("partial")) return "quoted";
  if (s.includes("refund")) return "cancelled";
  return "new";
}

function bookingRows(bookings) {
  if (!bookings.length) {
    return `<tr><td colspan="9" class="empty-row">No booking finance records found.</td></tr>`;
  }

  return bookings.map((b) => {
    const currency = b.currency || "USD";
    const total = money(b.totalAmount);
    const paid = money(b.paidAmount);
    const refunded = money(b.refundAmount);
    const outstanding = Math.max(total - paid + refunded, 0);
    const status = outstanding <= 0 && total > 0 ? "Paid" : paid > 0 ? "Partial" : (b.paymentStatus || "Pending");

    return `
      <tr>
        <td><strong>${escapeHtml(b.reference || b.id || "-")}</strong><br><small>${escapeHtml(b.serviceType || "")}</small></td>
        <td>${escapeHtml(b.guestName || "Guest")}<br><small>${escapeHtml(b.itemName || "-")}</small></td>
        <td>${fmtDate(b.dateFrom)} → ${fmtDate(b.dateTo)}</td>
        <td>${fmtAmount(currency, total)}</td>
        <td>${fmtAmount(currency, paid)}</td>
        <td>${fmtAmount(currency, refunded)}</td>
        <td><strong>${fmtAmount(currency, outstanding)}</strong></td>
        <td><span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span></td>
        <td><button class="small-btn" type="button" onclick="window.openFinanceEntry('${escapeHtml(b.id)}')">Add Payment</button></td>
      </tr>`;
  }).join("");
}

function historyRows(items) {
  if (!items.length) return `<tr><td colspan="7" class="empty-row">No payment or refund history yet.</td></tr>`;
  return items.map((x) => `
    <tr>
      <td>${fmtDate(x.paymentDate || x.refundDate || x.createdAt)}</td>
      <td><span class="status-badge ${x.kind === "Refund" ? "cancelled" : "booked"}">${escapeHtml(x.kind)}</span></td>
      <td>${escapeHtml(x.reference || x.bookingReference || "-")}</td>
      <td>${escapeHtml(x.guestName || "-")}</td>
      <td>${escapeHtml(x.paymentMethod || "-")}</td>
      <td><strong>${fmtAmount(x.currency || "USD", x.amount)}</strong></td>
      <td>${escapeHtml(x.remarks || x.reason || "-")}</td>
    </tr>`).join("");
}

export function renderFinance(root, state) {
  const bookings = state.bookings || [];
  const history = state.history || [];
  const totals = state.totals || {};

  root.innerHTML = `
    
<button class="v14-refresh" type="button" onclick="window.renderFinanceModule()">Refresh Finance</button>
    </div>

    <div class="v14-dashboard-grid">
      ${stat("Total Booking Value", fmtAmount(totals.currency || "USD", totals.totalBookingValue || 0), "Confirmed bookings")}
      ${stat("Total Received", fmtAmount(totals.currency || "USD", totals.totalReceived || 0), "Payments recorded")}
      ${stat("Outstanding", fmtAmount(totals.currency || "USD", totals.outstanding || 0), "Balance to collect")}
      ${stat("Refunds", fmtAmount(totals.currency || "USD", totals.totalRefunded || 0), "Refunds recorded")}
    </div>

    <div class="filter-row">
      <input id="financeSearch" placeholder="Search reference, guest, property or tour..." />
      <select id="financeStatusFilter">
        <option value="all">All Status</option>
        <option value="pending">Pending / Unpaid</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="refund">Refunded</option>
      </select>
      <select id="financeMethodFilter">
        <option value="all">All Methods</option>
        <option value="Cash">Cash</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Card">Card</option>
        <option value="Online Payment">Online Payment</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Reference</th><th>Guest / Item</th><th>Dates</th><th>Total</th><th>Paid</th><th>Refund</th><th>Outstanding</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody id="financeBookingsBody">${bookingRows(bookings)}</tbody>
      </table>
    </div>

    <div id="financeEntryBox" class="admin-section hidden" style="margin-top:18px;">
      <div class="section-head"><div><h2 id="financeEntryTitle">Add Finance Entry</h2><p>Record advance, balance, extra payment or refund.</p></div><button type="button" class="delete-btn" onclick="window.closeFinanceEntry()">Close</button></div>
      <form id="financeEntryForm" class="v6-labeled-form">
        <input type="hidden" id="financeBookingId" />
        <label>Entry Type</label>
        <select id="financeEntryType"><option value="Payment">Payment</option><option value="Refund">Refund</option></select>
        <label>Payment Type</label>
        <select id="financePaymentType"><option value="Advance">Advance</option><option value="Balance">Balance</option><option value="Extra Payment">Extra Payment</option><option value="Adjustment">Adjustment</option></select>
        <label>Payment Method</label>
        <select id="financePaymentMethod"><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option><option value="Online Payment">Online Payment</option><option value="Other">Other</option></select>
        <label>Currency</label>
        <select id="financeCurrency"><option value="USD">USD</option><option value="LKR">LKR</option><option value="OMR">OMR</option><option value="EUR">EUR</option></select>
        <label>Amount</label>
        <input id="financeAmount" type="number" step="0.01" min="0" required />
        <label>Date</label>
        <input id="financeDate" type="date" required />
        <label>Transaction No.</label>
        <input id="financeTransactionNo" placeholder="Bank reference / card transaction / receipt ref" />
        <label>Remarks</label>
        <textarea id="financeRemarks" placeholder="Finance note"></textarea>
        <button type="submit">Save Finance Entry</button>
      </form>
    </div>

    <section class="admin-section" style="margin-top:18px;">
      <div class="section-head"><div><h2>Payment / Refund History</h2><p>Latest finance transactions across all bookings.</p></div></div>
      <div class="table-wrap">
        <table class="admin-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Guest</th><th>Method</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>${historyRows(history)}</tbody></table>
      </div>
    </section>`;
}

export function applyFinanceFilters(state) {
  const q = String(document.getElementById("financeSearch")?.value || "").toLowerCase();
  const statusFilter = String(document.getElementById("financeStatusFilter")?.value || "all").toLowerCase();
  const methodFilter = String(document.getElementById("financeMethodFilter")?.value || "all").toLowerCase();

  const rows = (state.bookings || []).filter((b) => {
    const total = money(b.totalAmount);
    const paid = money(b.paidAmount);
    const refund = money(b.refundAmount);
    const outstanding = Math.max(total - paid + refund, 0);
    const status = outstanding <= 0 && total > 0 ? "paid" : paid > 0 ? "partial" : String(b.paymentStatus || "pending").toLowerCase();
    const hay = `${b.reference || ""} ${b.guestName || ""} ${b.itemName || ""} ${b.serviceType || ""}`.toLowerCase();
    const method = String(b.lastPaymentMethod || "").toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (statusFilter !== "all" && !status.includes(statusFilter)) return false;
    if (methodFilter !== "all" && method !== methodFilter) return false;
    return true;
  });

  const body = document.getElementById("financeBookingsBody");
  if (body) body.innerHTML = bookingRows(rows);
}
