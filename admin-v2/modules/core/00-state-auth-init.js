const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
let ADMIN_TOKEN = localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
let allInquiries = [];
let allBookings = [];
let allDestinations = [];
let allServices = [];
let allReviews = [];
let cmsSort = { destinations:{key:'name',dir:1}, properties:{key:'name',dir:1}, services:{key:'name',dir:1} };
let bookingCalendarDate = new Date();
let v6InquiryMode = 'all';
let v6BookingMode = 'all';
let currentInquiryView = 'property';
let currentBookingView = 'property';

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initV51ProfessionalUI, 250);
  renderPropertyFacilityChecklist();
  if (ADMIN_TOKEN) {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("adminPanel").classList.remove("hidden");
    loadAll();
  }

  document.getElementById("destinationForm").addEventListener("submit", saveDestination);
  document.getElementById("propertyForm").addEventListener("submit", saveProperty);

  const serviceForm = document.getElementById("serviceForm");
  if (serviceForm) serviceForm.addEventListener("submit", saveService);

  const siteContentForm = document.getElementById("siteContentForm");
  if (siteContentForm) siteContentForm.addEventListener("submit", saveSiteContent);

  const sectionForm = document.getElementById("sectionForm");
  if (sectionForm) sectionForm.addEventListener("submit", savePageSection);

  document.getElementById("destPhotos").addEventListener("input", () => renderPhotoPreview("dest"));
  document.getElementById("propPhotos").addEventListener("input", () => renderPhotoPreview("prop"));

  document.querySelectorAll("#inquirySearch").forEach(input => {
    input.addEventListener("input", applyInquiryFilters);
  });

  document.getElementById("inquiryFilter")?.addEventListener("change", applyInquiryFilters);
  document.getElementById("inquiryStatusFilter")?.addEventListener("change", applyInquiryFilters);

  document.getElementById("bookingSearch")?.addEventListener("input", applyBookingFilters);
  document.getElementById("bookingStatusFilter")?.addEventListener("change", applyBookingFilters);
  document.getElementById("bookingTypeFilter")?.addEventListener("change", applyBookingFilters);
  document.getElementById("destinationSearch")?.addEventListener("input", renderDestinationsTable);
  document.getElementById("destinationProvinceFilter")?.addEventListener("change", renderDestinationsTable);
  document.getElementById("destinationStatusFilter")?.addEventListener("change", renderDestinationsTable);
  document.getElementById("propertySearch")?.addEventListener("input", renderPropertiesTable);
  document.getElementById("propertyTypeFilter")?.addEventListener("change", renderPropertiesTable);
  document.getElementById("propertyStatusFilter")?.addEventListener("change", renderPropertiesTable);
  document.getElementById("serviceSearch")?.addEventListener("input", renderServicesTable);
  document.getElementById("serviceCategoryFilter")?.addEventListener("change", renderServicesTable);
  document.getElementById("serviceLocationFilter")?.addEventListener("change", renderServicesTable);
  document.getElementById("serviceStatusFilter")?.addEventListener("change", renderServicesTable);
  document.getElementById("matrixTypeFilter")?.addEventListener("change", renderAvailabilityMatrix);
  document.getElementById("matrixDaysFilter")?.addEventListener("change", renderAvailabilityMatrix);
  document.getElementById("reportTypeFilter")?.addEventListener("change", renderReports);
  document.getElementById("reportDateFrom")?.addEventListener("change", renderReports);
  document.getElementById("reportDateTo")?.addEventListener("change", renderReports);
  document.getElementById("reviewSearch")?.addEventListener("input", renderReviewsTable);
  document.getElementById("reviewTypeFilter")?.addEventListener("change", renderReviewsTable);
  document.getElementById("reviewStatusFilter")?.addEventListener("change", renderReviewsTable);
  document.getElementById("reviewForm")?.addEventListener("submit", saveReview);

 const manualBookingForm = document.getElementById("manualBookingForm");
if (manualBookingForm) manualBookingForm.addEventListener("submit", createManualBooking);

document.getElementById("manualServiceType")?.addEventListener("change", () => {
  filterManualProperties();
    renderAvailabilityMatrix();
  checkManualBookingAvailability();
});

