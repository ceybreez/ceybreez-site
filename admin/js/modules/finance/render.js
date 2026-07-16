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
  return `${escapeHtml(currency || "USD")} ${money(value).toFixed(2)}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("paid")) return "booked";
  if (s.includes("partial")) return "quoted";
  if (s.includes("refund") || s.includes("cancel")) return "cancelled";
  if (s.includes("commission") || s.includes("adjust")) return "quoted";
  return "new";
}

function stat(label, value, sub = "") {
  return `<div class="v14-stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></div>`;
}

function outstandingAmount(total, paid, refunded) {
  return Math.max(money(total) - Math.max(money(paid) - money(refunded), 0), 0);
}

function financeStatus(b) {
  const total = money(b.totalAmount);
  const paid = money(b.paidAmount);
  const refunded = money(b.refundAmount);
  const outstanding = outstandingAmount(total, paid, refunded);

  if (refunded > 0 && paid > 0 && outstanding > 0) return "Partially Refunded";
  if (refunded > 0 && outstanding <= 0) return "Refunded";
  if (total > 0 && outstanding <= 0) return "Paid";
  if (paid > 0) return "Partial";
  return b.paymentStatus || "Pending";
}

function transactionDate(x) {
  return x.paymentDate || x.refundDate || x.adjustmentDate || x.commissionDate || x.createdAt;
}

function transactionMethod(x) {
  return x.paymentMethod || x.method || "-";
}

function transactionCategory(x) {
  return x.paymentType || x.adjustmentType || x.commissionType || x.reason || x.category || "-";
}

function transactionRemarks(x) {
  const agent = x.agentName ? `Agent: ${x.agentName}` : "";
  const remarks = x.remarks || x.reason || "-";
  return agent ? `${agent} / ${remarks}` : remarks;
}

function transactionSignedAmount(x) {
  const kind = String(x.kind || "Payment");
  if (kind === "Refund") return -money(x.amount);
  if (kind === "Commission") return -money(x.amount);
  if (kind === "Adjustment") {
    const type = String(x.adjustmentType || "Decrease").toLowerCase();
    return type.includes("increase") ? money(x.amount) : -money(x.amount);
  }
  return money(x.amount);
}

function transactionBadgeClass(kind) {
  if (kind === "Refund") return "cancelled";
  if (kind === "Commission") return "quoted";
  if (kind === "Adjustment") return "quoted";
  return "booked";
}

function bookingRows(bookings) {
  if (!bookings.length) return `<tr><td colspan="10" class="empty-row">No booking finance records found.</td></tr>`;

  return bookings.map((b) => {
    const currency = b.currency || "USD";
    const total = money(b.totalAmount);
    const paid = money(b.paidAmount);
    const refunded = money(b.refundAmount);
    const outstanding = outstandingAmount(total, paid, refunded);
    const status = financeStatus(b);

    return `<tr>
      <td><strong>${escapeHtml(b.reference || b.id || "-")}</strong><br><small>${escapeHtml(b.serviceType || "")}</small></td>
      <td>${escapeHtml(b.guestName || "Guest")}<br><small>${escapeHtml(b.itemName || "-")}</small></td>
      <td>${fmtDate(b.dateFrom)} → ${fmtDate(b.dateTo)}</td>
      <td>${fmtAmount(currency, total)}</td>
      <td>${fmtAmount(currency, paid)}</td>
      <td>${fmtAmount(currency, refunded)}</td>
      <td><strong>${fmtAmount(currency, outstanding)}</strong></td>
      <td><small>${escapeHtml(b.lastPaymentMethod || "-")}</small></td>
      <td><span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span></td>
      <td class="finance-actions">
        <button class="small-btn" type="button" onclick="window.openFinanceEntry('${escapeHtml(b.id)}')">Add</button>
        <button class="small-btn ghost" type="button" onclick="window.openFinanceHistory('${escapeHtml(b.id)}')">History</button>
      </td>
    </tr>`;
  }).join("");
}

