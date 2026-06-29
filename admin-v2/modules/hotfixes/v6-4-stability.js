/* =========================
   V6.4 STABILITY FIX
========================= */

let v64OriginalFormParent = null;
let v64OriginalFormNext = null;

function v64TextOf(item){
  return `${item?.category || ""} ${item?.serviceType || ""} ${item?.itemName || ""} ${item?.experiences || ""} ${item?.message || ""} ${item?.reference || ""}`.toLowerCase();
}

function classifyInquiryItem(item){
  const text = v64TextOf(item);
  if (text.includes("tour") || text.includes("trip") || text.includes("excursion") || text.includes("safari")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact")) return "service";
  return "property";
}

function classifyBookingItem(item){
  const text = v64TextOf(item);
  if (text.includes("tour") || text.includes("trip") || text.includes("excursion") || text.includes("safari")) return "tour";
  if (String(item?.reference || "").startsWith("MAN-") || String(item?.inquiryId || "").startsWith("MAN-")) return "manual";
  return "property";
}

function isTourInquiry(inquiry){ return classifyInquiryItem(inquiry) === "tour"; }
function isPropertyInquiry(inquiry){ return classifyInquiryItem(inquiry) === "property"; }

function setInquiryMode(mode, btn){
  v6InquiryMode = mode || "all";
  const hidden = document.getElementById("v6InquiryMode");
  if(hidden) hidden.value = v6InquiryMode;
  document.querySelectorAll("[data-inquiry-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyInquiryFilters();
}

function setBookingMode(mode, btn){
  v6BookingMode = mode || "all";
  const hidden = document.getElementById("v6BookingMode");
  if(hidden) hidden.value = v6BookingMode;
  document.querySelectorAll("[data-booking-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyBookingFilters();
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;
  const propertyCount = data.filter(x => classifyInquiryItem(x) === "property").length;
  const tourCount = data.filter(x => classifyInquiryItem(x) === "tour").length;
  const serviceCount = data.filter(x => classifyInquiryItem(x) === "service").length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Inquiries</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>Tour Inquiries</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>Service / Contact</h3><div class="value">${serviceCount}</div></div>
    <div class="dashboard-card card-new"><h3>New</h3><div class="value">${count("New")}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("Booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${count("Cancelled") + count("Closed")}</div></div>
  `;
}

function renderInquiryTypeCards(data) {
  const box = document.getElementById("inquiryTypeCards");
  if (!box) return;

  const propertyCount = data.filter(x => classifyInquiryItem(x) === "property").length;
  const tourCount = data.filter(x => classifyInquiryItem(x) === "tour").length;
  const serviceCount = data.filter(x => classifyInquiryItem(x) === "service").length;

  const countType = keyword =>
    data.filter(x =>
      (x.serviceType || "").toLowerCase().includes(keyword) ||
      (x.itemName || "").toLowerCase().includes(keyword)
    ).length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>🏡 Properties</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>🧭 Tours</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>☕ Services / Contact</h3><div class="value">${serviceCount}</div></div>
    <div class="dashboard-card"><h3>🏡 Villas</h3><div class="value">${countType("villa")}</div></div>
    <div class="dashboard-card"><h3>🏢 Apartments</h3><div class="value">${countType("apartment")}</div></div>
    <div class="dashboard-card"><h3>🏠 Homestays</h3><div class="value">${countType("homestay")}</div></div>
  `;
}

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;
  const propertyCount = data.filter(x => classifyBookingItem(x) === "property").length;
  const tourCount = data.filter(x => classifyBookingItem(x) === "tour").length;
  const manualCount = data.filter(x => classifyBookingItem(x) === "manual").length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Bookings</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>Tour Bookings</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>Manual Bookings</h3><div class="value">${manualCount}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>
  `;
}

function datePlusOne(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return toDateInputValue(d);
}

function safeBookingDateTo(inquiry) {
  const from = inquiry?.dateFrom || "";
  const to = inquiry?.dateTo || "";
  if (to && from && to > from) return to;
  if (classifyInquiryItem(inquiry) === "tour" && from) return datePlusOne(from);
  return to || from;
}

function getItemNameForBooking(inquiry){
  let item = inquiry?.itemName || "";
  if(!item){
    item = String(inquiry?.serviceType || "")
      .replace("Villa Inquiry - ", "")
      .replace("Apartment Inquiry - ", "")
      .replace("Homestay Inquiry - ", "")
      .replace("Tour Inquiry - ", "")
      .replace("Tours Inquiry - ", "")
      .trim();
  }
  if(!item && classifyInquiryItem(inquiry) === "tour") item = inquiry?.serviceType || "Tour Booking";
  return item || "CeyBreez Booking";
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
    const itemStatus = normalizeStatus(item.status);
    const modeMatch = mode === "all" || classifyInquiryItem(item) === mode;
    return modeMatch && (!status || itemStatus === status) && (!search || text.includes(search));
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
    const classType = classifyBookingItem(item);
    const statusMatch = status === "all" || normalizeStatus(item.status) === status;
    const modeMatch = mode === "all" || classType === mode;
    const typeText = `${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();
    const typeMatch = type === "all" || typeText.includes(type) || classType === type;
    const searchText = `${item.id || ""} ${item.reference || ""} ${item.itemName || ""} ${item.serviceType || ""} ${item.guestName || ""} ${item.guestEmail || ""} ${item.guestMobile || ""}`.toLowerCase();
    return modeMatch && statusMatch && typeMatch && (!search || searchText.includes(search));
  });

  renderBookingStats(allBookings);
  renderBookingsTable(filtered);
  renderBookingsCalendar(filtered);
  renderAvailabilityMatrix();
}

function v6WrapFormFields(formSelector){
  const form = document.querySelector(formSelector);
  if(!form || form.dataset.v64Wrapped === "1") return;

  const labelMap = {
    propType:"Property Type", propName:"Property Name", propLocation:"Location / Area", propLat:"Latitude", propLng:"Longitude",
    propMapUrl:"Google Map / Directions URL", propPrice:"Price / Starting From", propGuests:"Maximum Guests", propBedrooms:"Bedrooms",
    propBathrooms:"Bathrooms", propFacilities:"Facilities", propDescription:"Description", propMainImage:"Main Cover Image URL",
    propLogo:"Logo / Badge Image URL", propPhotos:"Gallery Photo URLs",
    destName:"Tour Location Name", destProvince:"Province", destArea:"Nearest City / Area", destLat:"Latitude", destLng:"Longitude",
    destMapUrl:"Google Map / Directions URL", destBestFor:"Best For", destTime:"Time Needed", destNearby:"Nearby Places",
    destDescription:"Description", destLogo:"Logo / Badge Image URL", destPhotos:"Gallery Photo URLs",
    serviceName:"Business / Service Name", serviceCategory:"Category", serviceLocation:"Location", serviceNearestCity:"Nearest City / Area",
    serviceLat:"Latitude", serviceLng:"Longitude", serviceShortDescription:"Short Description", serviceFullDescription:"Full Description",
    servicePhone:"Phone", serviceWhatsapp:"WhatsApp", serviceWebsite:"Website", serviceMapUrl:"Google Map URL", serviceOpeningHours:"Opening Hours",
    serviceLogo:"Logo / Brand Image URL", serviceImage:"Main Image URL", servicePhotos:"Gallery Photo URLs"
  };

  [...form.querySelectorAll("input,select,textarea")].forEach(el => {
    if(el.type === "hidden" || el.closest(".v64-field")) return;
    const oldLabel = el.previousElementSibling;
    if(oldLabel && oldLabel.tagName === "LABEL") oldLabel.remove();
    const text = labelMap[el.id] || el.getAttribute("placeholder") || "";
    if(!text) return;
    const wrap = document.createElement("div");
    wrap.className = "v64-field";
    const label = document.createElement("label");
    label.textContent = text;
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(label);
    wrap.appendChild(el);
  });

  form.dataset.v64Wrapped = "1";
}

function v64OpenCmsDrawer(formBoxId, title){
  const sourceBox = document.getElementById(formBoxId);
  const drawer = document.getElementById("v64CmsDrawer");
  const body = document.getElementById("v64CmsDrawerBody");
  const titleBox = document.getElementById("v64CmsDrawerTitle");
  if(!sourceBox || !drawer || !body || !titleBox) return;

  const form = sourceBox.querySelector("form");
  if(!form) return;

  sourceBox.querySelectorAll(".v6-cms-modal-head,.v6-cms-modal-shell").forEach(x => x.remove());

  v64OriginalFormParent = form.parentNode;
  v64OriginalFormNext = form.nextSibling;

  titleBox.textContent = title || "Edit Details";
  body.innerHTML = "";
  body.appendChild(form);

  v6WrapFormFields(`#${form.id}`);

  sourceBox.classList.add("hidden");
  sourceBox.classList.remove("v6-cms-modal-open");
  sourceBox.style.display = "";

  drawer.classList.remove("hidden");
}

function v64CloseCmsDrawer(){
  const drawer = document.getElementById("v64CmsDrawer");
  const body = document.getElementById("v64CmsDrawerBody");
  const form = body?.querySelector("form");
  if(form && v64OriginalFormParent){
    if(v64OriginalFormNext) v64OriginalFormParent.insertBefore(form, v64OriginalFormNext);
    else v64OriginalFormParent.appendChild(form);
  }
  if(drawer) drawer.classList.add("hidden");
  if(body) body.innerHTML = "";
  v64OriginalFormParent = null;
  v64OriginalFormNext = null;
}

function v6OpenCmsModal(formBoxId, title){ v64OpenCmsDrawer(formBoxId, title); }
function v6CloseCmsModal(formBoxId){ v64CloseCmsDrawer(); }

function showCmsForm(id){
  const titleMap = { destinationFormBox:"Tour Location Details", propertyFormBox:"Property Details", serviceFormBox:"Cafe / Service Details" };
  if(["destinationFormBox","propertyFormBox","serviceFormBox"].includes(id)){
    v64OpenCmsDrawer(id, titleMap[id] || "Edit Details");
    return;
  }
  document.getElementById(id)?.classList.remove("hidden");
}