document.getElementById("manualItemName")?.addEventListener("change", checkManualBookingAvailability);
document.getElementById("manualDateFrom")?.addEventListener("change", checkManualBookingAvailability);
document.getElementById("manualDateTo")?.addEventListener("change", checkManualBookingAvailability);

});

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ADMIN_TOKEN}`
  };
}

function uploadHeaders() {
  return { "Authorization": `Bearer ${ADMIN_TOKEN}` };
}

function loginAdmin() {
  ADMIN_TOKEN = document.getElementById("adminToken").value.trim();
  if (!ADMIN_TOKEN) return alert("Enter admin token");

  localStorage.setItem("CEYBREEZ_ADMIN_TOKEN", ADMIN_TOKEN);
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");
  loadAll();
}

function logoutAdmin() {
  localStorage.removeItem("CEYBREEZ_ADMIN_TOKEN");
  ADMIN_TOKEN = "";
  location.reload();
}

function showTab(tab) {
  const allTabsV61 = ["destinationsTab","propertiesTab","servicesTab","inquiriesTab","bookingsTab","reviewsTab","reportsTab","pageControlTab","settingsTab"];
  allTabsV61.forEach(id => document.getElementById(id)?.classList.add("hidden"));
  const mapV61 = { destinations:"destinationsTab", properties:"propertiesTab", services:"servicesTab", inquiriesTab:"inquiriesTab", bookingsTab:"bookingsTab", reviewsTab:"reviewsTab", reportsTab:"reportsTab", pageControl:"pageControlTab", settingsTab:"settingsTab" };
  document.getElementById(mapV61[tab] || tab)?.classList.remove("hidden");

  const isPropertyInquiry = tab === "propertyInquiries" || tab === "inquiriesTab";
  const isTourInquiry = tab === "tourInquiries";
  const isPropertyBooking = tab === "propertyBookings" || tab === "bookingsTab";
  const isTourBooking = tab === "tourBookings";

  currentInquiryView = isTourInquiry ? "tour" : "property";
  currentBookingView = isTourBooking ? "tour" : "property";

  document.getElementById("destinationsTab")?.classList.toggle("hidden", tab !== "destinations");
  document.getElementById("propertiesTab")?.classList.toggle("hidden", tab !== "properties");
  document.getElementById("servicesTab")?.classList.toggle("hidden", tab !== "services");
  document.getElementById("pageControlTab")?.classList.toggle("hidden", tab !== "pageControl");
  document.getElementById("reportsTab")?.classList.toggle("hidden", tab !== "reportsTab");

  const inquiriesTab = document.getElementById("inquiriesTab");
  if (inquiriesTab) inquiriesTab.classList.toggle("hidden", !(isPropertyInquiry || isTourInquiry));

  const bookingsTab = document.getElementById("bookingsTab");
  if (bookingsTab) bookingsTab.classList.toggle("hidden", !(isPropertyBooking || isTourBooking));

  const inquiryTitle = document.getElementById("inquiryPageTitle");
  if (inquiryTitle) inquiryTitle.textContent = isTourInquiry ? "Tour Inquiry" : "Property Inquiry";

  const bookingTitle = document.getElementById("bookingPageTitle");
  if (bookingTitle) bookingTitle.textContent = isTourBooking ? "Tour Booking Management" : "Property Booking Management";

  if (tab === "destinations") loadDestinations();
  if (tab === "properties") loadProperties();
  if (tab === "services") loadServices();
  if (isPropertyInquiry || isTourInquiry) loadInquiries();
  if (isPropertyBooking || isTourBooking) loadBookings();
  if (tab === "pageControl") { loadSiteContent(); loadPageSections(); }
  if (tab === "reportsTab") renderReports();
}
function linesToArray(value) {
  return value.split("\n").map(x => x.trim()).filter(Boolean);
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function pxValue(id) {
  const value = document.getElementById(id)?.value;
  return value ? `${value}px` : "";
}

function stripPx(value) {
  return String(value || "").replace("px", "");
}

function textHasAny(value, words){
  const text = String(value || "").toLowerCase();
  return words.some(w => text.includes(w));
}

function getInquiryCategory(item){
  const text = `${item?.category || ""} ${item?.serviceType || ""} ${item?.itemName || ""}`.toLowerCase();
  if (textHasAny(text, ["tour", "trip", "excursion", "destination"])) return "tour";
  if (textHasAny(text, ["villa", "homestay", "apartment", "property", "room", "stay"])) return "property";
  return "property";
}

function getBookingCategory(item){
  const text = `${item?.category || ""} ${item?.serviceType || ""} ${item?.itemName || ""}`.toLowerCase();
  if (textHasAny(text, ["tour", "trip", "excursion", "destination"])) return "tour";
  if (textHasAny(text, ["villa", "homestay", "apartment", "property", "room", "stay"])) return "property";
  return "property";
}

function isTourInquiry(inquiry){
  return getInquiryCategory(inquiry) === "tour";
}

function closeCmsForm(id){
  document.getElementById(id)?.classList.add("hidden");
}


async function loadAll() {
  await loadDestinations();
  await loadProperties();

  if (document.getElementById("servicesTab")) {
    await loadServices();
  }

  if (document.getElementById("pageControlTab")) {
    await loadSiteContent();
    await loadPageSections();
  }

  if (document.getElementById("inquiriesTab")) {
    await loadInquiries();
  }

  if (document.getElementById("bookingsTab")) {
    await loadBookings();
  }

  if (document.getElementById("reviewsTab")) {
    await loadReviews();
  }
}

function getUploadFolder(type) {
  if (type === "dest") return "tours";
  if (type === "page") return "page-control";

  const propType = document.getElementById("propType").value || "property";
  if (propType === "villa") return "villas";
  if (propType === "homestay") return "homestays";
  if (propType === "apartment") return "apartments";

  return "properties";
}

function getUploader(type) {
  if (type === "dest") return document.getElementById("destPhotoUploader");
  if (type === "page") return document.getElementById("pageMediaUploader");
  return document.getElementById("propPhotoUploader");
}

function getPhotosBox(type) {
  return type === "dest" ? document.getElementById("destPhotos") : document.getElementById("propPhotos");
}

function getStatusBox(type) {
  if (type === "dest") return document.getElementById("destUploadStatus");
  if (type === "page") return document.getElementById("pageMediaUploadStatus");
  return document.getElementById("propUploadStatus");
}

function handleDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drag-active");
}

function handleDragLeave(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
}

function handleDrop(event, type) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadFileList(type, event.dataTransfer.files);
}

function handlePageMediaDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadPageMediaList(event.dataTransfer.files);
}

async function uploadPhotos(type) {
  const input = getUploader(type);
  if (!input.files.length) return alert("Please select photos first.");
  await uploadFileList(type, input.files);
  input.value = "";
}

async function uploadFileList(type, files) {
  const status = getStatusBox(type);
  const photosBox = getPhotosBox(type);
  const folder = getUploadFolder(type);

  if (!files || !files.length) return alert("Please select photos first.");

  status.textContent = `Uploading ${files.length} photo(s)...`;
  const uploadedUrls = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
        method: "POST",
        headers: uploadHeaders(),
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      uploadedUrls.push(result.url);
      status.textContent = `Uploaded ${uploadedUrls.length} of ${files.length} photo(s)...`;
    } catch (err) {
      alert(err.message);
    }
  }

  if (uploadedUrls.length) {
    const existing = photosBox.value.trim();
    photosBox.value = [existing, ...uploadedUrls].filter(Boolean).join("\n");
    renderPhotoPreview(type);
    status.textContent = "Upload completed.";
  } else {
    status.textContent = "No photos uploaded.";
  }
}

async function uploadPageMedia() {
  const input = document.getElementById("pageMediaUploader");
  if (!input.files.length) return alert("Please select media first.");
  await uploadPageMediaList(input.files);
  input.value = "";
}

async function uploadPageMediaList(files) {
  const status = document.getElementById("pageMediaUploadStatus");
  const urlBox = document.getElementById("pageUploadedUrls");

  if (!files || !files.length) return alert("Please select media first.");

  status.textContent = `Uploading ${files.length} file(s)...`;
  const uploadedUrls = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "page-control");

    try {
      const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
        method: "POST",
        headers: uploadHeaders(),
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      uploadedUrls.push(result.url);
      status.textContent = `Uploaded ${uploadedUrls.length} of ${files.length} file(s)...`;
    } catch (err) {
      alert(err.message);
    }
  }

  if (uploadedUrls.length) {
    const existing = urlBox.value.trim();
    urlBox.value = [existing, ...uploadedUrls].filter(Boolean).join("\n");
    status.textContent = "Upload completed.";
  } else {
    status.textContent = "No media uploaded.";
  }
}

