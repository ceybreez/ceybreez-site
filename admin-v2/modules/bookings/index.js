/* =========================
   BOOKINGS MANAGEMENT
========================= */


function isManualBooking(item){
  return String(item.reference || "").startsWith("MAN-") ||
         String(item.inquiryId || "").startsWith("MAN-") ||
         String(item.serviceType || "").toLowerCase().includes("manual booking");
}

function bookingInquiryId(item){
  return item?.inquiryId || item?.reference || "";
}

function bookingRemarkText(booking){
  const ref = booking.reference || booking.id || "";
  const property = booking.itemName || "-";
  const guest = booking.guestName || "-";

  return `Booking Remark
Reference: ${ref}
Property / Tour: ${property}
Guest: ${guest}`;
}

async function saveBookingRemark(bookingId){
  const booking = allBookings.find(x => String(x.id) === String(bookingId));
  if(!booking) return alert("Booking not found");

  const input = document.getElementById(`bookingRemark-${bookingId}`);
  const noteText = (input?.value || "").trim();

  if(!noteText){
    alert("Please type a remark first.");
    return;
  }

  const inquiryId = bookingInquiryId(booking);

  if(!inquiryId){
    alert("No related inquiry found for this booking.");
    return;
  }

  const nowText = new Date().toLocaleString("en-GB");

  const note = `${bookingRemarkText(booking)}

Remark added from Booking Page
Date/Time: ${nowText}

${noteText}`;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${inquiryId}/notes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ note })
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Remark save failed");
    return;
  }

  alert("Remark saved to Inquiry Admin Notes");

  if(input) input.value = "";

  await loadInquiries();
}

async function openInquiryFromBooking(bookingId){
  const booking = allBookings.find(x => String(x.id) === String(bookingId));
  if(!booking) return alert("Booking not found");

  const inquiryId = bookingInquiryId(booking);

  await loadInquiries();

  const inquiry = allInquiries.find(x =>
    String(x.id) === String(inquiryId) ||
    String(x.reference) === String(booking.reference)
  );

  if(!inquiry){
    alert("Related inquiry not found. It may have been deleted.");
    return;
  }

  showTab("inquiriesTab");

  setTimeout(() => {
    openInquiryModal(inquiry.id);
  }, 200);
}

function getMatrixDates(daysCount){
  const dates = [];
  const today = new Date();

  for(let i = 0; i < daysCount; i++){
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    dates.push(toDateInputValue(d));
  }

  return dates;
}

