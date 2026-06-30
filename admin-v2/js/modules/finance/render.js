export function escapeFinanceHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeFinanceNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

export function detectFinanceCurrency(booking) {
  const direct = booking.currency || booking.quoteCurrency;
  if (direct) return String(direct).toUpperCase();

  const text = String(booking.totalAmount || booking.dayRate || "").trim();
  const match = text.match(/^[A-Za-z]{3}/);
  return match ? match[0].toUpperCase() : "USD";
}

export function financeStatusClass(status) {
  return String(status || "Pending")
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function formatFinanceAmount(value, currency = "") {
  const amount = normalizeFinanceNumber(value);
  if (!amount) return "-";
  return `${currency ? `${escapeFinanceHtml(currency)} ` : ""}${amount.toFixed(2)}`;
}

export function getBookingFinanceModel(booking) {
  const currency = detectFinanceCurrency(booking);
  const total = normalizeFinanceNumber(booking.totalAmount || booking.quoteTotalAmount);
  const advance = normalizeFinanceNumber(booking.advanceAmount);
  const refund = normalizeFinanceNumber(booking.refundAmount);
  const storedBalance = normalizeFinanceNumber(booking.balanceAmount);
  const calculatedBalance = Math.max(total - advance, 0);

  return {
    id: booking.id,
    reference: booking.reference || booking.id || "-",
    createdAt: booking.createdAt || booking.created_at || "",
    itemName: booking.itemName || "-",
    serviceType: booking.serviceType || "-",
    guestName: booking.guestName || "-",
    guestEmail: booking.guestEmail || "",
    guestMobile: booking.guestMobile || "",
    currency,
    totalAmount: total,
    advanceAmount: advance,
    balanceAmount: storedBalance || calculatedBalance,
    refundAmount: refund,
    paymentStatus: booking.paymentStatus || "Pending",
    paymentMethod: booking.paymentMethod || "",
    paidDate: booking.paidDate || booking.paymentDate || "",
    financeNotes: booking.financeNotes || booking.paymentNotes || ""
  };
}

export function renderFinanceStats(bookings, box) {
  if (!box) return;

  const models = bookings.map(getBookingFinanceModel);
  const total = models.reduce((sum, item) => sum + item.totalAmount, 0);
  const advance = models.reduce((sum, item) => sum + item.advanceAmount, 0);
  const balance = models.reduce((sum, item) => sum + item.balanceAmount, 0);
  const refund = models.reduce((sum, item) => sum + item.refundAmount, 0);
  const currency = models.find(x => x.currency)?.currency || "USD";

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Booking Value</h3><div class="value">${escapeFinanceHtml(currency)} ${total.toFixed(2)}</div></div>
    <div class="dashboard-card card-booked"><h3>Advance Received</h3><div class="value">${escapeFinanceHtml(currency)} ${advance.toFixed(2)}</div></div>
    <div class="dashboard-card card-pending"><h3>Balance Pending</h3><div class="value">${escapeFinanceHtml(currency)} ${balance.toFixed(2)}</div></div>
    <div class="dashboard-card card-closed"><h3>Refunded</h3><div class="value">${escapeFinanceHtml(currency)} ${refund.toFixed(2)}</div></div>
  `;
}

export function renderFinanceTable(bookings, tbody) {
  if (!tbody) return;

  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No finance records found</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(booking => {
    const item = getBookingFinanceModel(booking);
    const statusClass = financeStatusClass(item.paymentStatus);

    return `
      <tr class="clickable-row" data-finance-booking-id="${escapeFinanceHtml(item.id)}">
        <td>${escapeFinanceHtml(item.reference)}</td>
        <td>${escapeFinanceHtml(String(item.createdAt).slice(0, 10) || "-")}</td>
        <td>${escapeFinanceHtml(item.itemName)}<br><small>${escapeFinanceHtml(item.serviceType)}</small></td>
        <td><strong>${escapeFinanceHtml(item.guestName)}</strong><br><small>${escapeFinanceHtml(item.guestEmail)}</small><br><small>${escapeFinanceHtml(item.guestMobile)}</small></td>
        <td>${formatFinanceAmount(item.totalAmount, item.currency)}</td>
        <td>${formatFinanceAmount(item.advanceAmount, item.currency)}</td>
        <td>${formatFinanceAmount(item.balanceAmount, item.currency)}</td>
        <td>${formatFinanceAmount(item.refundAmount, item.currency)}</td>
        <td><span class="status-badge status-${escapeFinanceHtml(statusClass)}">${escapeFinanceHtml(item.paymentStatus)}</span></td>
        <td><button type="button" class="mini-btn" data-finance-edit-id="${escapeFinanceHtml(item.id)}">Edit</button></td>
      </tr>
    `;
  }).join("");
}

export function renderFinanceDetails(booking, box) {
  if (!box) return;

  if (!booking) {
    box.innerHTML = `<div class="booking-detail-card"><p>Select a booking to update finance details.</p></div>`;
    return;
  }

  const item = getBookingFinanceModel(booking);
  const statusOptions = ["Pending", "Advance Paid", "Paid", "Refunded"];
  const methodOptions = ["", "Cash", "Bank Transfer", "Card", "Online Payment", "Other"];

  box.innerHTML = `
    <div class="booking-detail-card">
      <h3>${escapeFinanceHtml(item.reference)}</h3>
      <p><b>Property / Tour:</b> ${escapeFinanceHtml(item.itemName)}</p>
      <p><b>Guest:</b> ${escapeFinanceHtml(item.guestName)}</p>

      <form id="financeForm" class="manual-booking-form">
        <input type="hidden" id="financeBookingId" value="${escapeFinanceHtml(item.id)}" />

        <label>Currency</label>
        <select id="financeCurrency">
          ${["USD", "LKR", "EUR", "OMR"].map(currency => `<option value="${currency}" ${item.currency === currency ? "selected" : ""}>${currency}</option>`).join("")}
        </select>

        <label>Total Amount</label>
        <input id="financeTotalAmount" type="number" min="0" step="0.01" value="${escapeFinanceHtml(item.totalAmount || "")}" />

        <label>Advance Received</label>
        <input id="financeAdvanceAmount" type="number" min="0" step="0.01" value="${escapeFinanceHtml(item.advanceAmount || "")}" />

        <label>Balance</label>
        <input id="financeBalanceAmount" type="number" min="0" step="0.01" value="${escapeFinanceHtml(item.balanceAmount || "")}" />

        <label>Refund Amount</label>
        <input id="financeRefundAmount" type="number" min="0" step="0.01" value="${escapeFinanceHtml(item.refundAmount || "")}" />

        <label>Payment Status</label>
        <select id="financePaymentStatus">
          ${statusOptions.map(status => `<option value="${escapeFinanceHtml(status)}" ${item.paymentStatus === status ? "selected" : ""}>${escapeFinanceHtml(status)}</option>`).join("")}
        </select>

        <label>Payment Method</label>
        <select id="financePaymentMethod">
          ${methodOptions.map(method => `<option value="${escapeFinanceHtml(method)}" ${item.paymentMethod === method ? "selected" : ""}>${escapeFinanceHtml(method || "Select Method")}</option>`).join("")}
        </select>

        <label>Paid Date</label>
        <input id="financePaidDate" type="date" value="${escapeFinanceHtml(item.paidDate)}" />

        <label>Finance Notes</label>
        <textarea id="financeNotes" placeholder="Bank transfer reference, refund reason, admin note...">${escapeFinanceHtml(item.financeNotes)}</textarea>

        <button type="submit">Save Finance Details</button>
      </form>
    </div>
  `;
}
