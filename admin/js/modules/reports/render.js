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

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function fmtAmount(currency, value) {
  return `${escapeHtml(currency || "USD")} ${money(value).toFixed(2)}`;
}

function pct(value) {
  const n = Number(value || 0);
  return `${Number.isFinite(n) ? n.toFixed(0) : "0"}%`;
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(String(value).slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function dateParts(value) {
  const m = dateOnly(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function diffDays(from, to) {
  const a = dateParts(from);
  const b = dateParts(to);
  if (!a || !b) return 0;
  const start = Date.UTC(a[0], a[1] - 1, a[2]);
  const end = Date.UTC(b[0], b[1] - 1, b[2]);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function addDays(value, delta) {
  const p = dateParts(value);
  if (!p) return dateOnly(value);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() + Number(delta || 0));
  return d.toISOString().slice(0, 10);
}

function categoryOf(row) {
  const text = `${row?.category || ""} ${row?.bookingCategory || ""} ${row?.serviceType || ""} ${row?.type || ""} ${row?.itemName || ""}`.toLowerCase();
  if (text.includes("tour") || text.includes("trip") || text.includes("safari")) return "tour";
  if (text.includes("homestay")) return "homestay";
  if (text.includes("apartment")) return "apartment";
  if (text.includes("villa")) return "villa";
  if (text.includes("manual")) return "manual";
  return "property";
}

function isPropertyCategory(category) {
  return ["villa", "homestay", "apartment", "property"].includes(String(category || "").toLowerCase());
}

function countsForOccupancy(row) {
  const status = String(row?.status || "").toLowerCase();
  return !status.includes("cancel") && !status.includes("refund");
}

function reportPeriodDays(filters = {}) {
  if (filters.from && filters.to) return Math.max(diffDays(filters.from, filters.to), 1);
  return 30;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function findLinkedCosting(booking, costings = []) {
  const refs = new Set([
    normalizeKey(booking?.inquiryId),
    normalizeKey(booking?.reference)
  ].filter(Boolean));

  const direct = costings.find((c) => refs.has(normalizeKey(c?.inquiryRef)));
  if (direct) return direct;

  // Safe fallback only when package + travel date uniquely identify one costing.
  const item = normalizeKey(booking?.itemName);
  const start = dateOnly(booking?.dateFrom);
  const matches = costings.filter((c) =>
    item && normalizeKey(c?.packageName) === item && (!start || !c?.travelStart || dateOnly(c.travelStart) === start)
  );
  return matches.length === 1 ? matches[0] : null;
}

function normalizeBooking(booking, costings = []) {
  const category = categoryOf(booking);
  const storageDays = diffDays(booking?.dateFrom, booking?.dateTo);
  const next = { ...booking, category };

  if (category === "tour") {
    const costing = findLinkedCosting(booking, costings);
    const costingDays = num(costing?.days);
    const hasCostingNights = costing && costing.nights !== undefined && costing.nights !== null && String(costing.nights) !== "";
    next.tourDays = costingDays > 0 ? costingDays : Math.max(storageDays, booking?.dateFrom ? 1 : 0);
    next.accommodationNights = hasCostingNights ? Math.max(0, num(costing.nights)) : null;
    next.propertyNights = 0;
    next.actualDateTo = storageDays > 0 ? addDays(booking.dateTo, -1) : dateOnly(booking.dateTo || booking.dateFrom);
    next.linkedCostingRef = costing?.reference || costing?.id || "";
  } else if (isPropertyCategory(category)) {
    next.tourDays = null;
    next.propertyNights = storageDays;
    next.accommodationNights = storageDays;
    next.actualDateTo = dateOnly(booking?.dateTo);
  } else {
    next.tourDays = null;
    next.propertyNights = 0;
    next.accommodationNights = null;
    next.actualDateTo = dateOnly(booking?.dateTo);
  }

  return next;
}

function activePropertyCount(properties = [], filterType = "all") {
  const active = properties.filter((p) => p?.active !== false && Number(p?.active ?? 1) !== 0);
  const type = String(filterType || "all").toLowerCase();
  if (type === "all") return active.length;
  if (!["villa", "homestay", "apartment", "property"].includes(type)) return 0;
  return active.filter((p) => {
    const pType = normalizeKey(p?.type);
    if (type === "property") return true;
    return pType === type || pType.includes(type);
  }).length;
}

function normalizePerformanceRows(rows = [], bookings = [], periodDays = 30) {
  return rows.map((row) => {
    const key = normalizeKey(row?.name);
    const related = bookings.filter((b) => normalizeKey(b?.itemName || b?.serviceType) === key && countsForOccupancy(b));
    const category = categoryOf({ ...row, ...(related[0] || {}) });

    if (category === "tour") {
      const tourDays = related.reduce((sum, b) => sum + num(b.tourDays), 0);
      const allNightsKnown = related.length > 0 && related.every((b) => b.accommodationNights !== null && b.accommodationNights !== undefined);
      const accommodationNights = allNightsKnown
        ? related.reduce((sum, b) => sum + num(b.accommodationNights), 0)
        : null;
      return { ...row, category, tourDays, accommodationNights, propertyNights: 0, occupancy: null };
    }

    if (isPropertyCategory(category)) {
      const propertyNights = related.reduce((sum, b) => sum + num(b.propertyNights), 0);
      const occupancy = periodDays ? Math.min(100, Math.round((propertyNights / periodDays) * 100)) : 0;
      return { ...row, category, tourDays: null, accommodationNights: propertyNights, propertyNights, occupancy };
    }

    return { ...row, category, tourDays: null, accommodationNights: null, propertyNights: 0, occupancy: null };
  });
}

export function normalizeReportState(state = {}, filters = {}, costings = [], properties = [], warnings = []) {
  const bookingDetails = (state.bookingDetails || []).map((b) => normalizeBooking(b, costings));
  const periodDays = reportPeriodDays(filters);
  const filterType = String(filters.type || "all").toLowerCase();
  const propertyBookings = bookingDetails.filter((b) => isPropertyCategory(b.category) && countsForOccupancy(b));
  const occupiedNights = propertyBookings.reduce((sum, b) => sum + num(b.propertyNights), 0);

  const propertyOnlyFilter = ["villa", "homestay", "apartment", "property"].includes(filterType);
  const occupancyApplicable = filterType === "all" || propertyOnlyFilter;
  let activeProperties = properties.length
    ? activePropertyCount(properties, filterType)
    : num(state?.occupancy?.activeProperties);

  if (!occupancyApplicable) activeProperties = 0;
  const availableNights = occupancyApplicable ? activeProperties * periodDays : 0;
  const occupancyRate = availableNights ? Math.round((occupiedNights / availableNights) * 100) : 0;

  return {
    ...state,
    reportWarnings: warnings,
    bookingDetails,
    propertyPerformance: normalizePerformanceRows(state.propertyPerformance || [], bookingDetails, periodDays),
    occupancy: occupancyApplicable
      ? { ...state.occupancy, applicable: true, activeProperties, occupiedNights, availableNights, rate: occupancyRate, periodDays }
      : { ...state.occupancy, applicable: false, activeProperties: 0, occupiedNights: 0, availableNights: 0, rate: 0, periodDays }
  };
}

function stat(label, value, sub = "") {
  return `<div class="v14-stat-card reports-stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub)}</small></div>`;
}

function progressBar(value, max) {
  const n = money(value);
  const m = Math.max(money(max), 1);
  const w = Math.max(0, Math.min(100, (n / m) * 100));
  return `<div class="reports-bar"><i style="width:${w}%"></i></div>`;
}

function statusBadge(status) {
  const s = String(status || "Pending").toLowerCase();
  let cls = "new";
  if (s.includes("book") || s.includes("paid") || s.includes("active")) cls = "booked";
  if (s.includes("quote") || s.includes("partial")) cls = "quoted";
  if (s.includes("cancel") || s.includes("refund")) cls = "cancelled";
  if (s.includes("close") || s.includes("complete")) cls = "closed";
  return `<span class="status-badge ${cls}">${escapeHtml(status || "Pending")}</span>`;
}

function emptyRow(cols, text) {
  return `<tr><td colspan="${cols}" class="empty-row">${escapeHtml(text)}</td></tr>`;
}

function durationLabel(b) {
  if (b.category === "tour") {
    const nights = b.accommodationNights === null || b.accommodationNights === undefined ? "—" : b.accommodationNights;
    return `${escapeHtml(b.tourDays || 0)} day${num(b.tourDays) === 1 ? "" : "s"} / ${escapeHtml(nights)} accom. night${num(nights) === 1 ? "" : "s"}`;
  }
  if (isPropertyCategory(b.category)) {
    return `${escapeHtml(b.propertyNights || 0)} night${num(b.propertyNights) === 1 ? "" : "s"}`;
  }
  return "-";
}

function bookingRows(rows = []) {
  if (!rows.length) return emptyRow(10, "No booking records found for selected filters.");
  return rows.map((b) => `<tr><td><strong>${escapeHtml(b.reference || b.id || "-")}</strong><br><small>${escapeHtml(b.serviceType || "")}</small></td><td>${escapeHtml(b.guestName || "Guest")}<br><small>${escapeHtml(b.guestMobile || "")}</small></td><td>${escapeHtml(b.itemName || "-")}</td><td>${fmtDate(b.dateFrom)} → ${fmtDate(b.actualDateTo || b.dateTo)}</td><td>${durationLabel(b)}</td><td>${escapeHtml(b.guests || "-")}</td><td>${fmtAmount(b.currency || "USD", b.totalAmount || 0)}</td><td>${fmtAmount(b.currency || "USD", b.paidAmount || 0)}</td><td>${fmtAmount(b.currency || "USD", b.outstanding || 0)}</td><td>${statusBadge(b.status || b.paymentStatus || "Booked")}</td></tr>`).join("");
}

function propertyRows(rows = [], currency = "USD") {
  if (!rows.length) return emptyRow(9, "No property or tour performance records found.");
  const maxRevenue = Math.max(...rows.map((x) => money(x.revenue)), 1);
  return rows.map((x) => {
    const tourDays = x.category === "tour" ? escapeHtml(x.tourDays || 0) : "—";
    const nights = x.accommodationNights === null || x.accommodationNights === undefined ? "—" : escapeHtml(x.accommodationNights);
    const occupancy = x.category === "tour" || !isPropertyCategory(x.category) ? "N/A" : pct(x.occupancy || 0);
    return `<tr><td><strong>${escapeHtml(x.name || "-")}</strong><br><small>${escapeHtml(x.type || x.category || "")}</small></td><td>${escapeHtml(x.bookings || 0)}</td><td>${tourDays}</td><td>${nights}</td><td>${escapeHtml(x.guests || 0)}</td><td>${fmtAmount(currency, x.revenue || 0)}${progressBar(x.revenue || 0, maxRevenue)}</td><td>${fmtAmount(currency, x.received || 0)}</td><td>${fmtAmount(currency, x.outstanding || 0)}</td><td>${escapeHtml(occupancy)}</td></tr>`;
  }).join("");
}

function monthlyRows(rows = [], currency = "USD") {
  if (!rows.length) return emptyRow(7, "No monthly trend data found.");
  const maxRevenue = Math.max(...rows.map((x) => money(x.revenue)), 1);
  return rows.map((x) => `<tr><td><strong>${escapeHtml(x.month || "-")}</strong></td><td>${escapeHtml(x.bookings || 0)}</td><td>${escapeHtml(x.inquiries || 0)}</td><td>${fmtAmount(currency, x.revenue || 0)}${progressBar(x.revenue || 0, maxRevenue)}</td><td>${fmtAmount(currency, x.received || 0)}</td><td>${fmtAmount(currency, x.refunds || 0)}</td><td>${fmtAmount(currency, x.outstanding || 0)}</td></tr>`).join("");
}

function inquiryRows(rows = []) {
  if (!rows.length) return emptyRow(6, "No inquiry analytics found.");
  return rows.map((x) => `<tr><td><strong>${escapeHtml(x.status || "-")}</strong></td><td>${escapeHtml(x.count || 0)}</td><td>${escapeHtml(x.property || 0)}</td><td>${escapeHtml(x.tour || 0)}</td><td>${escapeHtml(x.service || 0)}</td><td>${pct(x.conversion || 0)}</td></tr>`).join("");
}

function paymentRows(rows = [], currency = "USD") {
  if (!rows.length) return emptyRow(5, "No payment method records found.");
  const maxAmount = Math.max(...rows.map((x) => money(x.amount)), 1);
  return rows.map((x) => `<tr><td><strong>${escapeHtml(x.method || "Unknown")}</strong></td><td>${escapeHtml(x.count || 0)}</td><td>${fmtAmount(currency, x.amount || 0)}${progressBar(x.amount || 0, maxAmount)}</td><td>${fmtAmount(currency, x.refunds || 0)}</td><td>${fmtAmount(currency, money(x.amount || 0) - money(x.refunds || 0))}</td></tr>`).join("");
}

function activityRows(rows = [], currency = "USD") {
  if (!rows.length) return emptyRow(7, "No recent activity found.");
  return rows.map((x) => `<tr><td>${fmtDate(x.date || x.createdAt)}</td><td>${escapeHtml(x.type || "-")}</td><td><strong>${escapeHtml(x.reference || "-")}</strong></td><td>${escapeHtml(x.guestName || "Guest")}</td><td>${escapeHtml(x.itemName || "-")}</td><td>${fmtAmount(x.currency || currency, x.amount || 0)}</td><td>${statusBadge(x.status || x.type || "-")}</td></tr>`).join("");
}

function setFilterValue(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

export function readReportFilters() {
  return {
    type: document.getElementById("reportTypeFilter")?.value || "all",
    from: document.getElementById("reportDateFrom")?.value || "",
    to: document.getElementById("reportDateTo")?.value || "",
    status: document.getElementById("reportStatusFilter")?.value || "all"
  };
}

function warningHtml(warnings = []) {
  if (!warnings.length) return "";
  return `<div class="admin-section reports-card"><strong>Report data note</strong><br>${warnings.map((x) => escapeHtml(x)).join("<br>")}</div>`;
}

export function renderReports(root, state, filters = {}) {
  const summary = state.summary || {};
  const revenue = state.revenue || {};
  const bookings = state.bookings || {};
  const inquiries = state.inquiries || {};
  const occupancy = state.occupancy || {};
  const payments = state.payments || {};
  const currency = summary.currency || revenue.currency || "USD";
  const occupancyCard = occupancy.applicable === false
    ? stat("Property Occupancy", "N/A", "Not applicable for this report type")
    : stat("Property Occupancy", `${occupancy.rate || 0}%`, `${occupancy.occupiedNights || 0}/${occupancy.availableNights || 0} property nights`);

  root.innerHTML = `
    <div class="reports-toolbar"><select id="reportTypeFilter"><option value="all">All Types</option><option value="villa">Villas</option><option value="homestay">Homestays</option><option value="apartment">Apartments</option><option value="tour">Tours</option><option value="manual">Manual</option></select><select id="reportStatusFilter"><option value="all">All Status</option><option value="booked">Booked</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select><input id="reportDateFrom" type="date" /><input id="reportDateTo" type="date" /><button class="v14-refresh" type="button" onclick="window.renderReportsModule()">Run Report</button><button class="v14-refresh" type="button" onclick="window.exportReportsCSV()">Export CSV</button><button class="v14-refresh ghost" type="button" onclick="window.print()">Print</button></div>
    ${warningHtml(state.reportWarnings || [])}
    <div class="v14-dashboard-grid reports-kpi-grid">${stat("Total Revenue", fmtAmount(currency, revenue.totalBookingValue || 0), "Booking value")}${stat("Received", fmtAmount(currency, revenue.totalReceived || 0), "Payments collected")}${stat("Outstanding", fmtAmount(currency, revenue.outstanding || 0), "Balance to collect")}${stat("Refunds", fmtAmount(currency, revenue.totalRefunded || 0), "Refunds issued")}${stat("Bookings", summary.totalBookings || 0, `${bookings.booked || 0} booked`)}${stat("Inquiries", summary.totalInquiries || 0, `${summary.conversionRate || 0}% conversion`)}${occupancyCard}${stat("Average Booking", fmtAmount(currency, revenue.averageBookingValue || 0), "Confirmed bookings")}</div>
    <div class="reports-grid-two"><section class="admin-section reports-card"><div class="section-head compact"><div><h2>Revenue Summary</h2><p>Payment, refund and outstanding position.</p></div></div><div class="reports-mini-grid"><div><span>Gross Booking</span><strong>${fmtAmount(currency, revenue.totalBookingValue || 0)}</strong></div><div><span>Net Received</span><strong>${fmtAmount(currency, money(revenue.totalReceived || 0) - money(revenue.totalRefunded || 0))}</strong></div><div><span>Payments</span><strong>${fmtAmount(currency, revenue.totalReceived || 0)}</strong></div><div><span>Outstanding</span><strong>${fmtAmount(currency, revenue.outstanding || 0)}</strong></div></div></section><section class="admin-section reports-card"><div class="section-head compact"><div><h2>Booking Summary</h2><p>Status breakdown for selected period.</p></div></div><div class="reports-mini-grid"><div><span>Booked</span><strong>${escapeHtml(bookings.booked || 0)}</strong></div><div><span>Upcoming</span><strong>${escapeHtml(bookings.upcoming || 0)}</strong></div><div><span>Completed</span><strong>${escapeHtml(bookings.completed || 0)}</strong></div><div><span>Cancelled</span><strong>${escapeHtml(bookings.cancelled || 0)}</strong></div></div></section></div>
    <section class="admin-section reports-card"><div class="section-head compact"><div><h2>Monthly Revenue / Booking Trend</h2><p>Revenue, collections and booking volume by month.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Month</th><th>Bookings</th><th>Inquiries</th><th>Revenue</th><th>Received</th><th>Refunds</th><th>Outstanding</th></tr></thead><tbody>${monthlyRows(state.monthlyTrend || [], currency)}</tbody></table></div></section>
    <section class="admin-section reports-card"><div class="section-head compact"><div><h2>Property / Tour Performance</h2><p>Tour operating days are separate from accommodation/property nights. Property occupancy excludes tour days.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Item</th><th>Bookings</th><th>Tour Days</th><th>Accommodation / Property Nights</th><th>Guests</th><th>Revenue</th><th>Received</th><th>Outstanding</th><th>Property Occupancy</th></tr></thead><tbody>${propertyRows(state.propertyPerformance || [], currency)}</tbody></table></div></section>
    <div class="reports-grid-two"><section class="admin-section reports-card"><div class="section-head compact"><div><h2>Inquiry Analytics</h2><p>Inquiry pipeline and conversion.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Status</th><th>Total</th><th>Property</th><th>Tour</th><th>Service</th><th>Conversion</th></tr></thead><tbody>${inquiryRows(inquiries.byStatus || [])}</tbody></table></div></section><section class="admin-section reports-card"><div class="section-head compact"><div><h2>Payment Methods</h2><p>Collection by cash, bank, card and online payments.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Method</th><th>Count</th><th>Payments</th><th>Refunds</th><th>Net</th></tr></thead><tbody>${paymentRows(payments.byMethod || [], currency)}</tbody></table></div></section></div>
    <section class="admin-section reports-card"><div class="section-head compact"><div><h2>Booking Detail Report</h2><p>Detailed booking financial list for selected filters.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Reference</th><th>Guest</th><th>Item</th><th>Dates</th><th>Duration</th><th>Guests</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>${bookingRows(state.bookingDetails || [])}</tbody></table></div></section>
    <section class="admin-section reports-card"><div class="section-head compact"><div><h2>Latest Activity</h2><p>Latest bookings, inquiries, payments and refunds.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Guest</th><th>Item</th><th>Amount</th><th>Status</th></tr></thead><tbody>${activityRows(state.latestActivity || [], currency)}</tbody></table></div></section>`;

  setFilterValue("reportTypeFilter", filters.type || "all");
  setFilterValue("reportStatusFilter", filters.status || "all");
  setFilterValue("reportDateFrom", filters.from || "");
  setFilterValue("reportDateTo", filters.to || "");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildReportsCsv(state = {}) {
  const rows = state.bookingDetails || [];
  const headers = [
    "Reference", "Guest", "Email", "Mobile", "Item", "Service Type",
    "Date From", "Date To (Actual)", "Guests", "Tour Days", "Accommodation / Property Nights",
    "Currency", "Total", "Paid", "Refund", "Outstanding", "Booking Status", "Payment Status"
  ];
  const body = rows.map((b) => [
    b.reference || b.id || "",
    b.guestName || "",
    b.guestEmail || "",
    b.guestMobile || "",
    b.itemName || "",
    b.serviceType || "",
    dateOnly(b.dateFrom),
    dateOnly(b.actualDateTo || b.dateTo),
    b.guests || "",
    b.category === "tour" ? b.tourDays : "",
    b.accommodationNights === null || b.accommodationNights === undefined ? "" : b.accommodationNights,
    b.currency || state?.summary?.currency || "USD",
    b.totalAmount || "0",
    b.paidAmount || "0",
    b.refundAmount || "0",
    b.outstanding || "0",
    b.status || "",
    b.paymentStatus || ""
  ].map(csvEscape).join(","));
  return [headers.map(csvEscape).join(","), ...body].join("\n");
}

export function renderReportsError(root, message) {
  root.innerHTML = `<div class="section-head"><div><h2>Reports</h2><p>${escapeHtml(message || "Reports load failed")}</p></div><button class="v14-refresh" type="button" onclick="window.renderReportsModule()">Retry</button></div>`;
}