function formatMatrixDay(dateValue){
  const d = new Date(dateValue + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function getBookingForPropertyDate(propertyName, dateValue){
  return allBookings.find(b =>
    normalizeStatus(b.status) === "booked" &&
    String(b.itemName || "").trim().toLowerCase() === String(propertyName || "").trim().toLowerCase() &&
    bookingCoversDate(b, dateValue)
  );
}

function renderAvailabilityMatrix(){
  const box = document.getElementById("availabilityMatrix");
  if(!box) return;

  const daysCount = Number(document.getElementById("matrixDaysFilter")?.value || 30);
  const selectedType = (document.getElementById("matrixTypeFilter")?.value || "all").toLowerCase();

  const properties = (window.allProperties || []).filter(p => {
    const type = String(p.type || "").toLowerCase();
    return selectedType === "all" || type === selectedType;
  });

  const dates = getMatrixDates(daysCount);

  if(!properties.length){
    box.innerHTML = `<div class="empty-row">No properties found for selected type.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="matrix-property-head">Property / Tour</th>
            ${dates.map(d => `<th>${formatMatrixDay(d)}</th>`).join("")}
            <th>Occupied</th>
            <th>Available</th>
            <th>Occupancy</th>
          </tr>
        </thead>
        <tbody>
          ${properties.map(p => {
            let bookedDays = 0;

            const cells = dates.map(d => {
              const booking = getBookingForPropertyDate(p.name, d);

              if(booking) {
                bookedDays++;
                return `
                  <td class="matrix-cell booked"
                      title="${escapeHtml(booking.reference || "")} - ${escapeHtml(booking.guestName || "")}"
                      onclick="openBookingDetails('${escapeJs(booking.id)}')">
                    B
                  </td>
                `;
              }

              return `<td class="matrix-cell free">A</td>`;
            }).join("");

            const availableDays = dates.length - bookedDays;
            const occupancy = dates.length ? Math.round((bookedDays / dates.length) * 100) : 0;

            return `
              <tr>
                <td class="matrix-property">
                  <strong>${escapeHtml(p.name || "-")}</strong>
                  <small>${escapeHtml(p.type || "")}</small>
                </td>
                ${cells}
                <td><strong>${bookedDays}</strong></td>
                <td><strong>${availableDays}</strong></td>
                <td><strong>${occupancy}%</strong></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function reportDateInRange(value, from, to){
  const d = String(value || "").slice(0,10);
  if(!d) return true;
  if(from && d < from) return false;
  if(to && d > to) return false;
  return true;
}

function getFilteredReportBookings(){
  const type = (document.getElementById("reportTypeFilter")?.value || "all").toLowerCase();
  const from = document.getElementById("reportDateFrom")?.value || "";
  const to = document.getElementById("reportDateTo")?.value || "";

  return allBookings.filter(b => {
    const typeText = `${b.serviceType || ""} ${b.itemName || ""}`.toLowerCase();
    const typeMatch = type === "all" || typeText.includes(type);
    const dateValue = b.createdAt || b.created_at || b.dateFrom || "";
    return typeMatch && reportDateInRange(dateValue, from, to);
  });
}

function getFilteredReportInquiries(){
  const type = (document.getElementById("reportTypeFilter")?.value || "all").toLowerCase();
  const from = document.getElementById("reportDateFrom")?.value || "";
  const to = document.getElementById("reportDateTo")?.value || "";

  return allInquiries.filter(i => {
    const typeText = `${i.serviceType || ""} ${i.itemName || ""}`.toLowerCase();
    const typeMatch = type === "all" || typeText.includes(type);
    const dateValue = i.createdAt || i.created_at || i.dateFrom || "";
    return typeMatch && reportDateInRange(dateValue, from, to);
  });
}

function renderReports(){
  const summary = document.getElementById("reportSummaryCards");
  if(!summary) return;

  const bookings = getFilteredReportBookings();
  const inquiries = getFilteredReportInquiries();

  const booked = bookings.filter(b => normalizeStatus(b.status) === "booked").length;
  const cancelled = bookings.filter(b => normalizeStatus(b.status) === "cancelled").length;
  const closed = bookings.filter(b => normalizeStatus(b.status) === "closed").length;

  summary.innerHTML = `
    <div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${inquiries.length}</div></div>
    <div class="dashboard-card card-booked"><h3>Total Bookings</h3><div class="value">${bookings.length}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${booked}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${cancelled}</div></div>
    <div class="dashboard-card"><h3>Closed</h3><div class="value">${closed}</div></div>
  `;

  renderPropertyPerformanceReport(bookings);
  renderStatusSummaryReport(inquiries, bookings);
  renderMonthlyBookingReport(bookings);
  renderLatestGuestActivityReport(inquiries, bookings);
}

function renderPropertyPerformanceReport(bookings){
  const box = document.getElementById("propertyPerformanceReport");
  if(!box) return;

  const map = {};

  bookings.forEach(b => {
    const key = b.itemName || "Unknown";
    if(!map[key]) map[key] = { total:0, booked:0, cancelled:0, closed:0 };
    map[key].total++;
    const s = normalizeStatus(b.status);
    if(s === "booked") map[key].booked++;
    if(s === "cancelled") map[key].cancelled++;
    if(s === "closed") map[key].closed++;
  });

  const rows = Object.entries(map).sort((a,b) => b[1].total - a[1].total);

  if(!rows.length){
    box.innerHTML = `<p>No booking data.</p>`;
    return;
  }

  box.innerHTML = `
    <table class="report-table">
      <thead><tr><th>Property</th><th>Total</th><th>Booked</th><th>Cancelled</th><th>Closed</th></tr></thead>
      <tbody>
        ${rows.map(([name, x]) => `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${x.total}</td>
            <td>${x.booked}</td>
            <td>${x.cancelled}</td>
            <td>${x.closed}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderStatusSummaryReport(inquiries, bookings){
  const box = document.getElementById("statusSummaryReport");
  if(!box) return;

  const statuses = ["new","contacted","quoted","booked","cancelled","closed"];

  box.innerHTML = `
    <table class="report-table">
      <thead><tr><th>Status</th><th>Inquiries</th><th>Bookings</th></tr></thead>
      <tbody>
        ${statuses.map(s => `
          <tr>
            <td>${s.charAt(0).toUpperCase() + s.slice(1)}</td>
            <td>${inquiries.filter(x => normalizeStatus(x.status) === s).length}</td>
            <td>${bookings.filter(x => normalizeStatus(x.status) === s).length}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderMonthlyBookingReport(bookings){
  const box = document.getElementById("monthlyBookingReport");
  if(!box) return;

  const map = {};
  bookings.forEach(b => {
    const d = String(b.createdAt || b.created_at || b.dateFrom || "").slice(0,7);
    if(!d) return;
    map[d] = (map[d] || 0) + 1;
  });

  const rows = Object.entries(map).sort();

  if(!rows.length){
    box.innerHTML = `<p>No monthly booking data.</p>`;
    return;
  }

  const max = Math.max(...rows.map(x => x[1]));

  box.innerHTML = `
    <div class="chart-bars">
      ${rows.map(([month, count]) => `
        <div class="chart-row">
          <span>${month}</span>
          <div class="bar-wrap">
            <div class="bar" style="width:${max ? (count / max) * 100 : 0}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderLatestGuestActivityReport(inquiries, bookings){
  const box = document.getElementById("latestGuestActivityReport");
  if(!box) return;

  const activity = [
    ...inquiries.map(i => ({
      type:"Inquiry",
      reference:i.reference,
      guest:i.guestName,
      item:i.itemName,
      status:i.status,
      date:i.createdAt || i.created_at || i.dateFrom || ""
    })),
    ...bookings.map(b => ({
      type:"Booking",
      reference:b.reference,
      guest:b.guestName,
      item:b.itemName,
      status:b.status,
      date:b.createdAt || b.created_at || b.dateFrom || ""
    }))
  ].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,10);

  if(!activity.length){
    box.innerHTML = `<p>No activity found.</p>`;
    return;
  }

  box.innerHTML = `
    <table class="report-table">
      <thead><tr><th>Type</th><th>Reference</th><th>Guest</th><th>Item</th><th>Status</th></tr></thead>
      <tbody>
        ${activity.map(x => `
          <tr>
            <td>${escapeHtml(x.type)}</td>
            <td>${escapeHtml(x.reference || "-")}</td>
            <td>${escapeHtml(x.guest || "-")}</td>
            <td>${escapeHtml(x.item || "-")}</td>
            <td>${escapeHtml(x.status || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function exportReportCSV(){
  const bookings = getFilteredReportBookings();

  if(!bookings.length){
    alert("No report data to export");
    return;
  }

  const rows = bookings.map(b => ({
    Reference: b.reference || "",
    Type: b.serviceType || "",
    Property: b.itemName || "",
    Guest: b.guestName || "",
    Email: b.guestEmail || "",
    Mobile: b.guestMobile || "",
    CheckIn: b.dateFrom || "",
    CheckOut: b.dateTo || "",
    Guests: b.guests || "",
    Status: b.status || "",
    CreatedAt: b.createdAt || b.created_at || ""
  }));

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h]).replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ceybreez-booking-report.csv";
  a.click();
}


async function loadBookings() {
  const tableBody = document.getElementById("bookingTableBody");
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading bookings...</td></tr>`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load bookings");

    allBookings = data || [];
    const visibleBookings = allBookings.filter(x => getBookingCategory(x) === currentBookingView);
    renderBookingStats(visibleBookings);
    applyBookingFilters();
    renderReports();
  } catch (err) {
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="9" class="empty-row">${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function applyBookingFilters() {
  const search = (document.getElementById("bookingSearch")?.value || "").toLowerCase();
  const status = (document.getElementById("bookingStatusFilter")?.value || "all").toLowerCase();
  const type = (document.getElementById("bookingTypeFilter")?.value || "all").toLowerCase();

  const filtered = allBookings.filter(item => {
    if (getBookingCategory(item) !== currentBookingView) return false;
    const statusMatch = status === "all" || normalizeStatus(item.status) === status;
    const typeText = `${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();
    const typeMatch = type === "all" || typeText.includes(type);
    const searchText = `
      ${item.id || ""}
      ${item.reference || ""}
      ${item.itemName || ""}
      ${item.serviceType || ""}
      ${item.guestName || ""}
      ${item.guestEmail || ""}
      ${item.guestMobile || ""}
    `.toLowerCase();

    const mode = v6BookingMode || document.getElementById("v6BookingMode")?.value || "all";
    const modeMatch = mode === "all" || classifyBookingItem(item) === mode;

    return modeMatch && statusMatch && typeMatch && (!search || searchText.includes(search));
  });

  renderBookingsTable(filtered);
  renderBookingsCalendar(filtered);
  renderAvailabilityMatrix();
}

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>
  `;
}

function renderBookingsTable(data) {
  const tbody = document.getElementById("bookingTableBody");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const status = item.status || "Booked";
    const statusClass = normalizeStatus(status);

    return `
      <tr onclick="openBookingDetails('${escapeJs(item.id)}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(item.serviceType || "-")}</td>
        <td>${escapeHtml(item.itemName || "-")}</td>
        <td>
          <strong>${escapeHtml(item.guestName || "-")}</strong><br>
          <small>${escapeHtml(item.guestEmail || "")}</small><br>
          <small>${escapeHtml(item.guestMobile || "")}</small>
        </td>
        <td>${escapeHtml(item.dateFrom || "-")}</td>
        <td>${escapeHtml(item.dateTo || "-")}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(status)}</span></td>
        <td onclick="event.stopPropagation();" class="booking-remark-cell">
          <div class="booking-remark-box">
            <input id="bookingRemark-${escapeHtml(item.id)}" placeholder="Add remark / note..." />
            <button type="button" onclick="saveBookingRemark('${escapeJs(item.id)}')">Save Note</button>
          </div>
        </td>
        <td onclick="event.stopPropagation();">
          <button class="mini-btn" onclick="openInquiryFromBooking('${escapeJs(item.id)}')">
            Manage in Inquiry
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function changeBookingMonth(offset) {
  bookingCalendarDate.setMonth(bookingCalendarDate.getMonth() + offset);
  applyBookingFilters();
}

function renderBookingsCalendar(data) {
  const box = document.getElementById("bookingCalendar");
  const title = document.getElementById("bookingCalendarTitle");
  const detailsBox = document.getElementById("bookingDetailsBox");

  if (detailsBox) detailsBox.innerHTML = "";
  if (!box || !title) return;

  const year = bookingCalendarDate.getFullYear();
  const month = bookingCalendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();

  title.textContent = firstDay.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric"
  });

  const activeBookings = data.filter(x => normalizeStatus(x.status) === "booked");

  let html = `
    <div class="calendar-week-head">Sun</div>
    <div class="calendar-week-head">Mon</div>
    <div class="calendar-week-head">Tue</div>
    <div class="calendar-week-head">Wed</div>
    <div class="calendar-week-head">Thu</div>
    <div class="calendar-week-head">Fri</div>
    <div class="calendar-week-head">Sat</div>
  `;

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateValue = toDateInputValue(new Date(year, month, day));
    const dayBookings = activeBookings.filter(b => bookingCoversDate(b, dateValue));
    const bookedCount = dayBookings.length;

    html += `
      <div class="calendar-day ${bookedCount ? "booked-day clickable-row" : ""}"
           ${bookedCount ? `onclick="openBookingDateDetails('${dateValue}')"` : ""}>
        <strong>${day}</strong>

        ${
          bookedCount
            ? `<div class="booked-indicator">${bookedCount} Booked</div>`
            : ""
        }

        ${dayBookings.slice(0, 2).map(b => `
          <span title="${escapeHtml(b.itemName || "")}"
                onclick="event.stopPropagation(); openBookingDetails('${escapeJs(b.id)}')">
            ${escapeHtml(b.itemName || "Booking")}
          </span>
        `).join("")}

        ${dayBookings.length > 2 ? `<small>+${dayBookings.length - 2} more</small>` : ""}
      </div>
    `;
  }

  box.innerHTML = html;
}

function bookingCoversDate(booking, dateValue) {
  if (!booking.dateFrom || !booking.dateTo) return false;
  return dateValue >= booking.dateFrom && dateValue < booking.dateTo;
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function cancelBooking(id) {
  if (!confirm("Cancel this booking? The dates will become available on the main website.")) return;

  const res = await fetch(`${API_BASE}/api/admin/bookings/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status: "Cancelled" })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Booking cancel failed");
    return;
  }

  alert("Booking cancelled");
  loadBookings();
  loadInquiries();
}

async function createManualBooking(e) {
  e.preventDefault();

  const reference = `MAN-${Date.now()}`;
  const itemName = document.getElementById("manualItemName").value.trim();
  const serviceType = document.getElementById("manualServiceType").value;
  const guestName = document.getElementById("manualGuestName").value.trim();
  const guestEmail = document.getElementById("manualGuestEmail").value.trim();
  const guestMobile = document.getElementById("manualGuestMobile").value.trim();
  const dateFrom = document.getElementById("manualDateFrom").value;
  const dateTo = document.getElementById("manualDateTo").value;
  const guests = document.getElementById("manualGuests").value.trim();

  if (!itemName || !serviceType || !guestName || !dateFrom || !dateTo) {
    alert("Please fill property/tour, type, guest name, check-in and check-out dates.");
    return;
  }

  if (new Date(dateFrom) >= new Date(dateTo)) {
    alert("Check-out date must be after check-in date.");
    return;
  }
  const conflict = allBookings.find(b => {
  return normalizeStatus(b.status) === "booked" &&
    String(b.itemName || "").trim().toLowerCase() === itemName.trim().toLowerCase() &&
    new Date(dateFrom) < new Date(b.dateTo) &&
    new Date(dateTo) > new Date(b.dateFrom);
});

if (conflict) {
  alert(
    `This property is already booked for selected dates.\n\n` +
    `Existing Booking:\n` +
    `${conflict.itemName}\n` +
    `${conflict.dateFrom} to ${conflict.dateTo}`
  );
  return;
}

  const res = await fetch(`${API_BASE}/api/admin/bookings`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      inquiryId: reference,
      reference,
      itemName,
      serviceType,
      guestName,
      guestEmail,
      guestMobile,
      dateFrom,
      dateTo,
      guests,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      dayRate: "",
      totalDays: calcBookingNights(dateFrom, dateTo),
      totalAmount: "",
      adminMessage: "Manual booking created from admin booking page",
      message: "Manual booking created from admin booking page"
    })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Manual booking failed");
    return;
  }

  alert("Manual booking saved");

e.target.reset();

await loadBookings();
await loadInquiries();

const savedBooking = allBookings.find(b =>
  String(b.reference || "") === reference
);

if (savedBooking) {
  openBookingDetails(savedBooking.id);
}
}

function escapeJs(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}

function openBookingDetails(id){

  const booking = allBookings.find(x => String(x.id) === String(id));
  if(!booking) return;

  const box = document.getElementById("bookingDetailsBox");
  if(!box) return;

  box.innerHTML = `
    <div class="booking-detail-card">
      <h3>${escapeHtml(booking.reference || booking.id || "Booking Details")}</h3>

      <p><b>Property:</b> ${escapeHtml(booking.itemName || "-")}</p>
      <p><b>Type:</b> ${escapeHtml(booking.serviceType || "-")}</p>
      <p><b>Guest:</b> ${escapeHtml(booking.guestName || "-")}</p>
      <p><b>Email:</b> ${escapeHtml(booking.guestEmail || "-")}</p>
      <p><b>Mobile:</b> ${escapeHtml(booking.guestMobile || "-")}</p>
      <p><b>Check In:</b> ${escapeHtml(booking.dateFrom || "-")}</p>
      <p><b>Check Out:</b> ${escapeHtml(booking.dateTo || "-")}</p>
      <p><b>Check-in Time:</b> ${escapeHtml(booking.checkInTime || "-")}</p>
      <p><b>Check-out Time:</b> ${escapeHtml(booking.checkOutTime || "-")}</p>
      <p><b>Guests:</b> ${escapeHtml(booking.guests || "-")}</p>
      <p><b>Total Nights:</b> ${escapeHtml(booking.totalDays || "-")}</p>
      <p><b>Day Rate:</b> ${escapeHtml(booking.dayRate || "-")}</p>
      <p><b>Total Amount:</b> ${escapeHtml(booking.totalAmount || "-")}</p>
      <p><b>Status:</b> ${escapeHtml(booking.status || "-")}</p>

      <div class="booking-detail-remark">
        <h4>Add Remark to Inquiry Notes</h4>
        <textarea id="bookingRemark-${escapeHtml(booking.id)}" placeholder="Type booking remark here..."></textarea>
        <button type="button" onclick="saveBookingRemark('${escapeJs(booking.id)}')">
          Save Remark
        </button>
      </div>

      <div class="booking-detail-actions">
        <button type="button" onclick="openInquiryFromBooking('${escapeJs(booking.id)}')">
          Manage in Inquiry
        </button>
      </div>
    </div>
  `;

  box.scrollIntoView({ behavior:"smooth", block:"center" });
}

function openBookingDateDetails(dateValue) {
  const dayBookings = allBookings.filter(b =>
    normalizeStatus(b.status) === "booked" && bookingCoversDate(b, dateValue)
  );

  if (!dayBookings.length) return;

  showBookingDetailsModal(
    dayBookings,
    `Bookings on ${formatDate(dateValue)}`
  );
}

function showBookingDetailsModal(bookings, title) {
  let modal = document.getElementById("bookingDetailsModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "bookingDetailsModal";
    modal.className = "modal hidden";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content inquiry-modal booking-details-popup">
      <div class="modal-header">
        <h2>${escapeHtml(title || "Booking Details")}</h2>
        <button onclick="closeBookingDetailsModal()">✕</button>
      </div>

      <div class="modal-grid">
        ${bookings.map(b => `
          <div class="modal-section">
            <h4>${escapeHtml(b.itemName || "Booking")}</h4>
            <p><b>Reference:</b> ${escapeHtml(b.reference || b.id || "-")}</p>
            <p><b>Type:</b> ${escapeHtml(b.serviceType || "-")}</p>
            <p><b>Guest:</b> ${escapeHtml(b.guestName || "-")}</p>
            <p><b>Email:</b> ${escapeHtml(b.guestEmail || "-")}</p>
            <p><b>Mobile:</b> ${escapeHtml(b.guestMobile || "-")}</p>
            <p><b>Check In:</b> ${escapeHtml(b.dateFrom || "-")}</p>
            <p><b>Check Out:</b> ${escapeHtml(b.dateTo || "-")}</p>
            <p><b>Guests:</b> ${escapeHtml(b.guests || "-")}</p>
            <p><b>Status:</b> <span class="status-badge status-${normalizeStatus(b.status)}">${escapeHtml(b.status || "Booked")}</span></p>
            <button type="button" onclick="openInquiryFromBooking('${escapeJs(b.id)}'); closeBookingDetailsModal();">Manage in Inquiry</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
}

function closeBookingDetailsModal() {
  document.getElementById("bookingDetailsModal")?.classList.add("hidden");
}

async function cancelBookingFromModal(id) {
  await cancelBooking(id);
  closeBookingDetailsModal();
}

let currentInquiry = null;

function openInquiryModal(id){

  const inquiry = allInquiries.find(
    x => String(x.id) === String(id)
  );

  if(!inquiry) return;

  currentInquiry = inquiry;

  const selectedItem =
    inquiry.itemName || getItemNameFromService(inquiry.serviceType) || "-";

  document.getElementById("inquiryModal").classList.remove("hidden");

  document.getElementById("inquiryModalBody").innerHTML = `
    <div class="modal-summary-head">
      <div>
        <h3>${escapeHtml(inquiry.reference || "-")}</h3>
        <p>${escapeHtml(inquiry.serviceType || "-")}</p>
      </div>
      <span class="status-badge status-${normalizeStatus(inquiry.status)}">
        ${escapeHtml(inquiry.status || "New")}
      </span>
    </div>

    <div class="modal-section action-panel">
      <h4>Admin Actions</h4>

      <div class="inquiry-actions">
  <button onclick="openGuestWhatsApp()">WhatsApp</button>
  <button onclick="emailGuest()">Email</button>
  <button onclick="copyInquiryDetails()">Copy</button>
  <button onclick="confirmBooking(document.getElementById('sendStatusEmail')?.checked ?? true)">Confirm Booking</button>
  <button class="delete-btn" onclick="deleteCurrentInquiry()">Delete Inquiry</button>
</div>
      <div class="status-action-row">
        <select id="modalInquiryStatus">
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Quoted">Quoted</option>
          <option value="Booked">Booked</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <label class="send-email-check">
          <input type="checkbox" id="sendStatusEmail" checked>
          Send email to guest
        </label>

        <button onclick="updateInquiryStatus(currentInquiry.id, document.getElementById('modalInquiryStatus').value, document.getElementById('sendStatusEmail').checked)">
          Update Status
        </button>
      </div>
    </div>

    ${renderBookingConfirmPanel(inquiry)}

    <div class="modal-grid">
      <div class="modal-section">
        <h4>Guest Details</h4>
        <p><b>Name:</b> ${escapeHtml(inquiry.guestName || "-")}</p>
        <p><b>Email:</b> ${escapeHtml(inquiry.guestEmail || "-")}</p>
        <p><b>Mobile:</b> ${escapeHtml(inquiry.guestMobile || "-")}</p>
        <p><b>Country:</b> ${escapeHtml(inquiry.guestCountry || "-")}</p>
        <p><b>Guests:</b> ${escapeHtml(inquiry.guests || "-")}</p>
      </div>

      <div class="modal-section">
        <h4>Inquiry / Booking Details</h4>
        <p><b>Reference:</b> ${escapeHtml(inquiry.reference || "-")}</p>
        <p><b>Inquiry Date:</b> ${formatDate(inquiry.createdAt || inquiry.created_at)}</p>
        <p><b>Type:</b> ${escapeHtml(inquiry.serviceType || "-")}</p>
        <p><b>Selected Property / Tour:</b> ${escapeHtml(selectedItem)}</p>
        <p><b>Check In:</b> ${escapeHtml(inquiry.dateFrom || "-")}</p>
        <p><b>Check Out:</b> ${escapeHtml(inquiry.dateTo || "-")}</p>
      </div>
    </div>

    <div class="modal-section">
      <h4>Customer Message</h4>
      <div class="message-box">
        ${escapeHtml(inquiry.message || "No message provided")}
      </div>
    </div>
  `;

  document.getElementById("modalInquiryStatus").value = inquiry.status || "New";

  ["bookingConfirmDayRate","bookingConfirmChildRate","bookingConfirmAdultCount","bookingConfirmChildCount","bookingConfirmDiscount","bookingConfirmCurrency"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateBookingConfirmTotals);
  });
  updateBookingConfirmTotals();

  loadInquiryNotes();
}


function renderBookingConfirmPanel(inquiry){
  const isTour = isTourInquiry(inquiry);
  if(isTour){
    return `
    <div class="modal-section booking-confirm-panel">
      <h4>Tour Quote / Booking Details</h4>
      <div class="booking-confirm-grid tour-confirm-grid">
        <label>Tour Date<input id="bookingConfirmTourDate" type="date" value="${escapeHtml(inquiry.dateFrom || "")}"></label>
        <label>Pickup Time<input id="bookingConfirmCheckInTime" type="time" value="08:00"></label>
        <label>Pickup Location<input id="bookingConfirmPickupLocation" placeholder="Hotel / Airport / Location"></label>
        <label>Currency<select id="bookingConfirmCurrency"><option>LKR</option><option>USD</option><option>EUR</option><option>OMR</option></select></label>
        <label>Adult Rate<input id="bookingConfirmDayRate" type="number" min="0" step="0.01" placeholder="Adult rate"></label>
        <label>Child Rate<input id="bookingConfirmChildRate" type="number" min="0" step="0.01" placeholder="Child rate"></label>
        <label>Adults<input id="bookingConfirmAdultCount" type="number" min="0" value="${escapeHtml(inquiry.guests || "1")}"></label>
        <label>Children<input id="bookingConfirmChildCount" type="number" min="0" value="0"></label>
        <label>Discount %<input id="bookingConfirmDiscount" type="number" min="0" max="100" step="0.01" value="0"></label>
        <label>Total Amount<input id="bookingConfirmTotalAmount" readonly></label>
        <input id="bookingConfirmNights" type="hidden" value="1">
        <input id="bookingConfirmCheckOutTime" type="hidden" value="">
      </div>
      <label>Admin Message to Guest<textarea id="bookingConfirmAdminMessage" placeholder="Tour pickup details, inclusions, exclusions, or special notes..."></textarea></label>
      <p class="confirm-help">Tour total calculates from adult/child rates, guest count and discount.</p>
    </div>`;
  }
  return `
    <div class="modal-section booking-confirm-panel">
      <h4>Property Quote / Booking Details</h4>
      <div class="booking-confirm-grid">
        <label>Check-in Time<input id="bookingConfirmCheckInTime" type="time" value="14:00"></label>
        <label>Check-out Time<input id="bookingConfirmCheckOutTime" type="time" value="11:00"></label>
        <label>Currency<select id="bookingConfirmCurrency"><option>LKR</option><option>USD</option><option>EUR</option><option>OMR</option></select></label>
        <label>Night Rate<input id="bookingConfirmDayRate" type="number" min="0" step="0.01" placeholder="Example: 15000"></label>
        <label>Discount %<input id="bookingConfirmDiscount" type="number" min="0" max="100" step="0.01" value="0"></label>
        <label>Total Nights<input id="bookingConfirmNights" readonly></label>
        <label>Total Amount<input id="bookingConfirmTotalAmount" readonly></label>
      </div>
      <label>Admin Message to Guest<textarea id="bookingConfirmAdminMessage" placeholder="Example: Please arrive after 2.00 PM. Our team will contact you before check-in."></textarea></label>
      <p class="confirm-help">Total nights and total amount calculate automatically from dates, night rate and discount.</p>
    </div>`;
}

function getItemNameFromService(serviceType){
  return String(serviceType || "")
    .replace("Villa Inquiry - ", "")
    .replace("Apartment Inquiry - ", "")
    .replace("Homestay Inquiry - ", "")
    .replace("Tour Inquiry - ", "")
    .trim();
}
function closeInquiryModal(){
  document.getElementById("inquiryModal")
    .classList.add("hidden");
}

async function loadInquiryNotes() {

  if (!currentInquiry) return;

  try {

    const res = await fetch(
      `${API_BASE}/api/admin/inquiries/${currentInquiry.id}/notes`,
      {
        headers: authHeaders()
      }
    );

    const notes = await res.json();

    document.getElementById("inquiryNotesList").innerHTML =
      (notes || []).map(note => `
        <div class="note-item">
          <strong>${formatDate(note.createdAt)}</strong><br>
          ${note.note}
        </div>
      `).join("");

  } catch (err) {
    console.error(err);
  }
}

async function saveInquiryNote() {

  if (!currentInquiry) return;

  const text =
    document.getElementById("adminNoteText").value.trim();

  if (!text) return;

  try {

    const res = await fetch(
      `${API_BASE}/api/admin/inquiries/${currentInquiry.id}/notes`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          note: text
        })
      }
    );

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Failed to save note");
      return;
    }

    document.getElementById("adminNoteText").value = "";

    loadInquiryNotes();

  } catch (err) {
    alert(err.message);
  }
}