function transactionRows(items) {
  if (!items.length) return `<tr><td colspan="9" class="empty-row">No finance history yet.</td></tr>`;

  let running = 0;

  return items.map((x) => {
    const kind = x.kind || "Payment";
    const signed = transactionSignedAmount(x);
    running += signed;
    const receiptNo = x.receiptNo || x.transactionNo || x.id || "-";
    const isEditable = kind === "Payment" || kind === "Refund";

    return `<tr>
      <td>${fmtDate(transactionDate(x))}</td>
      <td><span class="status-badge ${transactionBadgeClass(kind)}">${escapeHtml(kind)}</span></td>
      <td>${escapeHtml(transactionCategory(x))}</td>
      <td>${escapeHtml(receiptNo)}</td>
      <td>${escapeHtml(transactionMethod(x))}</td>
      <td><strong>${signed < 0 ? "-" : "+"}${fmtAmount(x.currency || "USD", Math.abs(signed))}</strong></td>
      <td><strong>${fmtAmount(x.currency || "USD", running)}</strong></td>
      <td>${escapeHtml(transactionRemarks(x))}</td>
      <td class="finance-actions">
        ${isEditable ? `<button class="small-btn" type="button" onclick="window.editFinanceTxn('${escapeHtml(kind)}','${escapeHtml(x.id)}')">Edit</button>` : ""}
        ${isEditable ? `<button class="small-btn ghost" type="button" onclick="window.printFinanceReceipt('${escapeHtml(kind)}','${escapeHtml(x.id)}')">Receipt</button>` : ""}
        ${isEditable ? `<button class="small-btn ghost" type="button" onclick="window.emailFinanceReceipt('${escapeHtml(kind)}','${escapeHtml(x.id)}')">Email</button>` : ""}
        ${isEditable ? `<button class="delete-btn mini-btn" type="button" onclick="window.deleteFinanceTxn('${escapeHtml(kind)}','${escapeHtml(x.id)}')">Delete</button>` : `<small>-</small>`}
      </td>
    </tr>`;
  }).join("");
}

function compactBookingSummary(b, historySummary) {
  if (!b) return "";
  const currency = b.currency || "USD";
  const total = money(b.totalAmount);
  const paid = money(historySummary?.paidAmount ?? b.paidAmount);
  const refunded = money(historySummary?.refundAmount ?? b.refundAmount);
  const outstanding = outstandingAmount(total, paid, refunded);
  const status = financeStatus({ ...b, paidAmount: paid, refundAmount: refunded });

  return `<div class="finance-selected-card">
    <div><span>Reference</span><strong>${escapeHtml(b.reference || b.id || "-")}</strong></div>
    <div><span>Guest</span><strong>${escapeHtml(b.guestName || "Guest")}</strong></div>
    <div><span>Item</span><strong>${escapeHtml(b.itemName || b.serviceType || "-")}</strong></div>
    <div><span>Dates</span><strong>${fmtDate(b.dateFrom)} → ${fmtDate(b.dateTo)}</strong></div>
    <div><span>Total</span><strong>${fmtAmount(currency, total)}</strong></div>
    <div><span>Paid</span><strong>${fmtAmount(currency, paid)}</strong></div>
    <div><span>Refunded</span><strong>${fmtAmount(currency, refunded)}</strong></div>
    <div><span>Outstanding</span><strong>${fmtAmount(currency, outstanding)}</strong></div>
    <div><span>Status</span><strong><span class="status-badge ${statusClass(status)}">${escapeHtml(status)}</span></strong></div>
    <div class="finance-summary-actions">
      <button class="small-btn" type="button" onclick="window.printFinanceInvoice('${escapeHtml(b.id)}')">Invoice</button>
      <button class="small-btn ghost" type="button" onclick="window.emailFinanceInvoice('${escapeHtml(b.id)}')">Email Invoice</button>
    </div>
  </div>`;
}

function globalHistoryRows(items) {
  if (!items.length) return `<tr><td colspan="7" class="empty-row">No finance history yet.</td></tr>`;

  return items.map((x) => {
    const kind = x.kind || "Payment";
    const signed = transactionSignedAmount(x);
    return `<tr>
      <td>${fmtDate(transactionDate(x))}</td>
      <td><span class="status-badge ${transactionBadgeClass(kind)}">${escapeHtml(kind)}</span></td>
      <td>${escapeHtml(x.reference || x.bookingReference || "-")}</td>
      <td>${escapeHtml(x.guestName || x.agentName || "-")}</td>
      <td>${escapeHtml(transactionMethod(x))}</td>
      <td><strong>${signed < 0 ? "-" : "+"}${fmtAmount(x.currency || "USD", Math.abs(signed))}</strong></td>
      <td>${escapeHtml(transactionRemarks(x))}</td>
    </tr>`;
  }).join("");
}

