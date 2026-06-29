/* =========================
   V6.6 DELETE CASCADE + TAB FILTER FIX
========================= */

function v66Text(item){
  return `${item?.bookingCategory || ""} ${item?.category || ""} ${item?.serviceType || ""} ${item?.itemName || ""} ${item?.reference || ""} ${item?.message || ""}`.toLowerCase();
}

function classifyInquiryItem(item){
  const text = v66Text(item);
  if (text.includes("tour") || text.includes("trip") || text.includes("safari") || text.includes("excursion") || text.includes("pickup") || text.includes("guide")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact") || text.includes("taxi") || text.includes("rental")) return "service";
  return "property";
}

function classifyBookingItem(item){
  const text = v66Text(item);
  if (text.includes("tour") || text.includes("trip") || text.includes("safari") || text.includes("excursion") || text.includes("pickup") || text.includes("guide")) return "tour";
  if (String(item?.reference || "").startsWith("MAN-") || String(item?.inquiryId || "").startsWith("MAN-")) return "manual";
  return "property";
}

function setInquiryMode(mode, btn){
  v6InquiryMode = mode || "all";
  const hidden = document.getElementById("v6InquiryMode");
  if (hidden) hidden.value = v6InquiryMode;
  document.querySelectorAll("[data-inquiry-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyInquiryFilters();
}

function setBookingMode(mode, btn){
  v6BookingMode = mode || "all";
  const hidden = document.getElementById("v6BookingMode");
  if (hidden) hidden.value = v6BookingMode;
  document.querySelectorAll("[data-booking-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyBookingFilters();
}

function applyInquiryFilters() {
  const searchInputs = document.querySelectorAll("#inquirySearch");
  let search = "";
  searchInputs.forEach(input => { if (input.value.trim()) search = input.value.toLowerCase(); });

  const oldStatus = document.getElementById("inquiryFilter")?.value || "";
  const newStatus = document.getElementById("inquiryStatusFilter")?.value || "all";
  const mode = v6InquiryMode || document.getElementById("v6InquiryMode")?.value || "all";

  let status = "";
  if (newStatus && newStatus !== "all") status = newStatus.toLowerCase();
  if (oldStatus) status = oldStatus.toLowerCase();

  const filtered = allInquiries.filter(item => {
    const text = `${item.reference || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""} ${item.serviceType || ""} ${item.itemName || ""} ${item.message || ""}`.toLowerCase();
    return (mode === "all" || classifyInquiryItem(item) === mode)
      && (!status || normalizeStatus(item.status) === status)
      && (!search || text.includes(search));
  });

  renderDashboardCards(allInquiries);
  renderInquiryTypeCards(allInquiries);
  renderInquiryTable(filtered);
  const inquiryCardsBox = document.getElementById("inquiriesList");
  if (inquiryCardsBox) inquiryCardsBox.innerHTML = "";
}

function applyBookingFilters() {
  const search = (document.getElementById("bookingSearch")?.value || "").toLowerCase();
  const status = (document.getElementById("bookingStatusFilter")?.value || "all").toLowerCase();
  const type = (document.getElementById("bookingTypeFilter")?.value || "all").toLowerCase();
  const mode = v6BookingMode || document.getElementById("v6BookingMode")?.value || "all";

  const filtered = allBookings.filter(item => {
    const category = classifyBookingItem(item);
    const statusMatch = status === "all" || normalizeStatus(item.status) === status;
    const modeMatch = mode === "all" || category === mode;
    const typeText = `${item.serviceType || ""} ${item.itemName || ""} ${item.bookingCategory || ""}`.toLowerCase();
    const typeMatch = type === "all" || typeText.includes(type) || category === type;
    const searchText = `${item.id || ""} ${item.reference || ""} ${item.itemName || ""} ${item.serviceType || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""}`.toLowerCase();
    return modeMatch && statusMatch && typeMatch && (!search || searchText.includes(search));
  });

  renderBookingStats(allBookings);
  renderBookingsTable(filtered);
  renderBookingsCalendar(filtered);
  renderAvailabilityMatrix();
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;
  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;
  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Inquiries</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "property").length}</div></div>
    <div class="dashboard-card"><h3>Tour Inquiries</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "tour").length}</div></div>
    <div class="dashboard-card"><h3>Service / Contact</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "service").length}</div></div>
    <div class="dashboard-card card-new"><h3>New</h3><div class="value">${count("New")}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("Booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${count("Cancelled") + count("Closed")}</div></div>
  `;
}

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;
  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;
  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Bookings</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "property").length}</div></div>
    <div class="dashboard-card"><h3>Tour Bookings</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "tour").length}</div></div>
    <div class="dashboard-card"><h3>Manual Bookings</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "manual").length}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>
  `;
}

async function deleteInquiry(id) {
  if (!confirm("Delete this inquiry? Related booking and notes will also be removed.")) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}`, { method:"DELETE", headers: authHeaders() });
    const result = await res.json();
    if (!res.ok) return alert(result.error || "Delete failed");
    alert("Inquiry and related records deleted");
    closeInquiryModal?.();
    await loadInquiries();
    await loadBookings();
  } catch (err) { alert(err.message); }
}

async function cleanupOrphanBookings() {
  if (!confirm("Clean orphan bookings that no longer have matching inquiries?")) return;
  const res = await fetch(`${API_BASE}/api/admin/bookings/cleanup-orphans`, { method:"POST", headers: authHeaders() });
  const result = await res.json();
  if (!res.ok) return alert(result.error || "Cleanup failed");
  alert(`Cleanup completed. Removed ${result.deleted || 0} orphan booking(s).`);
  await loadBookings();
  await loadInquiries();
}

setTimeout(() => {
  const tools = document.querySelector(".booking-tools");
  if (tools && !document.getElementById("cleanupOrphansBtn")) {
    const btn = document.createElement("button");
    btn.id = "cleanupOrphansBtn";
    btn.type = "button";
    btn.textContent = "Clean Orphans";
    btn.onclick = cleanupOrphanBookings;
    tools.appendChild(btn);
  }
}, 1200);