function calcBookingNights(dateFrom, dateTo){
  if(!dateFrom || !dateTo) return 0;
  const start = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function updateBookingConfirmTotals(){
  const rateBox = document.getElementById("bookingConfirmDayRate");
  const totalBox = document.getElementById("bookingConfirmTotalAmount");
  if(!currentInquiry || !rateBox || !totalBox) return;

  const discount = Number(document.getElementById("bookingConfirmDiscount")?.value || 0);
  let subtotal = 0;

  if(isTourInquiry(currentInquiry)){
    const adultRate = Number(rateBox.value || 0);
    const childRate = Number(document.getElementById("bookingConfirmChildRate")?.value || 0);
    const adults = Number(document.getElementById("bookingConfirmAdultCount")?.value || currentInquiry.guests || 1);
    const children = Number(document.getElementById("bookingConfirmChildCount")?.value || 0);
    subtotal = (adultRate * adults) + (childRate * children);
    const nightsBox = document.getElementById("bookingConfirmNights");
    if(nightsBox) nightsBox.value = "1";
  } else {
    const nightsBox = document.getElementById("bookingConfirmNights");
    const nights = calcBookingNights(currentInquiry.dateFrom, currentInquiry.dateTo);
    const rate = Number(rateBox.value || 0);
    subtotal = nights * rate;
    if(nightsBox) nightsBox.value = nights;
  }

  const total = subtotal - (subtotal * discount / 100);
  const currency = document.getElementById("bookingConfirmCurrency")?.value || "LKR";
  totalBox.value = total ? `${currency} ${total.toFixed(2)}` : "";
}

function getBookingConfirmDetails(){
  const currency = document.getElementById("bookingConfirmCurrency")?.value || "LKR";
  const rate = document.getElementById("bookingConfirmDayRate")?.value || "";
  const discount = document.getElementById("bookingConfirmDiscount")?.value || "0";
  const pickup = document.getElementById("bookingConfirmPickupLocation")?.value || "";
  const childRate = document.getElementById("bookingConfirmChildRate")?.value || "";
  const adults = document.getElementById("bookingConfirmAdultCount")?.value || "";
  const children = document.getElementById("bookingConfirmChildCount")?.value || "";
  const baseMessage = document.getElementById("bookingConfirmAdminMessage")?.value || "";
  const tourMessage = isTourInquiry(currentInquiry)
    ? `

Tour Details:
Pickup Location: ${pickup || "-"}
Adults: ${adults || "-"}
Children: ${children || "0"}
Child Rate: ${childRate ? currency + " " + childRate : "-"}`
    : "";

  return {
    checkInTime: document.getElementById("bookingConfirmCheckInTime")?.value || (isTourInquiry(currentInquiry) ? "08:00" : "14:00"),
    checkOutTime: document.getElementById("bookingConfirmCheckOutTime")?.value || "11:00",
    dayRate: rate ? `${currency} ${rate}` : "",
    totalDays: document.getElementById("bookingConfirmNights")?.value || (isTourInquiry(currentInquiry) ? "1" : ""),
    totalAmount: document.getElementById("bookingConfirmTotalAmount")?.value || "",
    adminMessage: `Currency: ${currency}
Discount: ${discount}%${tourMessage}

${baseMessage}`.trim()
  };
}

async function confirmBooking(sendEmail = true) {

  console.log("CONFIRM BOOKING CLICKED", currentInquiry);

  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

  const activeExistingBooking = allBookings.find(b =>
    String(b.inquiryId || "") === String(currentInquiry.id) &&
    normalizeStatus(b.status) === "booked"
  );

  if (activeExistingBooking) {
    alert("This inquiry is already booked.");
    return;
  }

  try {

    const res = await fetch(
      `${API_BASE}/api/admin/bookings`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          inquiryId: currentInquiry.id,
          reference: currentInquiry.reference,
          itemName: currentInquiry.itemName || (currentInquiry.serviceType || "")
            .replace("Villa Inquiry - ", "")
            .replace("Apartment Inquiry - ", "")
            .replace("Homestay Inquiry - ", ""),
          serviceType: currentInquiry.serviceType,
          guestName: currentInquiry.guestName,
          guestEmail: currentInquiry.guestEmail,
          guestMobile: currentInquiry.guestMobile,
          dateFrom: currentInquiry.dateFrom,
          dateTo: safeBookingDateTo(currentInquiry),
          guests: currentInquiry.guests,
          ...getBookingConfirmDetails(),
          sendEmail
        })
      }
    );

    const result = await res.json();
    console.log("BOOKING RESULT", result);

    if (!res.ok) {
      alert(result.error || "Booking failed");
      return;
    }

    currentInquiry.status = "Booked";

    await loadBookings();
    await loadInquiries();

    alert("Booking Confirmed");
    closeInquiryModal();

  } catch (err) {
    alert(err.message);
  }
}