export function renderFinance(root, state) {
  const bookings = state.bookings || [];
  const history = state.history || [];
  const totals = state.totals || {};

  root.innerHTML = `
    <div class="finance-toolbar">
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
        <option value="cash">Cash</option>
        <option value="bank transfer">Bank Transfer</option>
        <option value="card">Card</option>
        <option value="online payment">Online Payment</option>
        <option value="other">Other</option>
      </select>
      <button class="v14-refresh" type="button" onclick="window.renderFinanceModule()">Refresh</button>
      <button class="v14-refresh" type="button" onclick="window.exportFinanceCSV()">Export CSV</button>
    </div>

    <div class="v14-dashboard-grid finance-stats-grid">
      ${stat("Total Booking Value", fmtAmount(totals.currency || "USD", totals.totalBookingValue || 0), "Confirmed bookings")}
      ${stat("Total Received", fmtAmount(totals.currency || "USD", totals.totalReceived || 0), "Payments recorded")}
      ${stat("Outstanding", fmtAmount(totals.currency || "USD", totals.outstanding || 0), "Balance to collect")}
      ${stat("Refunds", fmtAmount(totals.currency || "USD", totals.totalRefunded || 0), "Refunds recorded")}
    </div>

    <div class="table-wrap finance-bookings-table">
      <table class="admin-table">
        <thead><tr><th>Reference</th><th>Guest / Item</th><th>Dates</th><th>Total</th><th>Paid</th><th>Refund</th><th>Outstanding</th><th>Method</th><th>Status</th><th>Action</th></tr></thead>
        <tbody id="financeBookingsBody">${bookingRows(bookings)}</tbody>
      </table>
    </div>

    <div id="financeEntryBox" class="admin-section hidden">
      <div class="section-head"><div><h2 id="financeEntryTitle">Add Finance Entry</h2><p>Record payment, refund, booking adjustment or agent commission.</p></div><button type="button" class="delete-btn" onclick="window.closeFinanceEntry()">Close</button></div>
      <div id="financeSelectedBooking"></div>

      <form id="financeEntryForm" class="v6-labeled-form">
        <input type="hidden" id="financeBookingId" />
        <input type="hidden" id="financeTxnId" />
        <input type="hidden" id="financeEditKind" />

        <label>Entry Type</label>
        <select id="financeEntryType">
          <option value="Payment">Payment</option>
          <option value="Refund">Refund</option>
          <option value="Adjustment">Booking Adjustment</option>
          <option value="Commission">Agent Commission</option>
        </select>

        <label id="financePaymentTypeLabel">Payment Type</label>
        <select id="financePaymentType">
          <option value="Advance">Advance</option>
          <option value="Balance">Balance</option>
          <option value="Extra Payment">Extra Payment</option>
        </select>

        <label id="financeCommissionAgentLabel" class="finance-commission-field hidden">Agent Name</label>
        <input id="financeAgentName" class="finance-commission-field hidden" placeholder="Agent / travel partner name" />

        <label id="financeCommissionPercentLabel" class="finance-commission-field hidden">Commission %</label>
        <input id="financeCommissionPercent" class="finance-commission-field hidden" type="number" step="0.01" min="0" placeholder="Use only for percentage commission" />

        <label id="financeCommissionStatusLabel" class="finance-commission-field hidden">Commission Status</label>
        <select id="financeCommissionStatus" class="finance-commission-field hidden">
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>

        <label>Payment Method</label>
        <select id="financePaymentMethod">
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Card">Card</option>
          <option value="Online Payment">Online Payment</option>
          <option value="Other">Other</option>
        </select>

        <label>Currency</label>
        <select id="financeCurrency">
          <option value="USD">USD</option>
          <option value="LKR">LKR</option>
          <option value="OMR">OMR</option>
          <option value="EUR">EUR</option>
        </select>

        <label>Amount</label>
        <input id="financeAmount" type="number" step="0.01" min="0" required />

        <label>Date</label>
        <input id="financeDate" type="date" required />

        <label>Transaction / Receipt No.</label>
        <input id="financeTransactionNo" placeholder="Bank reference / card transaction / receipt ref" />

        <label>Remarks / Reason</label>
        <textarea id="financeRemarks" placeholder="Finance note / reason"></textarea>

        <button type="submit" id="financeSubmitBtn">Save Finance Entry</button>
      </form>

      <section class="finance-history-box">
        <div class="section-head compact"><div><h2>Selected Booking History</h2><p>Payments, refunds, adjustments, commissions and running balance for this booking.</p></div></div>
        <div class="table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Receipt / Ref</th><th>Method</th><th>Amount</th><th>Running</th><th>Remarks</th><th>Action</th></tr></thead><tbody id="financeSelectedHistory"><tr><td colspan="9" class="empty-row">Select a booking to view history.</td></tr></tbody></table></div>
      </section>
    </div>

    <section class="admin-section finance-global-history">
      <div class="section-head"><div><h2>Finance History</h2><p>Latest finance transactions across all bookings.</p></div></div>
      <div class="table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Guest / Agent</th><th>Method</th><th>Amount</th><th>Remarks</th></tr></thead><tbody>${globalHistoryRows(history)}</tbody></table></div>
    </section>`;
}

export function renderSelectedBooking(root, booking, historyState) {
  const summary = historyState?.summary || {};
  const items = historyState?.items || [];
  const summaryBox = document.getElementById("financeSelectedBooking");
  if (summaryBox) summaryBox.innerHTML = compactBookingSummary(booking, summary);
  const body = document.getElementById("financeSelectedHistory");
  if (body) body.innerHTML = transactionRows(items);
}

export function applyFinanceFilters(state) {
  const q = String(document.getElementById("financeSearch")?.value || "").toLowerCase();
  const statusFilter = String(document.getElementById("financeStatusFilter")?.value || "all").toLowerCase();
  const methodFilter = String(document.getElementById("financeMethodFilter")?.value || "all").toLowerCase();

  const rows = (state.bookings || []).filter((b) => {
    const status = financeStatus(b).toLowerCase();
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
