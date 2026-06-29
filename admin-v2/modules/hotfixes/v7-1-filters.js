/* =========================
   V7.1 UNIFIED FILTER SYSTEM
========================= */

let v71InquiryCategoryFilter = "all";
let v71BookingCategoryFilter = "all";

function v71Text(item){
  return `${item?.bookingCategory || ""} ${item?.category || ""} ${item?.serviceType || ""} ${item?.itemName || ""} ${item?.reference || ""} ${item?.message || ""}`.toLowerCase();
}

function classifyInquiryItem(item){
  const t = v71Text(item);
  if (t.includes("tour") || t.includes("trip") || t.includes("safari") || t.includes("excursion") || t.includes("pickup") || t.includes("guide")) return "tour";
  if (t.includes("cafe") || t.includes("service") || t.includes("restaurant") || t.includes("contact") || t.includes("taxi") || t.includes("rental")) return "service";
  return "property";
}

function classifyBookingItem(item){
  const t = v71Text(item);
  if (t.includes("tour") || t.includes("trip") || t.includes("safari") || t.includes("excursion") || t.includes("pickup") || t.includes("guide")) return "tour";
  if (String(item?.reference || "").startsWith("MAN-") || String(item?.inquiryId || "").startsWith("MAN-")) return "manual";
  return "property";
}

function v71InjectUnifiedFilters(){
  const inquiryTools = document.querySelector("#inquiriesTab .inquiry-tools");
  if(inquiryTools && !document.getElementById("v71InquiryCategoryFilter")){
    const select = document.createElement("select");
    select.id = "v71InquiryCategoryFilter";
    select.innerHTML = `<option value="all">All Inquiry Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="service">Cafe / Service Only</option>`;
    select.onchange = () => { v71InquiryCategoryFilter = select.value || "all"; applyInquiryFilters(); };
    inquiryTools.prepend(select);
  }

  const bookingTools = document.querySelector(".booking-tools");
  if(bookingTools && !document.getElementById("v71BookingCategoryFilter")){
    const select = document.createElement("select");
    select.id = "v71BookingCategoryFilter";
    select.innerHTML = `<option value="all">All Booking Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="manual">Manual Only</option>`;
    select.onchange = () => { v71BookingCategoryFilter = select.value || "all"; applyBookingFilters(); };
    bookingTools.prepend(select);
  }

  document.querySelectorAll(".v6-mode-tabs").forEach(x => { x.style.display = "none"; });
}

function setInquiryMode(mode, btn){
  v71InquiryCategoryFilter = mode || "all";
  const s = document.getElementById("v71InquiryCategoryFilter");
  if(s) s.value = v71InquiryCategoryFilter;
  applyInquiryFilters();
}

function setBookingMode(mode, btn){
  v71BookingCategoryFilter = mode || "all";
  const s = document.getElementById("v71BookingCategoryFilter");
  if(s) s.value = v71BookingCategoryFilter;
  applyBookingFilters();
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;
  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;
  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "property").length}</div></div>
    <div class="dashboard-card"><h3>Tour</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "tour").length}</div></div>
    <div class="dashboard-card"><h3>Service</h3><div class="value">${data.filter(x => classifyInquiryItem(x) === "service").length}</div></div>
    <div class="dashboard-card card-new"><h3>New</h3><div class="value">${count("New")}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("Booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${count("Cancelled") + count("Closed")}</div></div>`;
}

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;
  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;
  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "property").length}</div></div>
    <div class="dashboard-card"><h3>Tour</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "tour").length}</div></div>
    <div class="dashboard-card"><h3>Manual</h3><div class="value">${data.filter(x => classifyBookingItem(x) === "manual").length}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>`;
}

function applyInquiryFilters() {
  v71InjectUnifiedFilters();
  let search = "";
  document.querySelectorAll("#inquirySearch").forEach(input => { if (input.value.trim()) search = input.value.toLowerCase(); });
  const oldStatus = document.getElementById("inquiryFilter")?.value || "";
  const newStatus = document.getElementById("inquiryStatusFilter")?.value || "all";
  const categoryFilter = document.getElementById("v71InquiryCategoryFilter")?.value || v71InquiryCategoryFilter || "all";
  let status = "";
  if (newStatus && newStatus !== "all") status = newStatus.toLowerCase();
  if (oldStatus) status = oldStatus.toLowerCase();

  const filtered = allInquiries.filter(item => {
    const text = `${item.reference || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""} ${item.serviceType || ""} ${item.itemName || ""} ${item.message || ""}`.toLowerCase();
    return (categoryFilter === "all" || classifyInquiryItem(item) === categoryFilter)
      && (!status || normalizeStatus(item.status) === status)
      && (!search || text.includes(search));
  });
  renderDashboardCards(allInquiries);
  if(typeof renderInquiryTypeCards === "function") renderInquiryTypeCards(allInquiries);
  renderInquiryTable(filtered);
  const box = document.getElementById("inquiriesList");
  if (box) box.innerHTML = "";
}

function applyBookingFilters() {
  v71InjectUnifiedFilters();
  const search = (document.getElementById("bookingSearch")?.value || "").toLowerCase();
  const status = (document.getElementById("bookingStatusFilter")?.value || "all").toLowerCase();
  const type = (document.getElementById("bookingTypeFilter")?.value || "all").toLowerCase();
  const categoryFilter = document.getElementById("v71BookingCategoryFilter")?.value || v71BookingCategoryFilter || "all";

  const filtered = allBookings.filter(item => {
    const category = classifyBookingItem(item);
    const typeText = `${item.serviceType || ""} ${item.itemName || ""} ${item.bookingCategory || ""}`.toLowerCase();
    const searchText = `${item.id || ""} ${item.reference || ""} ${item.itemName || ""} ${item.serviceType || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""}`.toLowerCase();
    return (categoryFilter === "all" || category === categoryFilter)
      && (status === "all" || normalizeStatus(item.status) === status)
      && (type === "all" || typeText.includes(type) || category === type)
      && (!search || searchText.includes(search));
  });
  renderBookingStats(allBookings);
  renderBookingsTable(filtered);
  renderBookingsCalendar(filtered);
  renderAvailabilityMatrix();
}

const v71OldShowTab = typeof showTab === "function" ? showTab : null;
if(v71OldShowTab){
  showTab = function(tab){
    v71OldShowTab(tab);
    setTimeout(v71InjectUnifiedFilters, 80);
  };
}
document.addEventListener("DOMContentLoaded", () => setTimeout(v71InjectUnifiedFilters, 500));