function openGuestWhatsApp() {

  if (!currentInquiry) return;

  const mobile =
    (currentInquiry.guestMobile || "")
      .replace(/\D/g, "");

  const text = encodeURIComponent(
`Hello ${currentInquiry.guestName || ""},

Thank you for contacting CeyBreez.

Reference:
${currentInquiry.reference || ""}

We will contact you shortly.

Best Regards
CeyBreez`
  );

  window.open(
    `https://wa.me/${mobile}?text=${text}`,
    "_blank"
  );
}

function emailGuest() {

  if (!currentInquiry) return;

  const email =
    currentInquiry.guestEmail || "";

  window.location.href =
    `mailto:${email}`;
}

function copyInquiryDetails() {

  if (!currentInquiry) return;

  navigator.clipboard.writeText(
JSON.stringify(currentInquiry, null, 2)
  );

  alert("Copied");
}
setInterval(() => {
  const bookingsTab = document.getElementById("bookingsTab");

  if (
    bookingsTab &&
    !bookingsTab.classList.contains("hidden") &&
    ADMIN_TOKEN
  ) {
    loadBookings();
  }
}, 10000);
async function deleteCurrentInquiry() {
  if (!currentInquiry) return;

  if (!confirm("Delete this inquiry permanently?")) return;

  await deleteInquiry(currentInquiry.id);

  closeInquiryModal();

  await loadInquiries();
  await loadBookings();
}
function renderManualPropertyDropdown(properties){
  const box = document.getElementById("manualItemName");
  if(!box) return;

  const selectedType = (document.getElementById("manualServiceType")?.value || "").toLowerCase();
  let options = [];

  if(selectedType.includes("tour")){
    options = (allDestinations || []).map(d => ({ name: d.name, type: "tour" }));
  } else {
    options = (properties || window.allProperties || []).filter(p => {
      const propType = String(p.type || "").toLowerCase();
      if(selectedType.includes("villa")) return propType === "villa";
      if(selectedType.includes("homestay")) return propType === "homestay";
      if(selectedType.includes("apartment")) return propType === "apartment";
      return propType !== "tour";
    });
  }

  const currentValue = box.value || "";
  let select = box;

  if(box.tagName.toLowerCase() !== "select"){
    select = document.createElement("select");
    select.id = "manualItemName";
    select.required = true;
    box.replaceWith(select);
    select.addEventListener("change", checkManualBookingAvailability);
  }

  select.innerHTML = `
    <option value="">Select Property / Tour</option>
    ${options.map(p => `
      <option value="${escapeHtml(p.name)}">
        ${escapeHtml(p.name)} (${escapeHtml(p.type || "property")})
      </option>
    `).join("")}
  `;

  if(currentValue) select.value = currentValue;
}
function checkManualBookingAvailability() {
  const msg = document.getElementById("manualAvailabilityMsg");
  if (!msg) return true;

  const itemName = document.getElementById("manualItemName")?.value || "";
  const dateFrom = document.getElementById("manualDateFrom")?.value || "";
  const dateTo = document.getElementById("manualDateTo")?.value || "";

  msg.className = "manual-availability-msg";
  msg.textContent = "";

  if (!itemName || !dateFrom || !dateTo) {
    return true;
  }

  if (dateFrom >= dateTo) {
    msg.classList.add("bad");
    msg.textContent = "❌ Check-out date must be after check-in date.";
    return false;
  }

  const conflict = allBookings.find(b =>
    normalizeStatus(b.status) === "booked" &&
    String(b.itemName || "").trim().toLowerCase() === String(itemName).trim().toLowerCase() &&
    dateFrom < b.dateTo &&
    dateTo > b.dateFrom
  );

  if (conflict) {
    msg.classList.add("bad");
    msg.textContent = `❌ Already booked: ${conflict.itemName} (${conflict.dateFrom} to ${conflict.dateTo})`;
    return false;
  }

  msg.classList.add("good");
  msg.textContent = "✅ Available for selected dates.";
  return true;
}
async function deleteBooking(id){

  if(!confirm("Delete this booking permanently?")) return;

  const res = await fetch(
    `${API_BASE}/api/admin/bookings/${id}`,
    {
      method: "DELETE",
      headers: authHeaders()
    }
  );

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Delete failed");
    return;
  }

  alert("Booking deleted");

  await loadBookings();
  await loadInquiries();

  const box = document.getElementById("bookingDetailsBox");
  if(box) box.innerHTML = "";
}
function filterManualProperties() {
  renderManualPropertyDropdown(window.allProperties || []);
  checkManualBookingAvailability();
}


