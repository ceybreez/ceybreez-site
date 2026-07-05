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

/* SECTION BUILDER MEDIA UPLOADS */

function handleSectionImageDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionImage", "section-images");
}

function handleSectionVideoDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionVideo", "section-videos");
}

function handleSectionBackgroundDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");
  uploadSectionFile(event.dataTransfer.files[0], "sectionBackgroundImage", "section-backgrounds");
}

function uploadSectionImage() {
  const input = document.getElementById("sectionImageUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionImage", "section-images");
  input.value = "";
}

function uploadSectionVideo() {
  const input = document.getElementById("sectionVideoUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionVideo", "section-videos");
  input.value = "";
}

function uploadSectionBackground() {
  const input = document.getElementById("sectionBackgroundUploader");
  if (!input.files.length) return;
  uploadSectionFile(input.files[0], "sectionBackgroundImage", "section-backgrounds");
  input.value = "";
}

async function uploadSectionFile(file, targetInputId, folder) {
  if (!file) return alert("Please select a file first.");

  const target = document.getElementById(targetInputId);
  if (target) target.value = "Uploading...";

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

    if (target) target.value = result.url;
    alert("Upload completed");
  } catch (err) {
    if (target) target.value = "";
    alert(err.message);
  }
}

function renderPhotoPreview(type) {
  const photosBox = getPhotosBox(type);
  const previewBox = type === "dest"
    ? document.getElementById("destPhotoPreview")
    : document.getElementById("propPhotoPreview");

  const urls = linesToArray(photosBox.value);
  previewBox.innerHTML = "";

  urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `
      <img src="${url}" alt="Photo ${index + 1}" onclick="openImagePreview('${url}')">
      <button type="button" onclick="removePhoto('${type}', ${index})">×</button>
    `;
    previewBox.appendChild(item);
  });
}

function removePhoto(type, index) {
  const photosBox = getPhotosBox(type);
  const urls = linesToArray(photosBox.value);
  urls.splice(index, 1);
  photosBox.value = urls.join("\n");
  renderPhotoPreview(type);
}


/* =========================
   CMS TABLE HELPERS
========================= */
function toggleCmsForm(id){ const box=document.getElementById(id); if(!box) return; box.classList.toggle('hidden'); }
function showCmsForm(id){
  const titleMap = {
    destinationFormBox: "Tour Location Details",
    propertyFormBox: "Property Details",
    serviceFormBox: "Cafe / Service Details"
  };

  if(["destinationFormBox","propertyFormBox","serviceFormBox"].includes(id)){
    v6OpenCmsModal(id, titleMap[id] || "Edit Details");
    return;
  }

  document.getElementById(id)?.classList.remove("hidden");
  setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}),80);
}
function sortCmsTable(type,key){ if(!cmsSort[type]) cmsSort[type]={key,dir:1}; if(cmsSort[type].key===key) cmsSort[type].dir*=-1; else cmsSort[type]={key,dir:1}; if(type==="destinations") renderDestinationsTable(); if(type==="properties") renderPropertiesTable(); if(type==="services") renderServicesTable(); }
function sortByCms(type,data){ const s=cmsSort[type]||{key:"name",dir:1}; return [...data].sort((a,b)=>String(a[s.key]||"").localeCompare(String(b[s.key]||""))*s.dir); }
function statusFilterMatch(item,filter){ if(filter==="active") return !!item.active; if(filter==="hidden") return !item.active; if(filter==="featured") return !!item.featured; return true; }
function setFilterOptions(selectId,values,label){ const box=document.getElementById(selectId); if(!box) return; const current=box.value||"all"; const unique=[...new Set(values.filter(Boolean).map(x=>String(x).trim()))].sort(); box.innerHTML=`<option value="all">${label}</option>`+unique.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join(""); if([...box.options].some(o=>o.value===current)) box.value=current; }
function cmsStatusBadge(active){ return active ? `<span class="status-badge status-booked">Active</span>` : `<span class="status-badge status-cancelled">Hidden</span>`; }
function cmsFeaturedBadge(featured){ return featured ? `<span class="status-badge status-quoted">Featured</span>` : `<span class="status-badge">No</span>`; }
async function uploadSingleFile(file,targetInputId,folder){ if(!file) return alert("Please select a file first."); const target=document.getElementById(targetInputId); if(target) target.value="Uploading..."; const formData=new FormData(); formData.append("file",file); formData.append("folder",folder||"uploads"); try{ const res=await fetch(`${API_BASE}/api/admin/upload-image`,{method:"POST",headers:uploadHeaders(),body:formData}); const result=await res.json(); if(!res.ok) throw new Error(result.error||"Upload failed"); if(target) target.value=result.url; alert("Upload completed"); }catch(err){ if(target) target.value=""; alert(err.message); } }
function uploadSingleFileFromInput(inputId,targetInputId,folder){ const input=document.getElementById(inputId); if(!input||!input.files.length) return; uploadSingleFile(input.files[0],targetInputId,folder); input.value=""; }
function handleSingleUploadDrop(event,targetInputId,folder){ event.preventDefault(); event.currentTarget.classList.remove("drag-active"); uploadSingleFile(event.dataTransfer.files[0],targetInputId,folder); }

/* DESTINATIONS */

async function loadDestinations() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/destinations`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load destinations");
    allDestinations = data || [];
    setFilterOptions("destinationProvinceFilter", allDestinations.map(x => x.province), "All Provinces");
    renderDestinationsTable();
    const box = document.getElementById("destinationsList"); if (box) box.innerHTML = "";
  } catch (err) { alert(err.message); }
}
function renderDestinationsTable(){
  const tbody=document.getElementById("destinationsTableBody"); if(!tbody) return;
  const search=(document.getElementById("destinationSearch")?.value||"").toLowerCase();
  const province=document.getElementById("destinationProvinceFilter")?.value||"all";
  const status=document.getElementById("destinationStatusFilter")?.value||"all";
  let data=allDestinations.filter(item=>{ const text=`${item.name||""} ${item.province||""} ${item.area||""} ${item.nearby||""} ${item.bestFor||""}`.toLowerCase(); return (!search||text.includes(search)) && (province==="all"||String(item.province||"")===province) && statusFilterMatch(item,status); });
  data=sortByCms("destinations",data);
  if(!data.length){ tbody.innerHTML=`<tr><td colspan="7" class="empty-row">No tour locations found</td></tr>`; return; }
  tbody.innerHTML=data.map(item=>`<tr class="clickable-row" onclick="editDestinationById('${escapeJs(item.id)}')"><td><strong>${escapeHtml(item.name||"-")}</strong><br><small>${escapeHtml(item.mapUrl||"")}</small></td><td>${escapeHtml(item.province||"-")}</td><td>${escapeHtml(item.area||item.nearby||"-")}</td><td>${escapeHtml(item.bestFor||"-")}</td><td>${cmsStatusBadge(item.active)}</td><td>${cmsFeaturedBadge(item.featured)}</td><td onclick="event.stopPropagation();"><button class="mini-btn" onclick="editDestinationById('${escapeJs(item.id)}')">Edit</button><button class="delete-btn mini-btn" onclick="deleteDestination('${escapeJs(item.id)}')">Delete</button></td></tr>`).join("");
}
function openAddDestinationForm(){ resetDestinationForm(); const t=document.getElementById("destinationFormBoxTitle"); if(t)t.textContent="Add New Tour Location"; showCmsForm("destinationFormBox"); }
function editDestinationById(id){ const item=allDestinations.find(x=>String(x.id)===String(id)); if(item) editDestination(item); }

async function saveDestination(e) {
  e.preventDefault();

  const editId = document.getElementById("destEditId").value;

  const data = {
    name: document.getElementById("destName").value.trim(),
    province: document.getElementById("destProvince").value.trim(),
    area: document.getElementById("destArea")?.value.trim() || "",
    logoImage: document.getElementById("destLogo")?.value.trim() || "",
    lat: document.getElementById("destLat").value.trim(),
    lng: document.getElementById("destLng").value.trim(),
    mapUrl: document.getElementById("destMapUrl").value.trim(),
    bestFor: document.getElementById("destBestFor").value.trim(),
    timeNeeded: document.getElementById("destTime").value.trim(),
    nearby: document.getElementById("destNearby").value.trim(),
    description: document.getElementById("destDescription").value.trim(),
    photos: linesToArray(document.getElementById("destPhotos").value),
    active: document.getElementById("destActive").checked,
    featured: document.getElementById("destFeatured").checked
  };

  const url = editId ? `${API_BASE}/api/admin/destinations/${editId}` : `${API_BASE}/api/admin/destinations`;
  const method = editId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (!res.ok) return alert(result.error || "Save failed");

  alert(result.message || "Saved");
  resetDestinationForm();
  loadDestinations();
}

function editDestination(item) {
  const t=document.getElementById("destinationFormBoxTitle"); if(t)t.textContent="Edit Tour Location";
  document.getElementById("destEditId").value = item.id;
  document.getElementById("destName").value = item.name || "";
  document.getElementById("destProvince").value = item.province || "";
  if (document.getElementById("destArea")) document.getElementById("destArea").value = item.area || "";
  document.getElementById("destLat").value = item.lat || "";
  document.getElementById("destLng").value = item.lng || "";
  document.getElementById("destMapUrl").value = item.mapUrl || "";
  document.getElementById("destBestFor").value = item.bestFor || "";
  document.getElementById("destTime").value = item.timeNeeded || "";
  document.getElementById("destNearby").value = item.nearby || "";
  document.getElementById("destDescription").value = item.description || "";
  if (document.getElementById("destLogo")) document.getElementById("destLogo").value = item.logoImage || "";
  document.getElementById("destPhotos").value = arrayToLines(item.photos);
  document.getElementById("destActive").checked = !!item.active;
  document.getElementById("destFeatured").checked = item.featured || false;
  renderPhotoPreview("dest");
  showCmsForm("destinationFormBox");
}

function resetDestinationForm() {
  document.getElementById("destinationForm").reset();
  document.getElementById("destEditId").value = "";
  document.getElementById("destActive").checked = true;
  document.getElementById("destUploadStatus").textContent = "";
  document.getElementById("destPhotoPreview").innerHTML = "";
  document.getElementById("destFeatured").checked = false;
  document.getElementById("destMapUrl").value = "";
  if (document.getElementById("destArea")) document.getElementById("destArea").value = "";
  if (document.getElementById("destLogo")) document.getElementById("destLogo").value = "";
}

async function deleteDestination(id) {
  if (!confirm("Delete this destination?")) return;

  const res = await fetch(`${API_BASE}/api/admin/destinations/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();
  if (!res.ok) return alert(result.error || "Delete failed");

  alert("Deleted");
  loadDestinations();
}


const PROPERTY_FACILITY_GROUPS = {
  "Great for your stay": ["Parking", "Restaurant", "Private bathroom", "Free WiFi", "Air conditioning", "Family rooms", "Swimming pool", "Garden", "Terrace", "Balcony", "Mountain view", "Sea view", "Kitchen", "Washing machine", "Breakfast"],
  "Bathroom": ["Toilet paper", "Towels", "Hot water", "Shower", "Bath", "Slippers", "Hairdryer", "Free toiletries"],
  "Kitchen & Dining": ["Refrigerator", "Microwave", "Electric kettle", "Coffee machine", "Dining table", "Oven", "Toaster", "Rice cooker"],
  "Media & Technology": ["Smart TV", "Netflix", "Flat-screen TV", "Cable channels", "Satellite channels", "Sound system"],
  "Safety & Security": ["CCTV", "Fire extinguishers", "Smoke alarms", "Security alarm", "First aid kit", "24-hour security"],
  "Outdoor & Activities": ["BBQ facilities", "Outdoor furniture", "Sun deck", "Bike rental", "Walking tours", "Camp fire", "Pool view", "Garden view"],
  "Accessibility": ["Ground floor", "Wheelchair accessible", "Raised toilet", "Grab rails", "Wide doorway"]
};

function renderPropertyFacilityChecklist(){
  const box = document.getElementById("propertyFacilityChecklist");
  if(!box) return;
  box.innerHTML = Object.entries(PROPERTY_FACILITY_GROUPS).map(([group, items]) => `
    <div class="facility-group">
      <h4>${escapeHtml(group)}</h4>
      <div class="facility-options">
        ${items.map(item => `
          <label><input type="checkbox" class="prop-facility-check" value="${escapeHtml(item)}"> ${escapeHtml(item)}</label>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function getCheckedPropertyFacilities(){
  return Array.from(document.querySelectorAll(".prop-facility-check:checked")).map(x => x.value);
}

function setCheckedPropertyFacilities(values = []){
  const set = new Set((values || []).map(x => String(x).toLowerCase()));
  document.querySelectorAll(".prop-facility-check").forEach(cb => {
    cb.checked = set.has(String(cb.value).toLowerCase());
  });
}

/* PROPERTIES */

async function loadProperties() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/properties`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load properties");
    window.allProperties = data || [];
    renderManualPropertyDropdown(window.allProperties); filterManualProperties(); renderPropertiesTable(); renderAvailabilityMatrix();
    const box = document.getElementById("propertiesList"); if (box) box.innerHTML = "";
  } catch (err) { alert(err.message); }
}
function renderPropertiesTable(){
  const tbody=document.getElementById("propertiesTableBody"); if(!tbody) return;
  const search=(document.getElementById("propertySearch")?.value||"").toLowerCase();
  const type=document.getElementById("propertyTypeFilter")?.value||"all";
  const status=document.getElementById("propertyStatusFilter")?.value||"all";
  let data=(window.allProperties||[]).filter(item=>{ const text=`${item.name||""} ${item.type||""} ${item.location||""} ${item.price||""}`.toLowerCase(); return (!search||text.includes(search)) && (type==="all"||String(item.type||"")===type) && statusFilterMatch(item,status); });
  data=sortByCms("properties",data);
  if(!data.length){ tbody.innerHTML=`<tr><td colspan="9" class="empty-row">No properties found</td></tr>`; return; }
  tbody.innerHTML=data.map(item=>`<tr class="clickable-row" onclick="editPropertyById('${escapeJs(item.id)}')"><td><strong>${escapeHtml(item.name||"-")}</strong><br><small>${escapeHtml(item.mapUrl||"")}</small></td><td>${escapeHtml(item.type||"-")}</td><td>${escapeHtml(item.location||"-")}</td><td>${escapeHtml(item.price||"-")}</td><td>${escapeHtml(item.guests||"-")}</td><td>${escapeHtml(item.bedrooms||"-")} / ${escapeHtml(item.bathrooms||"-")}</td><td>${cmsStatusBadge(item.active)}</td><td>${cmsFeaturedBadge(item.featured)}</td><td onclick="event.stopPropagation();"><button class="mini-btn" onclick="editPropertyById('${escapeJs(item.id)}')">Edit</button><button class="delete-btn mini-btn" onclick="deleteProperty('${escapeJs(item.id)}')">Delete</button></td></tr>`).join("");
}
function openAddPropertyForm(type="villa"){ resetPropertyForm(); document.getElementById("propType").value=type; const t=document.getElementById("propertyFormBoxTitle"); if(t)t.textContent=`Add New ${type.charAt(0).toUpperCase()+type.slice(1)}`; showCmsForm("propertyFormBox"); }
function editPropertyById(id){ const item=(window.allProperties||[]).find(x=>String(x.id)===String(id)); if(item) editProperty(item); }

async function saveProperty(e) {
  e.preventDefault();

  const editId = document.getElementById("propEditId").value;

  const data = {
    type: document.getElementById("propType").value,
    name: document.getElementById("propName").value.trim(),
    location: document.getElementById("propLocation").value.trim(),
    lat: document.getElementById("propLat").value.trim(),
    lng: document.getElementById("propLng").value.trim(),
    mapUrl: document.getElementById("propMapUrl").value.trim(),
    mainImage: document.getElementById("propMainImage")?.value.trim() || "",
    logoImage: document.getElementById("propLogo")?.value.trim() || "",
    price: document.getElementById("propPrice").value.trim(),
    guests: document.getElementById("propGuests").value.trim(),
    bedrooms: document.getElementById("propBedrooms").value.trim(),
    bathrooms: document.getElementById("propBathrooms").value.trim(),
    facilities: getCheckedPropertyFacilities().length ? getCheckedPropertyFacilities() : linesToArray(document.getElementById("propFacilities").value),
    description: document.getElementById("propDescription").value.trim(),
    photos: linesToArray(document.getElementById("propPhotos").value),
    active: document.getElementById("propActive").checked,
    featured: document.getElementById("propFeatured").checked,
  };

  const url = editId ? `${API_BASE}/api/admin/properties/${editId}` : `${API_BASE}/api/admin/properties`;
  const method = editId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();
  if (!res.ok) return alert(result.error || "Save failed");

  alert(result.message || "Saved");
  resetPropertyForm();
  loadProperties();
}

function editProperty(item) {
  const t=document.getElementById("propertyFormBoxTitle"); if(t)t.textContent="Edit Property";
  document.getElementById("propEditId").value = item.id;
  document.getElementById("propType").value = item.type || "villa";
  document.getElementById("propName").value = item.name || "";
  document.getElementById("propLocation").value = item.location || "";
  document.getElementById("propLat").value = item.lat || "";
  document.getElementById("propLng").value = item.lng || "";
  document.getElementById("propMapUrl").value = item.mapUrl || "";
  if (document.getElementById("propMainImage")) document.getElementById("propMainImage").value = item.mainImage || "";
  if (document.getElementById("propLogo")) document.getElementById("propLogo").value = item.logoImage || "";
  document.getElementById("propPrice").value = item.price || "";
  document.getElementById("propGuests").value = item.guests || "";
  document.getElementById("propBedrooms").value = item.bedrooms || "";
  document.getElementById("propBathrooms").value = item.bathrooms || "";
  document.getElementById("propFacilities").value = arrayToLines(item.facilities);
  setCheckedPropertyFacilities(item.facilities || []);
  document.getElementById("propDescription").value = item.description || "";
  document.getElementById("propPhotos").value = arrayToLines(item.photos);
  document.getElementById("propActive").checked = !!item.active;
  document.getElementById("propFeatured").checked = item.featured || false;
  renderPhotoPreview("prop");
  showCmsForm("propertyFormBox");
}

function resetPropertyForm() {
  document.getElementById("propertyForm").reset();
  document.getElementById("propEditId").value = "";
  document.getElementById("propActive").checked = true;
  document.getElementById("propUploadStatus").textContent = "";
  document.getElementById("propPhotoPreview").innerHTML = "";
  document.getElementById("propFeatured").checked = false;
  document.getElementById("propMapUrl").value = "";
  if (document.getElementById("propMainImage")) document.getElementById("propMainImage").value = "";
  if (document.getElementById("propLogo")) document.getElementById("propLogo").value = "";
  setCheckedPropertyFacilities([]);
}

async function deleteProperty(id) {
  if (!confirm("Delete this property?")) return;

  const res = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();
  if (!res.ok) return alert(result.error || "Delete failed");

  alert("Deleted");
  loadProperties();
}

/* IMAGE PREVIEW */

function openImagePreview(url) {
  document.getElementById("previewFullImage").src = url;
  document.getElementById("imagePreviewModal").style.display = "flex";
}

function closeImagePreview() {
  document.getElementById("imagePreviewModal").style.display = "none";
}

/* PAGE CONTROL */

async function loadSiteContent() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/site-content`, { headers: authHeaders() });
    const data = await res.json();

    Object.entries(data).forEach(([key, value]) => {
      const el = document.getElementById(key);

      if (el) {
        el.value = value || "";
      }
    });
  } catch (err) {
    console.error(err);
  }
}

async function saveSiteContent(e) {
  e.preventDefault();

  const keys = [
    "site_logo",
    "site_favicon",
    "site_primary_color",
    "site_secondary_color",
    "site_background_color",
    "site_text_color",
    "contact_email",
    "contact_whatsapp",
    "facebook_url",
    "instagram_url",
    "home_hero_title",
    "home_hero_subtitle",
    "home_hero_media",
    "home_hero_text_color",
    "home_hero_button_color"
  ];

  const payload = {};

  for (const key of keys) {
    const el = document.getElementById(key);
    if (el) {
      payload[key] = el.value;
    }
  }

  const res = await fetch(`${API_BASE}/api/admin/site-content`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Save failed");
    return;
  }

  alert("Page Control Saved");
}

async function loadPageSections() {
  const page = document.getElementById("sectionFilterPage")?.value || "home";

  const res = await fetch(`${API_BASE}/api/admin/page-sections?page=${page}`, {
    headers: authHeaders()
  });

  const data = await res.json();
  const box = document.getElementById("sectionsList");
  if (!box) return;

  box.innerHTML = "";

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <span class="status ${item.active ? "" : "off"}">${item.active ? "Active" : "Hidden"}</span>
      <h3>${item.title || "Untitled Section"}</h3>
      <p><strong>Key:</strong> ${item.sectionKey || ""}</p>
      <p><strong>Type:</strong> ${item.sectionType || ""}</p>
      <p><strong>Page:</strong> ${item.page || ""}</p>
      <p><strong>Sort:</strong> ${item.sortOrder || 0}</p>
      <button class="edit-btn" onclick="editPageSection('${item.id}')">Edit</button>
      <button class="delete-btn" onclick="deleteSection('${item.id}')">Delete</button>
    `;

    box.appendChild(card);
  });
}

async function savePageSection(e) {
  e.preventDefault();

  const editId = document.getElementById("sectionEditId").value;

  const videoUrl = document.getElementById("sectionVideo")?.value.trim() || "";

  const settings = {
    videoUrl,
    gradientStart: document.getElementById("sectionGradientStart")?.value || "",
    gradientEnd: document.getElementById("sectionGradientEnd")?.value || "",
    paddingTop: pxValue("sectionPaddingTop"),
    paddingBottom: pxValue("sectionPaddingBottom"),
    borderRadius: pxValue("sectionBorderRadius"),
    shadow: document.getElementById("sectionShadow")?.value || "",
    animation: document.getElementById("sectionAnimation")?.value || "",
    cards: collectCards()
  };

  const backgroundImage = document.getElementById("sectionBackgroundImage")?.value.trim() || "";

  const data = {
    id: editId || "",
    page: document.getElementById("sectionPage").value,
    sectionKey: document.getElementById("sectionKey").value,
    sectionType: document.getElementById("sectionType").value,
    title: document.getElementById("sectionTitle").value.trim(),
    subtitle: document.getElementById("sectionSubtitle").value.trim(),
    content: document.getElementById("sectionContent").value.trim(),
    mediaUrl: document.getElementById("sectionImage").value.trim(),
    backgroundType: backgroundImage ? "image" : "color",
    backgroundColor: document.getElementById("sectionBgColor").value,
    backgroundImage,
    textColor: document.getElementById("sectionTextColor").value,
    buttonColor: document.getElementById("sectionButtonColor").value,
    fontFamily: document.getElementById("sectionFontFamily").value,
    sortOrder: document.getElementById("sectionSortOrder").value,
    active: document.getElementById("sectionActive").checked,
    settings
  };

  const res = await fetch(`${API_BASE}/api/admin/page-sections`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Save section failed");
    return;
  }

  alert(result.message || "Section saved");
  resetSectionForm();
  loadPageSections();
}

async function editPageSection(id) {
  const page = document.getElementById("sectionFilterPage")?.value || "home";
  const builderBox = document.getElementById("sectionBuilderBox");
  if (builderBox) builderBox.classList.remove("hidden");

  const res = await fetch(`${API_BASE}/api/admin/page-sections?page=${page}`, {
    headers: authHeaders()
  });

  const data = await res.json();
  const item = data.find(x => x.id === id);

  if (!item) return;

  let settings = {};
  try {
    settings = typeof item.settings === "string"
      ? JSON.parse(item.settings || "{}")
      : item.settings || {};
  } catch {
    settings = {};
  }

  document.getElementById("sectionEditId").value = item.id;
  document.getElementById("sectionPage").value = item.page || "home";
  document.getElementById("sectionKey").value = item.sectionKey || "custom";
  document.getElementById("sectionType").value = item.sectionType || "custom";
  document.getElementById("sectionTitle").value = item.title || "";
  document.getElementById("sectionSubtitle").value = item.subtitle || "";
  document.getElementById("sectionContent").value = item.content || "";
  document.getElementById("sectionImage").value = item.mediaUrl || "";
  document.getElementById("sectionVideo").value = settings.videoUrl || "";
  document.getElementById("sectionBgColor").value = item.backgroundColor || "#ffffff";
  document.getElementById("sectionBackgroundImage").value = item.backgroundImage || "";
  document.getElementById("sectionTextColor").value = item.textColor || "#222222";
  document.getElementById("sectionButtonColor").value = item.buttonColor || "#0f766e";
  document.getElementById("sectionFontFamily").value = item.fontFamily || "";
  document.getElementById("sectionSortOrder").value = item.sortOrder || 0;
  document.getElementById("sectionActive").checked = !!item.active;

  document.getElementById("sectionGradientStart").value = settings.gradientStart || "#ffffff";
  document.getElementById("sectionGradientEnd").value = settings.gradientEnd || "#f8f3eb";
  document.getElementById("sectionPaddingTop").value = stripPx(settings.paddingTop);
  document.getElementById("sectionPaddingBottom").value = stripPx(settings.paddingBottom);
  document.getElementById("sectionBorderRadius").value = stripPx(settings.borderRadius);
  document.getElementById("sectionShadow").value = settings.shadow || "";
  document.getElementById("sectionAnimation").value = settings.animation || "";
  loadCards(settings.cards || []);

  document.getElementById("sectionBuilderBox")?.classList.remove("hidden");
}

function resetSectionForm() {
  document.getElementById("sectionForm").reset();
  document.getElementById("sectionEditId").value = "";
  document.getElementById("sectionActive").checked = true;

  const cardsBox = document.getElementById("cardsBuilder");
  if (cardsBox) cardsBox.innerHTML = "";
}

async function deleteSection(id) {
  if (!confirm("Delete section?")) return;

  await fetch(`${API_BASE}/api/admin/page-sections/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  loadPageSections();
}

function toggleGlobalSettings() {
  const box = document.getElementById("siteContentForm");
  if (!box) return;
  box.classList.toggle("hidden");
}

function toggleSectionBuilder() {
  const box = document.getElementById("sectionBuilderBox");
  if (box) box.classList.toggle("hidden");
}

function addCardItem(card = {}) {
  const box = document.getElementById("cardsBuilder");
  if (!box) return;

  const index = box.children.length;

  const item = document.createElement("div");
  item.className = "card-builder-item";

  item.innerHTML = `
    <h4>Card ${index + 1}</h4>

    <label>Card Title</label>
    <input class="card-title" />

    <label>Card Description</label>
    <textarea class="card-description"></textarea>

    <label>Card Image</label>
    <div class="upload-box"
         ondragover="handleDragOver(event)"
         ondragleave="handleDragLeave(event)"
         ondrop="handleCardImageDrop(event, this)">
      <h3>Upload Card Image</h3>
      <p>Drag & drop image here, or browse.</p>
      <input type="file" class="card-image-uploader" accept="image/*" onchange="uploadCardImage(this)" />
      <button type="button" onclick="this.previousElementSibling.click()">Browse Image</button>
    </div>
    <input class="card-image" readonly />

    <label>Button Text</label>
    <input class="card-button-text" />

    <label>Button URL</label>
    <input class="card-button-url" />

    <button type="button" class="delete-btn" onclick="this.parentElement.remove()">
      Remove Card
    </button>
  `;

  box.appendChild(item);

  item.querySelector(".card-title").value = card.title || "";
  item.querySelector(".card-description").value = card.description || "";
  item.querySelector(".card-image").value = card.image || "";
  item.querySelector(".card-button-text").value = card.buttonText || "";
  item.querySelector(".card-button-url").value = card.buttonUrl || "";
}

function collectCards() {
  return Array.from(document.querySelectorAll(".card-builder-item")).map(item => ({
    title: item.querySelector(".card-title")?.value.trim() || "",
    description: item.querySelector(".card-description")?.value.trim() || "",
    image: item.querySelector(".card-image")?.value.trim() || "",
    buttonText: item.querySelector(".card-button-text")?.value.trim() || "",
    buttonUrl: item.querySelector(".card-button-url")?.value.trim() || ""
  })).filter(card => card.title || card.description || card.image);
}

function loadCards(cards = []) {
  const box = document.getElementById("cardsBuilder");
  if (!box) return;

  box.innerHTML = "";
  cards.forEach(card => addCardItem(card));
}

function handleCardImageDrop(event, box) {
  event.preventDefault();
  box.classList.remove("drag-active");

  const file = event.dataTransfer.files[0];
  const cardItem = box.closest(".card-builder-item");
  const input = cardItem.querySelector(".card-image");

  uploadCardImageFile(file, input);
}

function uploadCardImage(fileInput) {
  const file = fileInput.files[0];
  const cardItem = fileInput.closest(".card-builder-item");
  const input = cardItem.querySelector(".card-image");

  uploadCardImageFile(file, input);
  fileInput.value = "";
}

async function uploadCardImageFile(file, input) {
  if (!file) return alert("Please select an image first.");

  input.value = "Uploading...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "card-images");

  try {
    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: "POST",
      headers: uploadHeaders(),
      body: formData
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || "Upload failed");

    input.value = result.url;
    alert("Card image uploaded");
  } catch (err) {
    input.value = "";
    alert(err.message);
  }
}

async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/services`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load services");

    allServices = data || [];

    setFilterOptions(
      "serviceCategoryFilter",
      allServices.map(x => x.category),
      "All Categories"
    );

    setFilterOptions(
      "serviceLocationFilter",
      allServices.map(x => x.location),
      "All Locations"
    );

    renderServicesTable();

    const box = document.getElementById("servicesList");
    if (box) box.innerHTML = "";

  } catch (err) {
    alert(err.message);
  }
}
function renderServicesTable(){
  const tbody=document.getElementById("servicesTableBody"); if(!tbody) return;
  const search=(document.getElementById("serviceSearch")?.value||"").toLowerCase();
  const category=document.getElementById("serviceCategoryFilter")?.value||"all";
  const location=document.getElementById("serviceLocationFilter")?.value||"all";
  const status=document.getElementById("serviceStatusFilter")?.value||"all";
  let data=allServices.filter(item=>{ const text=`${item.name||""} ${item.category||""} ${item.location||""} ${item.nearestCity||""} ${item.phone||""}`.toLowerCase(); return (!search||text.includes(search)) && (category==="all"||String(item.category||"")===category) && (location==="all"||String(item.location||"")===location) && statusFilterMatch(item,status); });
  data=sortByCms("services",data);
  if(!data.length){ tbody.innerHTML=`<tr><td colspan="8" class="empty-row">No cafes or services found</td></tr>`; return; }
  tbody.innerHTML=data.map(item=>`<tr class="clickable-row" onclick="editServiceById('${escapeJs(item.id)}')"><td><strong>${escapeHtml(item.name||"-")}</strong><br><small>${escapeHtml(item.website||"")}</small></td><td>${escapeHtml(item.category||"-")}</td><td>${escapeHtml(item.location||"-")}<br><small>${escapeHtml(item.nearestCity||"")}</small></td><td>${escapeHtml(item.phone||"-")}</td><td>${escapeHtml(item.whatsapp||"-")}</td><td>${cmsStatusBadge(item.active)}</td><td>${cmsFeaturedBadge(item.featured)}</td><td onclick="event.stopPropagation();"><button class="mini-btn" onclick="editServiceById('${escapeJs(item.id)}')">Edit</button><button class="delete-btn mini-btn" onclick="deleteService('${escapeJs(item.id)}')">Delete</button></td></tr>`).join("");
}
function openAddServiceForm(){ resetServiceForm(); const t=document.getElementById("serviceFormBoxTitle"); if(t)t.textContent="Add New Cafe / Service"; showCmsForm("serviceFormBox"); }
function editServiceById(id){ const item=allServices.find(x=>String(x.id)===String(id)); if(item) editService(item); }

async function saveService(e) {
  e.preventDefault();

  const editId = document.getElementById("serviceEditId").value;

  const data = {
    id: editId || "",
    name: document.getElementById("serviceName").value.trim(),
    category: document.getElementById("serviceCategory").value,
    location: document.getElementById("serviceLocation").value.trim(),
    nearestCity: document.getElementById("serviceNearestCity")?.value.trim() || "",
    lat: document.getElementById("serviceLat")?.value.trim() || "",
    lng: document.getElementById("serviceLng")?.value.trim() || "",
    logoImage: document.getElementById("serviceLogo")?.value.trim() || "",
    shortDescription: document.getElementById("serviceShortDescription").value.trim(),
    fullDescription: document.getElementById("serviceFullDescription").value.trim(),
    phone: document.getElementById("servicePhone").value.trim(),
    whatsapp: document.getElementById("serviceWhatsapp").value.trim(),
    website: document.getElementById("serviceWebsite").value.trim(),
    mapUrl: document.getElementById("serviceMapUrl").value.trim(),
    openingHours: document.getElementById("serviceOpeningHours").value.trim(),
    image: document.getElementById("serviceImage").value.trim(),
    photos: linesToArray(document.getElementById("servicePhotos").value),
    active: document.getElementById("serviceActive").checked,
    featured: document.getElementById("serviceFeatured").checked,
  };

  const res = await fetch(`${API_BASE}/api/admin/services`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Service save failed");
    return;
  }

  alert(result.message || "Service saved");
  resetServiceForm();
  loadServices();
}

function editService(item) {
  const t=document.getElementById("serviceFormBoxTitle"); if(t)t.textContent="Edit Cafe / Service";
  document.getElementById("serviceEditId").value = item.id || "";
  document.getElementById("serviceName").value = item.name || "";
  document.getElementById("serviceCategory").value = item.category || "Cafe";
  document.getElementById("serviceLocation").value = item.location || "";
  if (document.getElementById("serviceNearestCity")) document.getElementById("serviceNearestCity").value = item.nearestCity || "";
  if (document.getElementById("serviceLat")) document.getElementById("serviceLat").value = item.lat || "";
  if (document.getElementById("serviceLng")) document.getElementById("serviceLng").value = item.lng || "";
  document.getElementById("serviceShortDescription").value = item.shortDescription || "";
  document.getElementById("serviceFullDescription").value = item.fullDescription || "";
  document.getElementById("servicePhone").value = item.phone || "";
  document.getElementById("serviceWhatsapp").value = item.whatsapp || "";
  document.getElementById("serviceWebsite").value = item.website || "";
  document.getElementById("serviceMapUrl").value = item.mapUrl || "";
  document.getElementById("serviceOpeningHours").value = item.openingHours || "";
  if (document.getElementById("serviceLogo")) document.getElementById("serviceLogo").value = item.logoImage || "";
  document.getElementById("serviceImage").value = item.image || "";
  document.getElementById("servicePhotos").value = arrayToLines(item.photos);
  document.getElementById("serviceActive").checked = !!item.active;
  document.getElementById("serviceFeatured").checked = item.featured || false;

  renderServicePhotosPreview();

  showCmsForm("serviceFormBox");
}

function resetServiceForm() {
  document.getElementById("serviceForm").reset();
  document.getElementById("serviceEditId").value = "";
  document.getElementById("serviceActive").checked = true;
  document.getElementById("serviceImageUploadStatus").textContent = "";
  document.getElementById("servicePhotosUploadStatus").textContent = "";
  document.getElementById("servicePhotos").value = "";
  document.getElementById("servicePhotosPreview").innerHTML = "";
  document.getElementById("serviceFeatured").checked = false;
  if (document.getElementById("serviceNearestCity")) document.getElementById("serviceNearestCity").value = "";
  if (document.getElementById("serviceLat")) document.getElementById("serviceLat").value = "";
  if (document.getElementById("serviceLng")) document.getElementById("serviceLng").value = "";
  if (document.getElementById("serviceLogo")) document.getElementById("serviceLogo").value = "";
}

async function deleteService(id) {
  if (!confirm("Delete this service?")) return;

  const res = await fetch(`${API_BASE}/api/admin/services/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Deleted");
  loadServices();
}

/* SERVICE IMAGE UPLOADS */

function handleServiceImageDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");

  const file = event.dataTransfer.files[0];
  uploadSingleServiceImage(file);
}

function uploadServiceImage() {
  const input = document.getElementById("serviceImageUploader");
  if (!input.files.length) return;

  uploadSingleServiceImage(input.files[0]);
  input.value = "";
}

async function uploadSingleServiceImage(file) {
  if (!file) return alert("Please select image first.");

  const status = document.getElementById("serviceImageUploadStatus");
  const imageBox = document.getElementById("serviceImage");

  status.textContent = "Uploading image...";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "services");

  try {
    const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
      method: "POST",
      headers: uploadHeaders(),
      body: formData
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error || "Upload failed");

    imageBox.value = result.url;
    status.textContent = "Main image uploaded.";
  } catch (err) {
    status.textContent = "";
    alert(err.message);
  }
}

function handleServicePhotosDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-active");

  uploadServicePhotosList(event.dataTransfer.files);
}

function uploadServicePhotos() {
  const input = document.getElementById("servicePhotosUploader");
  if (!input.files.length) return;

  uploadServicePhotosList(input.files);
  input.value = "";
}

async function uploadServicePhotosList(files) {
  const status = document.getElementById("servicePhotosUploadStatus");
  const photosBox = document.getElementById("servicePhotos");

  if (!files || !files.length) return alert("Please select photos first.");

  status.textContent = `Uploading ${files.length} photo(s)...`;

  const uploadedUrls = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "services");

    try {
      const res = await fetch(`${API_BASE}/api/admin/upload-image`, {
        method: "POST",
        headers: uploadHeaders(),
        body: formData
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Upload failed");

      uploadedUrls.push(result.url);
    } catch (err) {
      alert(err.message);
    }
  }

  if (uploadedUrls.length) {
    const existing = photosBox.value.trim();
    photosBox.value = [existing, ...uploadedUrls].filter(Boolean).join("\n");
    renderServicePhotosPreview();
    status.textContent = "Gallery photos uploaded.";
  } else {
    status.textContent = "No photos uploaded.";
  }
}

function renderServicePhotosPreview() {
  const box = document.getElementById("servicePhotosPreview");
  const photosBox = document.getElementById("servicePhotos");

  if (!box || !photosBox) return;

  const urls = linesToArray(photosBox.value);

  box.innerHTML = "";

  urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";

    item.innerHTML = `
      <img src="${url}" alt="Service Photo ${index + 1}" onclick="openImagePreview('${url}')">
      <button type="button" onclick="removeServicePhoto(${index})">×</button>
    `;

    box.appendChild(item);
  });
}

function removeServicePhoto(index) {
  const photosBox = document.getElementById("servicePhotos");
  const urls = linesToArray(photosBox.value);

  urls.splice(index, 1);
  photosBox.value = urls.join("\n");

  renderServicePhotosPreview();
}


/* =========================
   V6 ENTERPRISE LAYOUT HELPERS
========================= */

function classifyInquiryItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();

  if (text.includes("tour")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact")) return "service";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function classifyBookingItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();

  if (String(item.reference || "").startsWith("MAN-") || text.includes("manual")) return "manual";
  if (text.includes("tour")) return "tour";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function setInquiryMode(mode, btn){
  v6InquiryMode = mode || "all";
  document.getElementById("v6InquiryMode") && (document.getElementById("v6InquiryMode").value = v6InquiryMode);
  document.querySelectorAll("[data-inquiry-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyInquiryFilters();
}

function setBookingMode(mode, btn){
  v6BookingMode = mode || "all";
  document.getElementById("v6BookingMode") && (document.getElementById("v6BookingMode").value = v6BookingMode);
  document.querySelectorAll("[data-booking-mode]").forEach(x => x.classList.remove("active"));
  btn?.classList.add("active");
  applyBookingFilters();
}

function v6WrapFormFields(formSelector){
  const form = document.querySelector(formSelector);
  if(!form || form.dataset.v6Wrapped === "1") return;

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
    if(el.type === "hidden" || el.closest(".v6-field-wrap") || el.closest(".upload-box")) return;
    const text = labelMap[el.id];
    if(!text) return;

    const wrap = document.createElement("div");
    wrap.className = "v6-field-wrap";

    const label = document.createElement("label");
    label.textContent = text;

    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(label);
    wrap.appendChild(el);
  });

  form.dataset.v6Wrapped = "1";
}

function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  box.classList.remove("hidden");
  box.classList.add("v6-cms-modal-open");

  if(!box.querySelector(".v6-cms-modal-head")){
    const head = document.createElement("div");
    head.className = "v6-cms-modal-head";
    head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;
    box.insertBefore(head, box.firstChild);
  }else{
    box.querySelector(".v6-cms-modal-head h3").textContent = title || "Edit Details";
  }

  v6WrapFormFields("#propertyForm");
  v6WrapFormFields("#destinationForm");
  v6WrapFormFields("#serviceForm");
}

function v6CloseCmsModal(formBoxId){
  const box = document.getElementById(formBoxId);
  if(!box) return;
  box.classList.add("hidden");
  box.classList.remove("v6-cms-modal-open");
}

/* =========================
   REVIEWS MANAGEMENT
========================= */

async function loadReviews(){
  try{
    const res = await fetch(`${API_BASE}/api/admin/reviews`, { headers: authHeaders() });
    const data = await res.json();

    if(!res.ok) throw new Error(data.error || "Failed to load reviews");

    allReviews = data || [];
    renderReviewsSummary();
    renderReviewsTable();
  }catch(err){
    const tbody = document.getElementById("reviewsTableBody");
    if(tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-row">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderReviewsSummary(){
  const box = document.getElementById("reviewsSummary");
  if(!box) return;

  const published = allReviews.filter(x => x.active).length;
  const featured = allReviews.filter(x => x.featured).length;
  const avg = allReviews.length
    ? (allReviews.reduce((s,x)=>s + Number(x.rating || 0),0) / allReviews.length).toFixed(1)
    : "0.0";

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Reviews</h3><div class="value">${allReviews.length}</div></div>
    <div class="dashboard-card card-booked"><h3>Published</h3><div class="value">${published}</div></div>
    <div class="dashboard-card"><h3>Featured</h3><div class="value">${featured}</div></div>
    <div class="dashboard-card"><h3>Average Rating</h3><div class="value">${avg}</div></div>
  `;
}

function renderReviewsTable(){
  const tbody = document.getElementById("reviewsTableBody");
  if(!tbody) return;

  const search = (document.getElementById("reviewSearch")?.value || "").toLowerCase();
  const type = document.getElementById("reviewTypeFilter")?.value || "all";
  const status = document.getElementById("reviewStatusFilter")?.value || "all";

  let data = allReviews.filter(r => {
    const text = `${r.guestName || ""} ${r.country || ""} ${r.itemName || ""} ${r.title || ""} ${r.message || ""}`.toLowerCase();
    const typeOk = type === "all" || String(r.type || "") === type;
    const statusOk =
      status === "all" ||
      (status === "published" && r.active) ||
      (status === "hidden" && !r.active) ||
      (status === "featured" && r.featured);

    return typeOk && statusOk && (!search || text.includes(search));
  });

  if(!data.length){
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No reviews found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr class="clickable-row" onclick="editReview('${escapeJs(r.id)}')">
      <td>${formatDate(r.createdAt || r.created_at || "")}</td>
      <td><strong>${escapeHtml(r.guestName || "-")}</strong><br><small>${escapeHtml(r.country || "")}</small></td>
      <td>${escapeHtml(r.type || "-")}</td>
      <td>${escapeHtml(r.itemName || "-")}</td>
      <td>${"★".repeat(Number(r.rating || 0))}</td>
      <td>${r.active ? cmsStatusBadge(true) : cmsStatusBadge(false)}</td>
      <td>${cmsFeaturedBadge(r.featured)}</td>
      <td onclick="event.stopPropagation();">
        <button class="mini-btn" onclick="editReview('${escapeJs(r.id)}')">Edit</button>
        <button class="delete-btn mini-btn" onclick="deleteReview('${escapeJs(r.id)}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openReviewForm(){
  document.getElementById("reviewForm")?.reset();
  document.getElementById("reviewEditId").value = "";
  document.getElementById("reviewActive").checked = true;
  document.getElementById("reviewFeatured").checked = false;
  document.getElementById("reviewModalTitle").textContent = "Add Review";
  document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReviewForm(){
  document.getElementById("reviewModal").classList.add("hidden");
}

function editReview(id){
  const r = allReviews.find(x => String(x.id) === String(id));
  if(!r) return;

  document.getElementById("reviewModalTitle").textContent = "Edit Review";
  document.getElementById("reviewEditId").value = r.id || "";
  document.getElementById("reviewType").value = r.type || "property";
  document.getElementById("reviewItemName").value = r.itemName || "";
  document.getElementById("reviewGuestName").value = r.guestName || "";
  document.getElementById("reviewCountry").value = r.country || "";
  document.getElementById("reviewRating").value = r.rating || "5";
  document.getElementById("reviewTitle").value = r.title || "";
  document.getElementById("reviewMessage").value = r.message || "";
  document.getElementById("reviewGuestPhoto").value = r.guestPhoto || "";
  document.getElementById("reviewSource").value = r.source || "Manual";
  document.getElementById("reviewSourceUrl").value = r.sourceUrl || "";
  document.getElementById("reviewActive").checked = !!r.active;
  document.getElementById("reviewFeatured").checked = !!r.featured;

  document.getElementById("reviewModal").classList.remove("hidden");
}

async function saveReview(e){
  e.preventDefault();

  const id = document.getElementById("reviewEditId").value || "";

  const data = {
    id,
    type: document.getElementById("reviewType").value,
    itemName: document.getElementById("reviewItemName").value.trim(),
    guestName: document.getElementById("reviewGuestName").value.trim(),
    country: document.getElementById("reviewCountry").value.trim(),
    rating: document.getElementById("reviewRating").value,
    title: document.getElementById("reviewTitle").value.trim(),
    message: document.getElementById("reviewMessage").value.trim(),
    guestPhoto: document.getElementById("reviewGuestPhoto").value.trim(),
    source: document.getElementById("reviewSource").value,
    sourceUrl: document.getElementById("reviewSourceUrl").value.trim(),
    active: document.getElementById("reviewActive").checked,
    featured: document.getElementById("reviewFeatured").checked
  };

  if(!data.itemName || !data.guestName || !data.message){
    alert("Please fill item name, guest name and review message.");
    return;
  }

  const res = await fetch(`${API_BASE}/api/admin/reviews`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Review save failed");
    return;
  }

  alert(result.message || "Review saved");
  closeReviewForm();
  await loadReviews();
}

async function deleteReview(id){
  if(!confirm("Delete this review?")) return;

  const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
    method:"DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Review delete failed");
    return;
  }

  alert("Review deleted");
  await loadReviews();
}

/* =========================
   INQUIRIES
========================= */

async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load inquiries");

    allInquiries = data || [];

    const visibleInquiries = allInquiries.filter(x => getInquiryCategory(x) === currentInquiryView);
    renderInquiryStats(visibleInquiries);
    renderDashboardCards(visibleInquiries);
    renderInquiryTypeCards(visibleInquiries);
    renderMonthlyInquiryChart(visibleInquiries);
    applyInquiryFilters();
    renderReports();

  } catch (err) {
    alert(err.message);
  }
}

async function updateInquiryStatus(id, status, sendEmail = false) {

  const inquiry = allInquiries.find(
    x => String(x.id) === String(id)
  );

  if (
    String(status).toLowerCase() === "booked" &&
    inquiry
  ) {
    currentInquiry = inquiry;
    await confirmBooking(sendEmail);
    return;
  }

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      status,
      sendEmail,
      adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || ""
    })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Status update failed");
    return;
  }

  alert(sendEmail ? "Inquiry updated and email sent" : "Inquiry updated");

  await loadInquiries();
  await loadBookings();

  if (currentInquiry && String(currentInquiry.id) === String(id)) {
    closeInquiryModal();
  }
}

async function deleteInquiry(id) {
  if (!confirm("Delete this inquiry?")) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Inquiry deleted");
  loadInquiries();
}

function applyInquiryFilters() {
  const searchInputs = document.querySelectorAll("#inquirySearch");
  let search = "";

  searchInputs.forEach(input => {
    if (input.value.trim()) search = input.value.toLowerCase();
  });

  const oldStatus = document.getElementById("inquiryFilter")?.value || "";
  const newStatus = document.getElementById("inquiryStatusFilter")?.value || "all";

  let status = "";
  if (newStatus && newStatus !== "all") status = newStatus.toLowerCase();
  if (oldStatus) status = oldStatus.toLowerCase();

  const filtered = allInquiries.filter(item => {
    if (getInquiryCategory(item) !== currentInquiryView) return false;
    const text = `
      ${item.reference || ""}
      ${item.guestName || ""}
      ${item.guestEmail || ""}
      ${item.guestMobile || ""}
      ${item.serviceType || ""}
      ${item.itemName || ""}
      ${item.message || ""}
    `.toLowerCase();

    const itemStatus = normalizeStatus(item.status);

    const mode = v6InquiryMode || document.getElementById("v6InquiryMode")?.value || "all";
    const modeMatch = mode === "all" || classifyInquiryItem(item) === mode;

    return modeMatch &&
           (!status || itemStatus === status) &&
           (!search || text.includes(search));
  });

  renderInquiryTable(filtered);

  const inquiryCardsBox = document.getElementById("inquiriesList");
  if (inquiryCardsBox) inquiryCardsBox.innerHTML = "";
}

function renderInquiryCards(data) {
  const box = document.getElementById("inquiriesList");
  if (!box) return;

  box.innerHTML = "";

  if (!data.length) {
    box.innerHTML = "<p>No inquiries found.</p>";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card inquiry-card";

    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    card.innerHTML = `
      <span class="status status-${statusClass}">
        ${escapeHtml(displayStatus)}
      </span>

      <h3>${escapeHtml(item.reference || "Inquiry")}</h3>

      <p><strong>Service:</strong> ${escapeHtml(item.serviceType || "")}</p>
      <p><strong>Item:</strong> ${escapeHtml(item.itemName || "")}</p>
      <p><strong>Name:</strong> ${escapeHtml(item.guestName || "")}</p>
      <p><strong>Email:</strong> ${escapeHtml(item.guestEmail || "")}</p>
      <p><strong>Mobile:</strong> ${escapeHtml(item.guestMobile || "")}</p>
      <p><strong>Country:</strong> ${escapeHtml(item.guestCountry || "")}</p>
      <p><strong>Guests:</strong> ${escapeHtml(item.guests || "")}</p>
      <p><strong>Dates:</strong> ${escapeHtml(item.dateFrom || "")} → ${escapeHtml(item.dateTo || "")}</p>

      <details>
        <summary>View Message</summary>
        <pre>${escapeHtml(item.message || "")}</pre>
      </details>

      <select class="inquiry-status">
        <option value="New">New</option>
        <option value="Contacted">Contacted</option>
        <option value="Quoted">Quoted</option>
        <option value="Booked">Booked</option>
        <option value="Closed">Closed</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      <button class="edit-btn">Update Status</button>
      <button class="delete-btn">Delete</button>
    `;

    card.querySelector(".inquiry-status").value = item.status || "New";

    card.querySelector(".edit-btn").onclick = () => {
      updateInquiryStatus(item.id, card.querySelector(".inquiry-status").value);
    };

    card.querySelector(".delete-btn").onclick = () => {
      deleteInquiry(item.id);
    };

    box.appendChild(card);
  });
}

function renderInquiryTable(data) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">No inquiries found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    return `
      <tr onclick="openInquiryModal('${item.id}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(item.serviceType || "-")}</td>
        <td>${escapeHtml(item.itemName || getItemNameFromService(item.serviceType) || "-")}</td>
        <td>${escapeHtml(item.guestName || "-")}</td>
        <td>${escapeHtml(item.dateFrom || "-")}</td>
        <td>${escapeHtml(item.dateTo || "-")}</td>
        <td>
          <span class="status-badge status-${statusClass}">
            ${escapeHtml(displayStatus)}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function renderInquiryStats(data) {
  const box = document.getElementById("inquiryStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;

  box.innerHTML = `
    <div class="stat">New (${count("New")})</div>
    <div class="stat">Contacted (${count("Contacted")})</div>
    <div class="stat">Quoted (${count("Quoted")})</div>
    <div class="stat">Booked (${count("Booked")})</div>
    <div class="stat">Closed (${count("Closed")})</div>
    <div class="stat">Cancelled (${count("Cancelled")})</div>
  `;
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const total = data.length;
  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;

  box.innerHTML = `
    <div class="dashboard-card">
      <h3>Total Inquiries</h3>
      <div class="value">${total}</div>
    </div>

    <div class="dashboard-card card-new">
      <h3>New</h3>
      <div class="value">${count("New")}</div>
    </div>

    <div class="dashboard-card card-contacted">
      <h3>Contacted</h3>
      <div class="value">${count("Contacted")}</div>
    </div>

    <div class="dashboard-card card-booked">
      <h3>Booked</h3>
      <div class="value">${count("Booked")}</div>
    </div>

    <div class="dashboard-card card-closed">
      <h3>Closed</h3>
      <div class="value">${count("Closed")}</div>
    </div>
  `;
}

function renderInquiryTypeCards(data) {
  const box = document.getElementById("inquiryTypeCards");
  if (!box) return;

  const countType = keyword =>
    data.filter(x =>
      (x.serviceType || "").toLowerCase().includes(keyword) ||
      (x.itemName || "").toLowerCase().includes(keyword)
    ).length;

  box.innerHTML = `
    <div class="dashboard-card">
      <h3>🏡 Villas</h3>
      <div class="value">${countType("villa")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🏢 Apartments</h3>
      <div class="value">${countType("apartment")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🏠 Homestays</h3>
      <div class="value">${countType("homestay")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🧭 Tours</h3>
      <div class="value">${countType("tour")}</div>
    </div>

    <div class="dashboard-card">
      <h3>📞 Contact</h3>
      <div class="value">${countType("contact")}</div>
    </div>
  `;
}

function renderMonthlyInquiryChart(data) {
  const box = document.getElementById("monthlyInquiryChart");
  if (!box) return;

  const months = {};

  data.forEach(item => {
    const date =
      item.createdAt ||
      item.created_at ||
      item.created ||
      item.dateFrom ||
      "";

    if (!date) return;

    const monthKey = String(date).slice(0, 7);
    if (!monthKey || monthKey.length < 7) return;

    months[monthKey] = (months[monthKey] || 0) + 1;
  });

  const entries = Object.entries(months).sort();

  if (!entries.length) {
    box.innerHTML = "";
    return;
  }

  const max = Math.max(...entries.map(x => x[1]));

  box.innerHTML = `
    <h3>Monthly Inquiry Trend</h3>
    <div class="chart-bars">
      ${entries.map(([month, count]) => `
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

function exportInquiriesCSV() {
  if (!allInquiries.length) {
    alert("No inquiries to export");
    return;
  }

  const rows = allInquiries.map(x => ({
    Reference: x.reference || "",
    Status: x.status || "",
    Service: x.serviceType || "",
    Item: x.itemName || "",
    Name: x.guestName || "",
    Email: x.guestEmail || "",
    Mobile: x.guestMobile || "",
    Country: x.guestCountry || "",
    Guests: x.guests || "",
    DateFrom: x.dateFrom || "",
    DateTo: x.dateTo || "",
    CreatedAt: x.createdAt || "",
    Message: x.message || ""
  }));

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h]).replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "ceybreez-inquiries.csv";
  a.click();
}

function normalizeStatus(status) {
  return String(status || "New").toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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


/* =========================
   V5.1 PROFESSIONAL UI + PREVIEW
========================= */

function initV51ProfessionalUI(){
  try{
    beautifyCmsForms();
    injectInquiryModePanel();
    injectBookingModePanel();
    injectPageControlPreviewPanel();
    updateModeButtons();
  }catch(err){
    console.warn("V5.1 UI init skipped", err);
  }
}

function humanizeField(id, placeholder){
  const labels = {
    destName:"Tour Location Name", destProvince:"Province", destArea:"Nearest City / Area", destLat:"Latitude", destLng:"Longitude", destMapUrl:"Google Map / Directions URL", destBestFor:"Best For", destTime:"Time Needed", destNearby:"Nearby Places", destDescription:"Description", destLogo:"Logo / Badge Image URL", destPhotos:"Gallery Photo URLs",
    propType:"Property Type", propName:"Property Name", propLocation:"Location / Area", propLat:"Latitude", propLng:"Longitude", propMapUrl:"Google Map / Directions URL", propPrice:"Price / Starting From", propGuests:"Maximum Guests", propBedrooms:"Bedrooms", propBathrooms:"Bathrooms", propFacilities:"Facilities", propDescription:"Description", propMainImage:"Main Cover Image URL", propLogo:"Logo / Badge Image URL", propPhotos:"Gallery Photo URLs",
    serviceName:"Business / Service Name", serviceCategory:"Category", serviceLocation:"Location", serviceNearestCity:"Nearest City / Area", serviceLat:"Latitude", serviceLng:"Longitude", serviceShortDescription:"Short Description", serviceFullDescription:"Full Description", servicePhone:"Phone", serviceWhatsapp:"WhatsApp", serviceWebsite:"Website", serviceMapUrl:"Google Map URL", serviceOpeningHours:"Opening Hours", serviceLogo:"Logo / Brand Image URL", serviceImage:"Main Image URL", servicePhotos:"Gallery Photo URLs",
    manualServiceType:"Booking Type", manualItemName:"Property / Tour", manualGuestName:"Guest Name", manualGuestEmail:"Guest Email", manualGuestMobile:"Guest Mobile / WhatsApp", manualDateFrom:"Start Date / Check-in", manualDateTo:"End Date / Check-out", manualGuests:"Guests",
    sectionPage:"Page", sectionKey:"Section Key", sectionType:"Section Type", sectionTitle:"Title", sectionSubtitle:"Subtitle", sectionContent:"Content", sectionImage:"Section Image URL", sectionVideo:"Section Video URL", sectionBgColor:"Background Color", sectionBackgroundImage:"Background Image URL", sectionGradientStart:"Gradient Start Color", sectionGradientEnd:"Gradient End Color", sectionPaddingTop:"Padding Top", sectionPaddingBottom:"Padding Bottom", sectionBorderRadius:"Border Radius", sectionShadow:"Shadow", sectionAnimation:"Animation", sectionTextColor:"Text Color", sectionButtonColor:"Button Color", sectionFontFamily:"Font Family", sectionSortOrder:"Sort Order"
  };
  if(labels[id]) return labels[id];
  const raw = placeholder || id || "Field";
  return String(raw).replace(/[_-]/g," ").replace(/\b\w/g, m => m.toUpperCase());
}

function beautifyCmsForms(){
  const formIds = ["destinationForm","propertyForm","serviceForm","manualBookingForm","sectionForm","siteContentForm"];
  formIds.forEach(formId => {
    const form = document.getElementById(formId);
    if(!form || form.dataset.v51Labelled === "1") return;
    form.querySelectorAll("input, select, textarea").forEach(el => {
      if(el.type === "hidden" || el.type === "file" || el.type === "checkbox") return;
      if(el.closest(".upload-box")) return;
      const prev = el.previousElementSibling;
      if(prev && prev.tagName && prev.tagName.toLowerCase() === "label") return;
      const label = document.createElement("label");
      label.className = "v51-field-label";
      label.textContent = humanizeField(el.id, el.placeholder);
      el.parentNode.insertBefore(label, el);
      if(el.placeholder && !el.dataset.oldPlaceholder){
        el.dataset.oldPlaceholder = el.placeholder;
        el.placeholder = "Enter " + label.textContent.toLowerCase();
      }
    });
    form.dataset.v51Labelled = "1";
  });
}

function injectInquiryModePanel(){
  const tab = document.getElementById("inquiriesTab");
  const title = document.getElementById("inquiryPageTitle");
  if(!tab || !title || document.getElementById("v51InquiryModePanel")) return;
  const panel = document.createElement("div");
  panel.id = "v51InquiryModePanel";
  panel.className = "v51-mode-panel";
  panel.innerHTML = `
    <div>
      <h3>Inquiry Management</h3>
      <p>Separate property and tour inquiries. Use one clean page with filtered tables.</p>
    </div>
    <div class="v51-mode-actions">
      <button type="button" data-mode="property" onclick="setInquiryModeV51('property')">Property Inquiries</button>
      <button type="button" data-mode="tour" onclick="setInquiryModeV51('tour')">Tour Inquiries</button>
    </div>
  `;
  title.insertAdjacentElement("afterend", panel);
}

function injectBookingModePanel(){
  const tab = document.getElementById("bookingsTab");
  const title = document.getElementById("bookingPageTitle");
  if(!tab || !title || document.getElementById("v51BookingModePanel")) return;
  const panel = document.createElement("div");
  panel.id = "v51BookingModePanel";
  panel.className = "v51-mode-panel booking-mode-panel";
  panel.innerHTML = `
    <div>
      <h3>Booking Management</h3>
      <p>Summary first, then booking table, calendar and availability matrix on the same page.</p>
    </div>
    <div class="v51-mode-actions">
      <button type="button" data-mode="property" onclick="setBookingModeV51('property')">Property Bookings</button>
      <button type="button" data-mode="tour" onclick="setBookingModeV51('tour')">Tour Bookings</button>
    </div>
  `;
  title.insertAdjacentElement("afterend", panel);
}

function setInquiryModeV51(mode){
  currentInquiryView = mode === "tour" ? "tour" : "property";
  const title = document.getElementById("inquiryPageTitle");
  if(title) title.textContent = currentInquiryView === "tour" ? "Tour Inquiry" : "Property Inquiry";
  updateModeButtons();
  applyInquiryFilters();
}

function setBookingModeV51(mode){
  currentBookingView = mode === "tour" ? "tour" : "property";
  const title = document.getElementById("bookingPageTitle");
  if(title) title.textContent = currentBookingView === "tour" ? "Tour Booking Management" : "Property Booking Management";
  const typeFilter = document.getElementById("bookingTypeFilter");
  if(typeFilter) typeFilter.value = currentBookingView === "tour" ? "tour" : "all";
  const matrixFilter = document.getElementById("matrixTypeFilter");
  if(matrixFilter) matrixFilter.value = currentBookingView === "tour" ? "tour" : "all";
  updateModeButtons();
  applyBookingFilters();
}

function updateModeButtons(){
  document.querySelectorAll("#v51InquiryModePanel [data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === currentInquiryView));
  document.querySelectorAll("#v51BookingModePanel [data-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === currentBookingView));
}

function injectPageControlPreviewPanel(){
  const pageTab = document.getElementById("pageControlTab");
  if(!pageTab || document.getElementById("v51PagePreviewPanel")) return;
  const panel = document.createElement("section");
  panel.id = "v51PagePreviewPanel";
  panel.className = "admin-section v51-preview-section";
  panel.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Live Page Preview</h2>
        <p>Preview your Page Control changes before they go to the main website.</p>
      </div>
      <div class="v51-preview-actions">
        <button type="button" onclick="previewCurrentSectionV51('desktop')">Desktop Preview</button>
        <button type="button" onclick="previewCurrentSectionV51('mobile')">Mobile Preview</button>
        <button type="button" onclick="window.open('https://ceybreez.com','_blank')">Open Live Site</button>
      </div>
    </div>
    <div id="v51PreviewCanvas" class="v51-preview-canvas desktop">
      <div class="v51-preview-empty">Select or edit a section, then click Preview.</div>
    </div>
  `;
  const firstToggle = pageTab.querySelector(".settings-toggle-row");
  if(firstToggle) firstToggle.insertAdjacentElement("beforebegin", panel);
  else pageTab.prepend(panel);
}

function previewCurrentSectionV51(device){
  const canvas = document.getElementById("v51PreviewCanvas");
  if(!canvas) return;
  canvas.className = `v51-preview-canvas ${device === "mobile" ? "mobile" : "desktop"}`;
  const title = document.getElementById("sectionTitle")?.value || document.getElementById("home_hero_title")?.value || "CeyBreez Preview";
  const subtitle = document.getElementById("sectionSubtitle")?.value || document.getElementById("home_hero_subtitle")?.value || "A peaceful escape in Sri Lanka";
  const content = document.getElementById("sectionContent")?.value || "Your section content preview will appear here before publishing to the main website.";
  const image = document.getElementById("sectionImage")?.value || document.getElementById("sectionBackgroundImage")?.value || document.getElementById("home_hero_media")?.value || "";
  const bg = document.getElementById("sectionBgColor")?.value || document.getElementById("site_background_color")?.value || "#ffffff";
  const text = document.getElementById("sectionTextColor")?.value || document.getElementById("site_text_color")?.value || "#222222";
  const btn = document.getElementById("sectionButtonColor")?.value || document.getElementById("home_hero_button_color")?.value || "#0f766e";
  const cards = typeof collectCards === "function" ? collectCards() : [];
  canvas.innerHTML = `
    <div class="v51-preview-page" style="background:${escapeHtml(bg)};color:${escapeHtml(text)};">
      ${image ? `<div class="v51-preview-media"><img src="${escapeHtml(image)}" alt="preview"></div>` : ""}
      <div class="v51-preview-content">
        <span class="v51-preview-label">Preview only - not published</span>
        <h1>${escapeHtml(title)}</h1>
        <h3>${escapeHtml(subtitle)}</h3>
        <p>${escapeHtml(content)}</p>
        <button style="background:${escapeHtml(btn)}">Sample CTA Button</button>
      </div>
      ${cards.length ? `<div class="v51-preview-cards">${cards.map(c => `<article>${c.image ? `<img src="${escapeHtml(c.image)}" alt="">` : ""}<h4>${escapeHtml(c.title)}</h4><p>${escapeHtml(c.description)}</p></article>`).join("")}</div>` : ""}
    </div>
  `;
}


/* =========================
   V6.1 HOTFIX OVERRIDES
========================= */

function classifyInquiryItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""} ${item.experiences || ""}`.toLowerCase();
  if (text.includes("tour")) return "tour";
  if (text.includes("cafe") || text.includes("service") || text.includes("restaurant") || text.includes("contact")) return "service";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
}

function classifyBookingItem(item){
  const text = `${item.category || ""} ${item.serviceType || ""} ${item.itemName || ""}`.toLowerCase();
  if (String(item.reference || "").startsWith("MAN-") || String(item.inquiryId || "").startsWith("MAN-")) return "manual";
  if (text.includes("tour")) return "tour";
  if (text.includes("villa") || text.includes("homestay") || text.includes("apartment") || text.includes("property")) return "property";
  return "property";
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

function renderBookingStats(data) {
  const box = document.getElementById("bookingStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status).length;
  const propertyCount = data.filter(x => classifyBookingItem(x) === "property").length;
  const tourCount = data.filter(x => classifyBookingItem(x) === "tour").length;
  const manualCount = data.filter(x => classifyBookingItem(x) === "manual").length;
  const today = toDateInputValue(new Date());
  const todayBookings = data.filter(x => normalizeStatus(x.status) === "booked" && bookingCoversDate(x, today)).length;

  box.innerHTML = `
    <div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div>
    <div class="dashboard-card"><h3>Property Bookings</h3><div class="value">${propertyCount}</div></div>
    <div class="dashboard-card"><h3>Tour Bookings</h3><div class="value">${tourCount}</div></div>
    <div class="dashboard-card"><h3>Manual Bookings</h3><div class="value">${manualCount}</div></div>
    <div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${count("booked")}</div></div>
    <div class="dashboard-card"><h3>Today Active</h3><div class="value">${todayBookings}</div></div>
    <div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${count("cancelled")}</div></div>
  `;
}

async function saveV6Settings(){
  const payload = {
    setting_default_currency: document.getElementById("setting_default_currency")?.value || "USD",
    setting_checkin_time: document.getElementById("setting_checkin_time")?.value || "14:00",
    setting_checkout_time: document.getElementById("setting_checkout_time")?.value || "11:00",
    setting_admin_email: document.getElementById("setting_admin_email")?.value || "",
    setting_whatsapp: document.getElementById("setting_whatsapp")?.value || "",
    setting_quote_valid_days: document.getElementById("setting_quote_valid_days")?.value || "3",
    setting_booking_message: document.getElementById("setting_booking_message")?.value || ""
  };

  const res = await fetch(`${API_BASE}/api/admin/site-content`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  if(!res.ok) return alert(result.error || "Settings save failed");
  alert("Settings saved");
}

async function loadV6Settings(){
  try{
    const res = await fetch(`${API_BASE}/api/admin/site-content`, { headers: authHeaders() });
    const data = await res.json();
    Object.entries(data || {}).forEach(([k,v]) => {
      const el = document.getElementById(k);
      if(el) el.value = v || "";
    });
  }catch(err){}
}


/* V6.2 override CMS modal open/close to prevent duplicate floating headers */
function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());

  const head = document.createElement("div");
  head.className = "v6-cms-modal-head";
  head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;
  box.insertBefore(head, box.firstChild);

  box.classList.remove("hidden");
  box.classList.add("v6-cms-modal-open");

  v6WrapFormFields("#propertyForm");
  v6WrapFormFields("#destinationForm");
  v6WrapFormFields("#serviceForm");
}

function v6CloseCmsModal(formBoxId){
  const box = document.getElementById(formBoxId);
  if(!box) return;
  box.classList.add("hidden");
  box.classList.remove("v6-cms-modal-open");
  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());
}


/* V6.3 hard modal open/close - wraps header + form in one centered shell */
function v6OpenCmsModal(formBoxId, title){
  const box = document.getElementById(formBoxId);
  if(!box) return;

  const form = box.querySelector("form");
  if(!form) return;

  // Remove any old/double headers and shells from earlier patches
  box.querySelectorAll(".v6-cms-modal-head").forEach(h => h.remove());

  let shell = box.querySelector(".v6-cms-modal-shell");

  if(!shell){
    shell = document.createElement("div");
    shell.className = "v6-cms-modal-shell";
    box.insertBefore(shell, box.firstChild);
  }

  const head = document.createElement("div");
  head.className = "v6-cms-modal-head";
  head.innerHTML = `<h3>${escapeHtml(title || "Edit Details")}</h3><button type="button" onclick="v6CloseCmsModal('${formBoxId}')">×</button>`;

  shell.innerHTML = "";
  shell.appendChild(head);
  shell.appendChild(form);

  // Inline hard styles to beat older CSS conflicts
  box.style.position = "fixed";
  box.style.inset = "0";
  box.style.width = "100vw";
  box.style.height = "100vh";
  box.style.margin = "0";
  box.style.padding = "24px";
  box.style.zIndex = "2147483000";
  box.style.background = "rgba(0,0,0,.62)";
  box.style.display = "block";

  shell.style.position = "fixed";
  shell.style.top = "50%";
  shell.style.left = "50%";
  shell.style.transform = "translate(-50%, -50%)";
  shell.style.width = "min(980px, 96vw)";
  shell.style.maxHeight = "92vh";
  shell.style.background = "#fff";
  shell.style.borderRadius = "22px";
  shell.style.overflow = "hidden";
  shell.style.boxShadow = "0 24px 70px rgba(0,0,0,.35)";

  box.classList.remove("hidden");
  box.classList.add("v6-cms-modal-open");

  v6WrapFormFields("#propertyForm");
  v6WrapFormFields("#destinationForm");
  v6WrapFormFields("#serviceForm");
}

function v6CloseCmsModal(formBoxId){
  const box = document.getElementById(formBoxId);
  if(!box) return;
  box.classList.add("hidden");
  box.classList.remove("v6-cms-modal-open");

  // Clear only overlay inline display. Keep form inside shell; it will reopen correctly.
  box.style.display = "none";
}


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


/* =========================
   V6.5 GUEST CONFIRMATION + QUOTE SYSTEM
========================= */

function v65Bool(value){
  return value === 1 || value === true || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}

function v65Money(value){
  if(value === null || value === undefined || value === "") return "-";
  return String(value);
}

function v65GuestBadge(item){
  if(v65Bool(item.guestConfirmed)){
    return `<span class="status-badge status-booked">Guest Confirmed</span>`;
  }
  return `<span class="status-badge status-quoted">Guest Pending</span>`;
}

function v65AdminBadge(item){
  if(v65Bool(item.adminConfirmed) || normalizeStatus(item.status) === "booked"){
    return `<span class="status-badge status-booked">Admin Confirmed</span>`;
  }
  return `<span class="status-badge status-contacted">Admin Pending</span>`;
}

function v65PaymentBadge(item){
  const s = String(item.paymentStatus || "Pending");
  const cls = s.toLowerCase().includes("paid") ? "status-booked" : "status-contacted";
  return `<span class="status-badge ${cls}">${escapeHtml(s)}</span>`;
}

function v65QuotePayloadFromModal(){
  return {
    currency: document.getElementById("bookingConfirmCurrency")?.value || document.getElementById("quoteCurrency")?.value || "USD",
    unitRate: document.getElementById("bookingConfirmDayRate")?.value || document.getElementById("quoteUnitRate")?.value || "",
    discountPercent: document.getElementById("quoteDiscountPercent")?.value || document.getElementById("bookingConfirmDiscountPercent")?.value || "0",
    discountAmount: document.getElementById("quoteDiscountAmount")?.value || document.getElementById("bookingConfirmDiscountAmount")?.value || "0",
    totalAmount: document.getElementById("bookingConfirmTotalAmount")?.value || document.getElementById("quoteTotalAmount")?.value || "",
    validUntil: document.getElementById("quoteValidUntil")?.value || "",
    paymentStatus: document.getElementById("quotePaymentStatus")?.value || "Pending",
    advanceAmount: document.getElementById("quoteAdvanceAmount")?.value || "",
    balanceAmount: document.getElementById("quoteBalanceAmount")?.value || "",
    adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || document.getElementById("quoteAdminMessage")?.value || "",
    sendEmail: true
  };
}

async function sendQuoteToGuest(id){
  const inquiry = allInquiries.find(x => String(x.id) === String(id));
  if(!inquiry) return alert("Inquiry not found");

  if(!inquiry.guestEmail){
    if(!confirm("Guest email is empty. Save quote without sending email?")) return;
  }else{
    if(!confirm("Send quote / invoice email to guest with confirmation button?")) return;
  }

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/quote`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify(v65QuotePayloadFromModal())
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Quote send failed");
    return;
  }

  alert(inquiry.guestEmail ? "Quote sent to guest" : "Quote saved");
  await loadInquiries();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

async function markGuestConfirmedManually(id){
  if(!confirm("Mark this inquiry as Guest Confirmed manually?")) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/guest-confirm`, {
    method:"POST",
    headers: authHeaders(),
    body: JSON.stringify({ manual:true })
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Guest confirm failed");
    return;
  }

  alert("Guest confirmation marked");
  await loadInquiries();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

async function adminConfirmFinalBooking(id){
  const inquiry = allInquiries.find(x => String(x.id) === String(id)) || currentInquiry;
  if(!inquiry) return alert("Inquiry not found");

  if(!v65Bool(inquiry.guestConfirmed)){
    if(!confirm("Guest has not confirmed yet. Do you still want to admin-confirm and book?")) return;
  }else{
    if(!confirm("Admin confirm this booking now?")) return;
  }

  currentInquiry = inquiry;
  await confirmBooking(true);
}

function v65QuotePanelHtml(item){
  const isTour = classifyInquiryItem(item) === "tour";
  const defaultCurrency = item.quoteCurrency || item.currency || "USD";
  const defaultRate = item.quoteUnitRate || item.dayRate || "";
  const defaultDiscountPercent = item.quoteDiscountPercent || item.discountPercent || "0";
  const defaultDiscountAmount = item.quoteDiscountAmount || item.discountAmount || "0";
  const defaultTotal = item.quoteTotalAmount || item.totalAmount || "";
  const defaultValid = item.quoteValidUntil || "";
  const paymentStatus = item.paymentStatus || "Pending";

  return `
    <div class="modal-section booking-confirm-panel v65-quote-panel">
      <h4>${isTour ? "Tour Quote / Invoice" : "Property Quote / Invoice"}</h4>

      <div class="v65-confirm-row">
        ${v65GuestBadge(item)}
        ${v65AdminBadge(item)}
        ${v65PaymentBadge(item)}
      </div>

      <div class="booking-confirm-grid v65-quote-grid">
        <label>Currency
          <select id="bookingConfirmCurrency">
            ${["USD","LKR","EUR","OMR"].map(c => `<option value="${c}" ${defaultCurrency === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
        </label>

        <label>${isTour ? "Adult / Unit Rate" : "Night / Unit Rate"}
          <input id="bookingConfirmDayRate" type="number" step="0.01" value="${escapeHtml(defaultRate)}" oninput="v65RecalcQuote()" />
        </label>

        <label>${isTour ? "Qty / Guests" : "Nights"}
          <input id="bookingConfirmNights" type="number" step="1" value="${escapeHtml(item.totalDays || item.guests || calcBookingNights?.(item.dateFrom, item.dateTo) || 1)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Discount %
          <input id="quoteDiscountPercent" type="number" step="0.01" value="${escapeHtml(defaultDiscountPercent)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Discount Amount
          <input id="quoteDiscountAmount" type="number" step="0.01" value="${escapeHtml(defaultDiscountAmount)}" oninput="v65RecalcQuote()" />
        </label>

        <label>Total Amount
          <input id="bookingConfirmTotalAmount" type="number" step="0.01" value="${escapeHtml(defaultTotal)}" />
        </label>

        <label>Advance Paid
          <input id="quoteAdvanceAmount" type="number" step="0.01" value="${escapeHtml(item.advanceAmount || "")}" oninput="v65RecalcBalance()" />
        </label>

        <label>Balance
          <input id="quoteBalanceAmount" type="number" step="0.01" value="${escapeHtml(item.balanceAmount || "")}" />
        </label>

        <label>Payment Status
          <select id="quotePaymentStatus">
            ${["Pending","Advance Paid","Paid","Refunded"].map(s => `<option value="${s}" ${paymentStatus === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </label>

        <label>Quote Valid Until
          <input id="quoteValidUntil" type="date" value="${escapeHtml(defaultValid)}" />
        </label>
      </div>

      ${isTour ? `
        <div class="booking-confirm-grid v65-quote-grid">
          <label>Pickup Time <input id="tourPickupTime" type="time" value="${escapeHtml(item.pickupTime || "")}" /></label>
          <label>Pickup Location <input id="tourPickupLocation" value="${escapeHtml(item.pickupLocation || "")}" /></label>
          <label>Child Rate <input id="tourChildRate" type="number" step="0.01" value="${escapeHtml(item.childRate || "")}" /></label>
        </div>
      ` : `
        <div class="booking-confirm-grid v65-quote-grid">
          <label>Check-in Time <input id="bookingConfirmCheckInTime" type="time" value="${escapeHtml(item.checkInTime || "14:00")}" /></label>
          <label>Check-out Time <input id="bookingConfirmCheckOutTime" type="time" value="${escapeHtml(item.checkOutTime || "11:00")}" /></label>
        </div>
      `}

      <label class="v65-full-label">Admin Message to Guest
        <textarea id="bookingConfirmAdminMessage" placeholder="Example: Please arrive after 2.00 PM. Contact us before check-in.">${escapeHtml(item.adminMessage || item.quoteAdminMessage || "")}</textarea>
      </label>

      <div class="v65-action-row">
        <button type="button" onclick="sendQuoteToGuest('${escapeJs(item.id)}')">Send Quote / Invoice</button>
        <button type="button" onclick="markGuestConfirmedManually('${escapeJs(item.id)}')">Mark Guest Confirmed</button>
        <button type="button" onclick="adminConfirmFinalBooking('${escapeJs(item.id)}')">Admin Confirm Booking</button>
      </div>
    </div>
  `;
}

function v65RecalcQuote(){
  const rate = Number(document.getElementById("bookingConfirmDayRate")?.value || 0);
  const qty = Number(document.getElementById("bookingConfirmNights")?.value || 1);
  const percent = Number(document.getElementById("quoteDiscountPercent")?.value || 0);
  const discountAmount = Number(document.getElementById("quoteDiscountAmount")?.value || 0);
  const gross = rate * qty;
  const percentDiscount = gross * percent / 100;
  const total = Math.max(gross - percentDiscount - discountAmount, 0);
  const totalBox = document.getElementById("bookingConfirmTotalAmount");
  if(totalBox) totalBox.value = total ? total.toFixed(2) : "";
  v65RecalcBalance();
}

function v65RecalcBalance(){
  const total = Number(document.getElementById("bookingConfirmTotalAmount")?.value || 0);
  const advance = Number(document.getElementById("quoteAdvanceAmount")?.value || 0);
  const balance = Math.max(total - advance, 0);
  const box = document.getElementById("quoteBalanceAmount");
  if(box) box.value = total ? balance.toFixed(2) : "";
}

/* Override inquiry table with confirmation columns */
function renderInquiryTable(data) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  const thead = tbody.closest("table")?.querySelector("thead tr");
  if(thead && !thead.dataset.v65){
    thead.innerHTML = `
      <th>Reference</th>
      <th>Date</th>
      <th>Type</th>
      <th>Property / Tour</th>
      <th>Guest</th>
      <th>Dates</th>
      <th>Guest Confirm</th>
      <th>Admin Confirm</th>
      <th>Status</th>
    `;
    thead.dataset.v65 = "1";
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No inquiries found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    return `
      <tr onclick="openInquiryModal('${escapeJs(item.id)}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(classifyInquiryItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType || "-")}</small></td>
        <td>${escapeHtml(item.itemName || getItemNameForBooking(item) || "-")}</td>
        <td><strong>${escapeHtml(item.guestName || "-")}</strong><br><small>${escapeHtml(item.guestEmail || "")}</small></td>
        <td>${escapeHtml(item.dateFrom || "-")} → ${escapeHtml(item.dateTo || (classifyInquiryItem(item)==="tour" ? item.dateFrom : "-"))}</td>
        <td>${v65GuestBadge(item)}</td>
        <td>${v65AdminBadge(item)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(displayStatus)}</span></td>
      </tr>
    `;
  }).join("");
}

/* Override booking table with confirmation/payment columns */
function renderBookingsTable(data) {
  const tbody = document.getElementById("bookingTableBody");
  if (!tbody) return;

  const thead = tbody.closest("table")?.querySelector("thead tr");
  if(thead && !thead.dataset.v65){
    thead.innerHTML = `
      <th>Reference</th>
      <th>Created</th>
      <th>Type</th>
      <th>Property / Tour</th>
      <th>Guest</th>
      <th>Dates</th>
      <th>Amount</th>
      <th>Guest</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Action</th>
    `;
    thead.dataset.v65 = "1";
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const status = item.status || "Booked";
    const statusClass = normalizeStatus(status);

    return `
      <tr onclick="openBookingDetails('${escapeJs(item.id)}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(classifyBookingItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType || "-")}</small></td>
        <td>${escapeHtml(item.itemName || "-")}</td>
        <td><strong>${escapeHtml(item.guestName || "-")}</strong><br><small>${escapeHtml(item.guestEmail || "")}</small><br><small>${escapeHtml(item.guestMobile || "")}</small></td>
        <td>${escapeHtml(item.dateFrom || "-")} → ${escapeHtml(item.dateTo || "-")}</td>
        <td>${escapeHtml(item.currency || item.quoteCurrency || "")} ${escapeHtml(item.totalAmount || item.quoteTotalAmount || "-")}</td>
        <td>${v65GuestBadge(item)}</td>
        <td>${v65PaymentBadge(item)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(status)}</span></td>
        <td onclick="event.stopPropagation();">
          <button class="mini-btn" onclick="openInquiryFromBooking('${escapeJs(item.id)}')">Manage</button>
        </td>
      </tr>
    `;
  }).join("");
}

/* Add quote panel into inquiry modal after original modal opens */
const v65OriginalOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v65OriginalOpenInquiryModal){
  openInquiryModal = function(id){
    v65OriginalOpenInquiryModal(id);

    setTimeout(() => {
      const item = allInquiries.find(x => String(x.id) === String(id));
      const body = document.getElementById("inquiryModalBody");
      if(!item || !body || body.querySelector(".v65-quote-panel")) return;

      body.insertAdjacentHTML("afterbegin", v65QuotePanelHtml(item));
    }, 80);
  };
}

/* Override confirm booking so guest/admin confirmation data syncs to booking */
async function confirmBooking(sendEmail = true) {
  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

  try {
    const quote = v65QuotePayloadFromModal();

    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inquiryId: currentInquiry.id,
        reference: currentInquiry.reference,
        itemName: getItemNameForBooking(currentInquiry),
        serviceType: currentInquiry.serviceType || (classifyInquiryItem(currentInquiry) === "tour" ? "Tour Inquiry" : "Property Inquiry"),
        guestName: currentInquiry.guestName,
        guestEmail: currentInquiry.guestEmail,
        guestMobile: currentInquiry.guestMobile,
        dateFrom: currentInquiry.dateFrom,
        dateTo: safeBookingDateTo(currentInquiry),
        guests: currentInquiry.guests,
        checkInTime: document.getElementById("bookingConfirmCheckInTime")?.value || currentInquiry.checkInTime || "14:00",
        checkOutTime: document.getElementById("bookingConfirmCheckOutTime")?.value || currentInquiry.checkOutTime || "11:00",
        pickupTime: document.getElementById("tourPickupTime")?.value || currentInquiry.pickupTime || "",
        pickupLocation: document.getElementById("tourPickupLocation")?.value || currentInquiry.pickupLocation || "",
        childRate: document.getElementById("tourChildRate")?.value || currentInquiry.childRate || "",
        currency: quote.currency,
        dayRate: quote.unitRate,
        totalDays: document.getElementById("bookingConfirmNights")?.value || currentInquiry.totalDays || "1",
        discountPercent: quote.discountPercent,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        paymentStatus: quote.paymentStatus,
        advanceAmount: quote.advanceAmount,
        balanceAmount: quote.balanceAmount,
        guestConfirmed: v65Bool(currentInquiry.guestConfirmed),
        adminConfirmed: true,
        sendEmail,
        adminMessage: quote.adminMessage
      })
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Booking failed");
      return;
    }

    currentInquiry.status = "Booked";
    currentInquiry.adminConfirmed = true;

    await loadBookings();
    await loadInquiries();

    alert("Booking Confirmed");
    closeInquiryModal?.();

  } catch (err) {
    alert(err.message);
  }
}


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


/* =========================
   V7 PROFESSIONAL STABLE CORE
========================= */
function v7Text(item){return `${item?.bookingCategory||""} ${item?.category||""} ${item?.serviceType||""} ${item?.itemName||""} ${item?.reference||""} ${item?.message||""}`.toLowerCase();}
function classifyInquiryItem(item){const t=v7Text(item); if(t.includes('tour')||t.includes('trip')||t.includes('safari')||t.includes('excursion')||t.includes('pickup')||t.includes('guide')||t.includes('round tour'))return 'tour'; if(t.includes('cafe')||t.includes('service')||t.includes('restaurant')||t.includes('contact')||t.includes('taxi')||t.includes('rental'))return 'service'; return 'property';}
function classifyBookingItem(item){const t=v7Text(item); if(t.includes('tour')||t.includes('trip')||t.includes('safari')||t.includes('excursion')||t.includes('pickup')||t.includes('guide')||t.includes('round tour'))return 'tour'; if(String(item?.reference||'').startsWith('MAN-')||String(item?.inquiryId||'').startsWith('MAN-'))return 'manual'; return 'property';}
function v7Bool(v){return v===1||v===true||String(v||'').toLowerCase()==='true'||String(v||'')==='1';}
function v7GuestBadge(i){return v7Bool(i?.guestConfirmed)?`<span class="status-badge status-booked">Guest Confirmed</span>`:`<span class="status-badge status-quoted">Guest Pending</span>`;}
function v7AdminBadge(i){return v7Bool(i?.adminConfirmed)||normalizeStatus(i?.status)==='booked'?`<span class="status-badge status-booked">Admin Confirmed</span>`:`<span class="status-badge status-contacted">Admin Pending</span>`;}
function v7PaymentBadge(i){const s=String(i?.paymentStatus||'Pending'); const cls=s.toLowerCase().includes('paid')?'status-booked':'status-contacted'; return `<span class="status-badge ${cls}">${escapeHtml(s)}</span>`;}
function setInquiryMode(mode,btn){v6InquiryMode=mode||'all'; const h=document.getElementById('v6InquiryMode'); if(h)h.value=v6InquiryMode; document.querySelectorAll('[data-inquiry-mode]').forEach(x=>x.classList.remove('active')); btn?.classList.add('active'); applyInquiryFilters();}
function setBookingMode(mode,btn){v6BookingMode=mode||'all'; const h=document.getElementById('v6BookingMode'); if(h)h.value=v6BookingMode; document.querySelectorAll('[data-booking-mode]').forEach(x=>x.classList.remove('active')); btn?.classList.add('active'); applyBookingFilters();}
function renderDashboardCards(data){const b=document.getElementById('inquiryCards'); if(!b)return; const c=s=>data.filter(x=>normalizeStatus(x.status)===s.toLowerCase()).length; b.innerHTML=`<div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div><div class="dashboard-card"><h3>Property Inquiries</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='property').length}</div></div><div class="dashboard-card"><h3>Tour Inquiries</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='tour').length}</div></div><div class="dashboard-card"><h3>Service / Contact</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='service').length}</div></div><div class="dashboard-card card-new"><h3>New</h3><div class="value">${c('New')}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c('Booked')}</div></div><div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${c('Cancelled')+c('Closed')}</div></div>`;}
function renderInquiryTypeCards(data){const b=document.getElementById('inquiryTypeCards'); if(!b)return; b.innerHTML=`<div class="dashboard-card"><h3>🏡 Properties</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='property').length}</div></div><div class="dashboard-card"><h3>🧭 Tours</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='tour').length}</div></div><div class="dashboard-card"><h3>☕ Services / Contact</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='service').length}</div></div><div class="dashboard-card"><h3>🏡 Villas</h3><div class="value">${data.filter(x=>v7Text(x).includes('villa')).length}</div></div><div class="dashboard-card"><h3>🏢 Apartments</h3><div class="value">${data.filter(x=>v7Text(x).includes('apartment')).length}</div></div><div class="dashboard-card"><h3>🏠 Homestays</h3><div class="value">${data.filter(x=>v7Text(x).includes('homestay')).length}</div></div>`;}
function renderBookingStats(data){const b=document.getElementById('bookingStats'); if(!b)return; const c=s=>data.filter(x=>normalizeStatus(x.status)===s).length; b.innerHTML=`<div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div><div class="dashboard-card"><h3>Property Bookings</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='property').length}</div></div><div class="dashboard-card"><h3>Tour Bookings</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='tour').length}</div></div><div class="dashboard-card"><h3>Manual Bookings</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='manual').length}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c('booked')}</div></div><div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${c('cancelled')}</div></div>`;}
function applyInquiryFilters(){const ins=document.querySelectorAll('#inquirySearch'); let search=''; ins.forEach(i=>{if(i.value.trim())search=i.value.toLowerCase();}); const old=document.getElementById('inquiryFilter')?.value||''; const ns=document.getElementById('inquiryStatusFilter')?.value||'all'; const mode=v6InquiryMode||document.getElementById('v6InquiryMode')?.value||'all'; let status=''; if(ns&&ns!=='all')status=ns.toLowerCase(); if(old)status=old.toLowerCase(); const filtered=allInquiries.filter(item=>{const txt=`${item.reference||''} ${item.guestName||''} ${item.guestEmail||''} ${item.guestMobile||''} ${item.serviceType||''} ${item.itemName||''} ${item.message||''}`.toLowerCase(); return (mode==='all'||classifyInquiryItem(item)===mode)&&(!status||normalizeStatus(item.status)===status)&&(!search||txt.includes(search));}); renderDashboardCards(allInquiries); renderInquiryTypeCards(allInquiries); renderInquiryTable(filtered); const box=document.getElementById('inquiriesList'); if(box)box.innerHTML='';}
function applyBookingFilters(){const search=(document.getElementById('bookingSearch')?.value||'').toLowerCase(); const status=(document.getElementById('bookingStatusFilter')?.value||'all').toLowerCase(); const type=(document.getElementById('bookingTypeFilter')?.value||'all').toLowerCase(); const mode=v6BookingMode||document.getElementById('v6BookingMode')?.value||'all'; const filtered=allBookings.filter(item=>{const cat=classifyBookingItem(item); const sm=status==='all'||normalizeStatus(item.status)===status; const mm=mode==='all'||cat===mode; const tt=`${item.serviceType||''} ${item.itemName||''} ${item.bookingCategory||''}`.toLowerCase(); const tm=type==='all'||tt.includes(type)||cat===type; const st=`${item.id||''} ${item.reference||''} ${item.itemName||''} ${item.serviceType||''} ${item.guestName||''} ${item.guestEmail||''} ${item.guestMobile||''}`.toLowerCase(); return mm&&sm&&tm&&(!search||st.includes(search));}); renderBookingStats(allBookings); renderBookingsTable(filtered); renderBookingsCalendar(filtered); renderAvailabilityMatrix();}
function renderInquiryTable(data){const tb=document.getElementById('inquiryTableBody'); if(!tb)return; const th=tb.closest('table')?.querySelector('thead tr'); if(th)th.innerHTML='<th>Reference</th><th>Date</th><th>Type</th><th>Property / Tour</th><th>Guest</th><th>Dates</th><th>Guest</th><th>Admin</th><th>Status</th>'; if(!data.length){tb.innerHTML='<tr><td colspan="9" class="empty-row">No inquiries found</td></tr>';return;} tb.innerHTML=data.map(item=>`<tr onclick="openInquiryModal('${escapeJs(item.id)}')" class="clickable-row"><td>${escapeHtml(item.reference||item.id||'-')}</td><td>${formatDate(item.createdAt||item.created_at)}</td><td>${escapeHtml(classifyInquiryItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType||'-')}</small></td><td>${escapeHtml(item.itemName||'-')}</td><td><strong>${escapeHtml(item.guestName||'-')}</strong><br><small>${escapeHtml(item.guestEmail||'')}</small></td><td>${escapeHtml(item.dateFrom||'-')} → ${escapeHtml(item.dateTo||(classifyInquiryItem(item)==='tour'?item.dateFrom:'-'))}</td><td>${v7GuestBadge(item)}</td><td>${v7AdminBadge(item)}</td><td><span class="status-badge status-${normalizeStatus(item.status)}">${escapeHtml(item.status||'New')}</span></td></tr>`).join('');}
function renderBookingsTable(data){const tb=document.getElementById('bookingTableBody'); if(!tb)return; const th=tb.closest('table')?.querySelector('thead tr'); if(th)th.innerHTML='<th>Reference</th><th>Created</th><th>Type</th><th>Property / Tour</th><th>Guest</th><th>Dates</th><th>Amount</th><th>Guest</th><th>Payment</th><th>Status</th><th>Action</th>'; if(!data.length){tb.innerHTML='<tr><td colspan="11" class="empty-row">No bookings found</td></tr>';return;} tb.innerHTML=data.map(item=>`<tr onclick="openBookingDetails('${escapeJs(item.id)}')" class="clickable-row"><td>${escapeHtml(item.reference||item.id||'-')}</td><td>${formatDate(item.createdAt||item.created_at)}</td><td>${escapeHtml(classifyBookingItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType||'-')}</small></td><td>${escapeHtml(item.itemName||'-')}</td><td><strong>${escapeHtml(item.guestName||'-')}</strong><br><small>${escapeHtml(item.guestEmail||'')}</small><br><small>${escapeHtml(item.guestMobile||'')}</small></td><td>${escapeHtml(item.dateFrom||'-')} → ${escapeHtml(item.dateTo||'-')}</td><td>${escapeHtml(item.currency||item.quoteCurrency||'')} ${escapeHtml(item.totalAmount||item.quoteTotalAmount||'-')}</td><td>${v7GuestBadge(item)}</td><td>${v7PaymentBadge(item)}</td><td><span class="status-badge status-${normalizeStatus(item.status||'Booked')}">${escapeHtml(item.status||'Booked')}</span></td><td onclick="event.stopPropagation();"><button class="mini-btn" onclick="openBookingDetails('${escapeJs(item.id)}')">Manage</button></td></tr>`).join('');}
async function deleteInquiry(id){if(!confirm('Delete this inquiry? Related booking and notes will also be removed.'))return; try{const res=await fetch(`${API_BASE}/api/admin/inquiries/${id}`,{method:'DELETE',headers:authHeaders()}); const result=await res.json(); if(!res.ok)return alert(result.error||'Delete failed'); alert('Inquiry and related records deleted'); closeInquiryModal?.(); await loadInquiries(); await loadBookings();}catch(err){alert(err.message);}}
async function cleanupOrphanBookings(){if(!confirm('Clean orphan bookings that no longer have matching inquiries?'))return; const res=await fetch(`${API_BASE}/api/admin/bookings/cleanup-orphans`,{method:'POST',headers:authHeaders()}); const result=await res.json(); if(!res.ok)return alert(result.error||'Cleanup failed'); alert(`Cleanup completed. Removed ${result.deleted||0} orphan booking(s).`); await loadBookings(); await loadInquiries();}
async function syncBookingsFromInquiries(){const res=await fetch(`${API_BASE}/api/admin/bookings/sync-from-inquiries`,{method:'POST',headers:authHeaders()}); const result=await res.json(); if(!res.ok)return alert(result.error||'Sync failed'); alert('Booking sync completed'); await loadBookings(); await loadInquiries();}
setTimeout(()=>{const tools=document.querySelector('.booking-tools'); if(tools&&!document.getElementById('cleanupOrphansBtn')){const b=document.createElement('button'); b.id='cleanupOrphansBtn'; b.type='button'; b.textContent='Clean Orphans'; b.onclick=cleanupOrphanBookings; tools.appendChild(b);} if(tools&&!document.getElementById('syncBookingsBtn')){const b=document.createElement('button'); b.id='syncBookingsBtn'; b.type='button'; b.textContent='Sync Bookings'; b.onclick=syncBookingsFromInquiries; tools.appendChild(b);}},1200);


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


/* =========================
   V7.2 PAYMENT + INVOICE SYNC
========================= */

function v72PaymentPayloadFromModal(){
  return {
    currency: document.getElementById("bookingConfirmCurrency")?.value || "USD",
    unitRate: document.getElementById("bookingConfirmDayRate")?.value || "",
    discountPercent: document.getElementById("quoteDiscountPercent")?.value || "0",
    discountAmount: document.getElementById("quoteDiscountAmount")?.value || "0",
    totalAmount: document.getElementById("bookingConfirmTotalAmount")?.value || "",
    validUntil: document.getElementById("quoteValidUntil")?.value || "",
    paymentStatus: document.getElementById("quotePaymentStatus")?.value || "Pending",
    advanceAmount: document.getElementById("quoteAdvanceAmount")?.value || "",
    balanceAmount: document.getElementById("quoteBalanceAmount")?.value || "",
    adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || ""
  };
}

async function savePaymentStatus(sendEmail = false){
  const inquiry = currentInquiry || {};
  const id = inquiry.id;

  if(!id){
    alert("Inquiry not selected");
    return;
  }

  const payload = v72PaymentPayloadFromModal();
  payload.sendEmail = !!sendEmail;

  const msg = sendEmail
    ? "Save payment status and send invoice/payment email to guest?"
    : "Save payment status and sync with booking?";

  if(!confirm(msg)) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/payment-sync`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const result = await res.json();

  if(!res.ok){
    alert(result.error || "Payment sync failed");
    return;
  }

  alert(sendEmail ? (result.emailSent ? "Payment saved and email sent" : "Payment saved, but email was not sent") : "Payment status saved");

  await loadInquiries();
  await loadBookings();

  const refreshed = allInquiries.find(x => String(x.id) === String(id));
  if(refreshed){
    currentInquiry = refreshed;
    openInquiryModal(id);
  }
}

function v72InjectPaymentButtons(){
  const panel = document.querySelector(".v65-quote-panel, .booking-confirm-panel");
  if(!panel || document.getElementById("v72SavePaymentBtn")) return;

  const row = panel.querySelector(".v65-action-row") || panel.querySelector(".booking-actions") || panel;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.id = "v72SavePaymentBtn";
  saveBtn.textContent = "Save Payment Status";
  saveBtn.onclick = () => savePaymentStatus(false);

  const emailBtn = document.createElement("button");
  emailBtn.type = "button";
  emailBtn.id = "v72SendPaymentInvoiceBtn";
  emailBtn.textContent = "Send Payment / Invoice Email";
  emailBtn.onclick = () => savePaymentStatus(true);

  row.appendChild(saveBtn);
  row.appendChild(emailBtn);
}

const v72OldOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v72OldOpenInquiryModal){
  openInquiryModal = function(id){
    v72OldOpenInquiryModal(id);
    setTimeout(v72InjectPaymentButtons, 150);
  };
}


/* V8 FINAL STABLE ADMIN LOGIC */
let v8FinalInquiryFilter="all",v8FinalBookingFilter="all";
function v8FinalText(i){return `${i?.bookingCategory||""} ${i?.category||""} ${i?.serviceType||""} ${i?.itemName||""} ${i?.reference||""} ${i?.message||""}`.toLowerCase();}
function classifyInquiryItem(i){const t=v8FinalText(i);if(t.includes("tour")||t.includes("trip")||t.includes("safari")||t.includes("excursion")||t.includes("pickup")||t.includes("guide"))return"tour";if(t.includes("cafe")||t.includes("service")||t.includes("restaurant")||t.includes("contact")||t.includes("taxi")||t.includes("rental"))return"service";return"property";}
function classifyBookingItem(i){const t=v8FinalText(i);if(t.includes("tour")||t.includes("trip")||t.includes("safari")||t.includes("excursion")||t.includes("pickup")||t.includes("guide"))return"tour";if(String(i?.reference||"").startsWith("MAN-")||String(i?.inquiryId||"").startsWith("MAN-"))return"manual";return"property";}
function v8FinalBool(v){return v===1||v===true||String(v||"").toLowerCase()==="true"||String(v||"")==="1";}
function v8FinalGuestBadge(i){return v8FinalBool(i?.guestConfirmed)?`<span class="status-badge status-booked">Guest Confirmed</span>`:`<span class="status-badge status-quoted">Guest Pending</span>`;}
function v8FinalAdminBadge(i){return v8FinalBool(i?.adminConfirmed)||normalizeStatus(i?.status)==="booked"?`<span class="status-badge status-booked">Admin Confirmed</span>`:`<span class="status-badge status-contacted">Admin Pending</span>`;}
function v8FinalPaymentBadge(i){const s=String(i?.paymentStatus||"Pending");return `<span class="status-badge ${s.toLowerCase().includes("paid")?"status-booked":"status-contacted"}">${escapeHtml(s)}</span>`;}
function getItemNameForBooking(i){return i?.itemName||String(i?.serviceType||"").replace("Villa Inquiry - ","").replace("Apartment Inquiry - ","").replace("Homestay Inquiry - ","").replace("Tour Inquiry - ","").replace("Tours Inquiry - ","").trim()||"CeyBreez Booking";}
function v8FinalInjectFilters(){const it=document.querySelector("#inquiriesTab .inquiry-tools");if(it&&!document.getElementById("v8FinalInquiryFilter")){const s=document.createElement("select");s.id="v8FinalInquiryFilter";s.innerHTML=`<option value="all">All Inquiry Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="service">Cafe / Service Only</option>`;s.onchange=()=>{v8FinalInquiryFilter=s.value||"all";applyInquiryFilters();};it.prepend(s);}const bt=document.querySelector(".booking-tools");if(bt&&!document.getElementById("v8FinalBookingFilter")){const s=document.createElement("select");s.id="v8FinalBookingFilter";s.innerHTML=`<option value="all">All Booking Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="manual">Manual Only</option>`;s.onchange=()=>{v8FinalBookingFilter=s.value||"all";applyBookingFilters();};bt.prepend(s);const c=document.createElement("button");c.id="v8FinalCleanBtn";c.type="button";c.textContent="Clean Orphans";c.onclick=cleanupOrphanBookings;bt.appendChild(c);const y=document.createElement("button");y.id="v8FinalSyncBtn";y.type="button";y.textContent="Sync Bookings";y.onclick=syncBookingsFromInquiries;bt.appendChild(y);}document.querySelectorAll(".v6-mode-tabs").forEach(x=>x.style.display="none");}
function setInquiryMode(m,b){v8FinalInquiryFilter=m||"all";const s=document.getElementById("v8FinalInquiryFilter");if(s)s.value=v8FinalInquiryFilter;applyInquiryFilters();}
function setBookingMode(m,b){v8FinalBookingFilter=m||"all";const s=document.getElementById("v8FinalBookingFilter");if(s)s.value=v8FinalBookingFilter;applyBookingFilters();}
function renderDashboardCards(d){const b=document.getElementById("inquiryCards");if(!b)return;const c=s=>d.filter(x=>normalizeStatus(x.status)===s.toLowerCase()).length;b.innerHTML=`<div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${d.length}</div></div><div class="dashboard-card"><h3>Property</h3><div class="value">${d.filter(x=>classifyInquiryItem(x)==="property").length}</div></div><div class="dashboard-card"><h3>Tour</h3><div class="value">${d.filter(x=>classifyInquiryItem(x)==="tour").length}</div></div><div class="dashboard-card"><h3>Service</h3><div class="value">${d.filter(x=>classifyInquiryItem(x)==="service").length}</div></div><div class="dashboard-card card-new"><h3>New</h3><div class="value">${c("New")}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c("Booked")}</div></div><div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${c("Cancelled")+c("Closed")}</div></div>`;}
function renderBookingStats(d){const b=document.getElementById("bookingStats");if(!b)return;const c=s=>d.filter(x=>normalizeStatus(x.status)===s).length;b.innerHTML=`<div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${d.length}</div></div><div class="dashboard-card"><h3>Property</h3><div class="value">${d.filter(x=>classifyBookingItem(x)==="property").length}</div></div><div class="dashboard-card"><h3>Tour</h3><div class="value">${d.filter(x=>classifyBookingItem(x)==="tour").length}</div></div><div class="dashboard-card"><h3>Manual</h3><div class="value">${d.filter(x=>classifyBookingItem(x)==="manual").length}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c("booked")}</div></div><div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${c("cancelled")}</div></div>`;}
function applyInquiryFilters(){v8FinalInjectFilters();let search="";document.querySelectorAll("#inquirySearch").forEach(i=>{if(i.value.trim())search=i.value.toLowerCase();});const ns=document.getElementById("inquiryStatusFilter")?.value||"all",cat=document.getElementById("v8FinalInquiryFilter")?.value||v8FinalInquiryFilter||"all";let st=ns&&ns!=="all"?ns.toLowerCase():"";const f=allInquiries.filter(i=>{const txt=`${i.reference||""} ${i.guestName||""} ${i.guestEmail||""} ${i.guestMobile||""} ${i.serviceType||""} ${i.itemName||""} ${i.message||""}`.toLowerCase();return(cat==="all"||classifyInquiryItem(i)===cat)&&(!st||normalizeStatus(i.status)===st)&&(!search||txt.includes(search));});renderDashboardCards(allInquiries);if(typeof renderInquiryTypeCards==="function")renderInquiryTypeCards(allInquiries);renderInquiryTable(f);const box=document.getElementById("inquiriesList");if(box)box.innerHTML="";}
function applyBookingFilters(){v8FinalInjectFilters();const search=(document.getElementById("bookingSearch")?.value||"").toLowerCase(),st=(document.getElementById("bookingStatusFilter")?.value||"all").toLowerCase(),type=(document.getElementById("bookingTypeFilter")?.value||"all").toLowerCase(),cat=document.getElementById("v8FinalBookingFilter")?.value||v8FinalBookingFilter||"all";const f=allBookings.filter(i=>{const c=classifyBookingItem(i),tt=`${i.serviceType||""} ${i.itemName||""} ${i.bookingCategory||""}`.toLowerCase(),ss=`${i.id||""} ${i.reference||""} ${i.itemName||""} ${i.serviceType||""} ${i.guestName||""} ${i.guestEmail||""} ${i.guestMobile||""}`.toLowerCase();return(cat==="all"||c===cat)&&(st==="all"||normalizeStatus(i.status)===st)&&(type==="all"||tt.includes(type)||c===type)&&(!search||ss.includes(search));});renderBookingStats(allBookings);renderBookingsTable(f);renderBookingsCalendar(f);renderAvailabilityMatrix();}
async function cleanupOrphanBookings(){if(!confirm("Clean orphan bookings?"))return;const r=await fetch(`${API_BASE}/api/admin/bookings/cleanup-orphans`,{method:"POST",headers:authHeaders()});const j=await r.json();if(!r.ok)return alert(j.error||"Cleanup failed");alert(`Removed ${j.deleted||0} orphan booking(s).`);await loadBookings();await loadInquiries();}
async function syncBookingsFromInquiries(){const r=await fetch(`${API_BASE}/api/admin/bookings/sync-from-inquiries`,{method:"POST",headers:authHeaders()});const j=await r.json();if(!r.ok)return alert(j.error||"Sync failed");alert("Booking sync completed");await loadBookings();await loadInquiries();}
const v8FinalOldShowTab=typeof showTab==="function"?showTab:null;if(v8FinalOldShowTab){showTab=function(tab){v8FinalOldShowTab(tab);setTimeout(v8FinalInjectFilters,80);};}document.addEventListener("DOMContentLoaded",()=>setTimeout(v8FinalInjectFilters,600));


/* =========================
   V9 PROFESSIONAL COMPLETE UI FIX
   Clean one-filter system. Removes duplicate visual tabs/buttons.
========================= */
let v9InquiryFilter = "all";
let v9BookingFilter = "all";
function v9Text(item){return `${item?.bookingCategory||""} ${item?.category||""} ${item?.serviceType||""} ${item?.itemName||""} ${item?.reference||""} ${item?.message||""}`.toLowerCase();}
function classifyInquiryItem(item){const t=v9Text(item); if(t.includes('tour')||t.includes('trip')||t.includes('safari')||t.includes('excursion')||t.includes('pickup')||t.includes('guide')||t.includes('round tour')) return 'tour'; if(t.includes('cafe')||t.includes('service')||t.includes('restaurant')||t.includes('contact')||t.includes('taxi')||t.includes('rental')) return 'service'; return 'property';}
function classifyBookingItem(item){const t=v9Text(item); if(t.includes('tour')||t.includes('trip')||t.includes('safari')||t.includes('excursion')||t.includes('pickup')||t.includes('guide')||t.includes('round tour')) return 'tour'; if(String(item?.reference||'').startsWith('MAN-')||String(item?.inquiryId||'').startsWith('MAN-')) return 'manual'; return 'property';}
function v9Bool(v){return v===1||v===true||String(v||'').toLowerCase()==='true'||String(v||'')==='1';}
function v9GuestBadge(item){return v9Bool(item?.guestConfirmed)?`<span class="status-badge status-booked">Guest Confirmed</span>`:`<span class="status-badge status-quoted">Guest Pending</span>`;}
function v9AdminBadge(item){return v9Bool(item?.adminConfirmed)||normalizeStatus(item?.status)==='booked'?`<span class="status-badge status-booked">Admin Confirmed</span>`:`<span class="status-badge status-contacted">Admin Pending</span>`;}
function v9PaymentBadge(item){const s=String(item?.paymentStatus||'Pending'); const cls=s.toLowerCase().includes('paid')?'status-booked':'status-contacted'; return `<span class="status-badge ${cls}">${escapeHtml(s)}</span>`;}
function getItemNameForBooking(inquiry){let item=inquiry?.itemName||''; if(!item){item=String(inquiry?.serviceType||'').replace('Villa Inquiry - ','').replace('Apartment Inquiry - ','').replace('Homestay Inquiry - ','').replace('Tour Inquiry - ','').replace('Tours Inquiry - ','').trim();} return item||'CeyBreez Booking';}
function v9RemoveDuplicateControls(){
  document.querySelectorAll('.v6-mode-tabs').forEach(x=>x.remove());
  document.querySelectorAll('button').forEach(btn=>{const t=(btn.textContent||'').trim().toLowerCase(); if(t==='property bookings'||t==='tour bookings'||t==='property inquiry'||t==='tour inquiry'||t==='property inquiries'||t==='tour inquiries'){btn.remove();}});
  const inq=[]; document.querySelectorAll('#inquiriesTab select').forEach(sel=>{if((sel.textContent||'').toLowerCase().includes('all inquiry types'))inq.push(sel);}); inq.slice(1).forEach(x=>x.remove());
  const bok=[]; document.querySelectorAll('#bookingsTab select, .booking-tools select').forEach(sel=>{if((sel.textContent||'').toLowerCase().includes('all booking types'))bok.push(sel);}); bok.slice(1).forEach(x=>x.remove());
  const clean=[]; const sync=[]; document.querySelectorAll('button').forEach(btn=>{const t=(btn.textContent||'').trim().toLowerCase(); if(t==='clean orphans') clean.push(btn); if(t==='sync bookings') sync.push(btn);}); clean.slice(1).forEach(x=>x.remove()); sync.slice(1).forEach(x=>x.remove());
}
function v9InjectFilters(){
  const inquiryTools=document.querySelector('#inquiriesTab .inquiry-tools');
  if(inquiryTools&&!document.getElementById('v9InquiryFilter')){const s=document.createElement('select'); s.id='v9InquiryFilter'; s.innerHTML=`<option value="all">All Inquiry Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="service">Cafe / Service Only</option>`; s.onchange=()=>{v9InquiryFilter=s.value||'all'; applyInquiryFilters();}; inquiryTools.prepend(s);}
  const bookingTools=document.querySelector('.booking-tools');
  if(bookingTools&&!document.getElementById('v9BookingFilter')){const s=document.createElement('select'); s.id='v9BookingFilter'; s.innerHTML=`<option value="all">All Booking Types</option><option value="property">Property Only</option><option value="tour">Tour Only</option><option value="manual">Manual Only</option>`; s.onchange=()=>{v9BookingFilter=s.value||'all'; applyBookingFilters();}; bookingTools.prepend(s); const c=document.createElement('button'); c.id='v9CleanBtn'; c.type='button'; c.textContent='Clean Orphans'; c.onclick=cleanupOrphanBookings; bookingTools.appendChild(c); const y=document.createElement('button'); y.id='v9SyncBtn'; y.type='button'; y.textContent='Sync Bookings'; y.onclick=syncBookingsFromInquiries; bookingTools.appendChild(y);}
  v9RemoveDuplicateControls();
}
function setInquiryMode(mode,btn){v9InquiryFilter=mode||'all'; const s=document.getElementById('v9InquiryFilter'); if(s)s.value=v9InquiryFilter; applyInquiryFilters();}
function setBookingMode(mode,btn){v9BookingFilter=mode||'all'; const s=document.getElementById('v9BookingFilter'); if(s)s.value=v9BookingFilter; applyBookingFilters();}
function renderDashboardCards(data){const box=document.getElementById('inquiryCards'); if(!box)return; const c=status=>data.filter(x=>normalizeStatus(x.status)===status.toLowerCase()).length; box.innerHTML=`<div class="dashboard-card"><h3>Total Inquiries</h3><div class="value">${data.length}</div></div><div class="dashboard-card"><h3>Property</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='property').length}</div></div><div class="dashboard-card"><h3>Tour</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='tour').length}</div></div><div class="dashboard-card"><h3>Service</h3><div class="value">${data.filter(x=>classifyInquiryItem(x)==='service').length}</div></div><div class="dashboard-card card-new"><h3>New</h3><div class="value">${c('New')}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c('Booked')}</div></div><div class="dashboard-card card-closed"><h3>Cancelled / Closed</h3><div class="value">${c('Cancelled')+c('Closed')}</div></div>`;}
function renderBookingStats(data){const box=document.getElementById('bookingStats'); if(!box)return; const c=status=>data.filter(x=>normalizeStatus(x.status)===status).length; box.innerHTML=`<div class="dashboard-card"><h3>Total Bookings</h3><div class="value">${data.length}</div></div><div class="dashboard-card"><h3>Property</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='property').length}</div></div><div class="dashboard-card"><h3>Tour</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='tour').length}</div></div><div class="dashboard-card"><h3>Manual</h3><div class="value">${data.filter(x=>classifyBookingItem(x)==='manual').length}</div></div><div class="dashboard-card card-booked"><h3>Booked</h3><div class="value">${c('booked')}</div></div><div class="dashboard-card card-closed"><h3>Cancelled</h3><div class="value">${c('cancelled')}</div></div>`;}
function applyInquiryFilters(){v9InjectFilters(); let search=''; document.querySelectorAll('#inquirySearch').forEach(input=>{if(input.value.trim())search=input.value.toLowerCase();}); const oldStatus=document.getElementById('inquiryFilter')?.value||''; const newStatus=document.getElementById('inquiryStatusFilter')?.value||'all'; const category=document.getElementById('v9InquiryFilter')?.value||v9InquiryFilter||'all'; let status=''; if(newStatus&&newStatus!=='all')status=newStatus.toLowerCase(); if(oldStatus)status=oldStatus.toLowerCase(); const filtered=allInquiries.filter(item=>{const text=`${item.reference||''} ${item.guestName||''} ${item.guestEmail||''} ${item.guestMobile||''} ${item.serviceType||''} ${item.itemName||''} ${item.message||''}`.toLowerCase(); return (category==='all'||classifyInquiryItem(item)===category)&&(!status||normalizeStatus(item.status)===status)&&(!search||text.includes(search));}); renderDashboardCards(allInquiries); if(typeof renderInquiryTypeCards==='function')renderInquiryTypeCards(allInquiries); renderInquiryTable(filtered); const box=document.getElementById('inquiriesList'); if(box)box.innerHTML=''; v9RemoveDuplicateControls();}
function applyBookingFilters(){v9InjectFilters(); const search=(document.getElementById('bookingSearch')?.value||'').toLowerCase(); const status=(document.getElementById('bookingStatusFilter')?.value||'all').toLowerCase(); const type=(document.getElementById('bookingTypeFilter')?.value||'all').toLowerCase(); const category=document.getElementById('v9BookingFilter')?.value||v9BookingFilter||'all'; const filtered=allBookings.filter(item=>{const cat=classifyBookingItem(item); const typeText=`${item.serviceType||''} ${item.itemName||''} ${item.bookingCategory||''}`.toLowerCase(); const searchText=`${item.id||''} ${item.reference||''} ${item.itemName||''} ${item.serviceType||''} ${item.guestName||''} ${item.guestEmail||''} ${item.guestMobile||''}`.toLowerCase(); return (category==='all'||cat===category)&&(status==='all'||normalizeStatus(item.status)===status)&&(type==='all'||typeText.includes(type)||cat===type)&&(!search||searchText.includes(search));}); renderBookingStats(allBookings); renderBookingsTable(filtered); renderBookingsCalendar(filtered); renderAvailabilityMatrix(); v9RemoveDuplicateControls();}
async function cleanupOrphanBookings(){if(!confirm('Clean orphan bookings?'))return; const res=await fetch(`${API_BASE}/api/admin/bookings/cleanup-orphans`,{method:'POST',headers:authHeaders()}); const result=await res.json(); if(!res.ok)return alert(result.error||'Cleanup failed'); alert(`Removed ${result.deleted||0} orphan booking(s).`); await loadBookings(); await loadInquiries();}
async function syncBookingsFromInquiries(){const res=await fetch(`${API_BASE}/api/admin/bookings/sync-from-inquiries`,{method:'POST',headers:authHeaders()}); const result=await res.json(); if(!res.ok)return alert(result.error||'Sync failed'); alert('Booking sync completed'); await loadBookings(); await loadInquiries();}
function v9PaymentPayload(){return {currency:document.getElementById('bookingConfirmCurrency')?.value||'USD',unitRate:document.getElementById('bookingConfirmDayRate')?.value||'',discountPercent:document.getElementById('quoteDiscountPercent')?.value||'0',discountAmount:document.getElementById('quoteDiscountAmount')?.value||'0',totalAmount:document.getElementById('bookingConfirmTotalAmount')?.value||'',validUntil:document.getElementById('quoteValidUntil')?.value||'',paymentStatus:document.getElementById('quotePaymentStatus')?.value||'Pending',advanceAmount:document.getElementById('quoteAdvanceAmount')?.value||'',balanceAmount:document.getElementById('quoteBalanceAmount')?.value||'',adminMessage:document.getElementById('bookingConfirmAdminMessage')?.value||''};}
async function savePaymentStatus(sendEmail=false){const id=currentInquiry?.id; if(!id)return alert('Inquiry not selected'); if(!confirm(sendEmail?'Save payment and send invoice/payment email to guest?':'Save payment status and sync with booking?'))return; const payload=v9PaymentPayload(); payload.sendEmail=!!sendEmail; const res=await fetch(`${API_BASE}/api/admin/inquiries/${id}/payment-sync`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)}); const result=await res.json(); if(!res.ok)return alert(result.error||'Payment sync failed'); alert(sendEmail?(result.emailSent?'Payment saved and email sent':'Payment saved, but email was not sent'):'Payment status saved'); await loadInquiries(); await loadBookings(); const refreshed=allInquiries.find(x=>String(x.id)===String(id)); if(refreshed){currentInquiry=refreshed; openInquiryModal(id);}}
function v9InjectPaymentButtons(){const panel=document.querySelector('.v65-quote-panel, .booking-confirm-panel'); if(!panel||document.getElementById('v9SavePaymentBtn'))return; const row=panel.querySelector('.v65-action-row')||panel; const save=document.createElement('button'); save.id='v9SavePaymentBtn'; save.type='button'; save.textContent='Save Payment Status'; save.onclick=()=>savePaymentStatus(false); const mail=document.createElement('button'); mail.id='v9SendPaymentBtn'; mail.type='button'; mail.textContent='Send Payment / Invoice Email'; mail.onclick=()=>savePaymentStatus(true); row.appendChild(save); row.appendChild(mail);}
const v9OldOpenInquiryModal=typeof openInquiryModal==='function'?openInquiryModal:null; if(v9OldOpenInquiryModal){openInquiryModal=function(id){v9OldOpenInquiryModal(id); setTimeout(v9InjectPaymentButtons,150);};}
const v9OldShowTab=typeof showTab==='function'?showTab:null; if(v9OldShowTab){showTab=function(tab){v9OldShowTab(tab); setTimeout(v9InjectFilters,80);};}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(v9InjectFilters,600); setTimeout(v9RemoveDuplicateControls,1200);});


/* V9.1 DUPLICATE UI CLEANUP */
function v91Text(x){ return String(x || "").replace(/\s+/g," ").trim().toLowerCase(); }

function v91DedupeButtons(root=document){
  const labels = new Set(["save payment status","send payment / invoice email","send quote / invoice","mark guest confirmed","admin confirm booking","clean orphans","sync bookings"]);
  const seen = new Set();
  root.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(!labels.has(t)) return;
    if(seen.has(t)) btn.remove();
    else seen.add(t);
  });
}

function v91CleanModal(){
  const modal = document.getElementById("inquiryModal") || document.querySelector(".modal, .admin-modal") || document;

  const panels = [...modal.querySelectorAll(".v65-quote-panel, .booking-confirm-panel")];
  if(panels.length > 1){
    const keep = panels.find(p => v91Text(p.textContent).includes("payment status")) || panels[0];
    panels.forEach(p => { if(p !== keep) p.remove(); });
  }

  const modern = modal.querySelector(".v65-quote-panel, .booking-confirm-panel");
  if(modern){
    modal.querySelectorAll("h3,h4,strong,legend").forEach(h=>{
      const t = v91Text(h.textContent);
      if(t.includes("property quote / booking details") || t.includes("tour quote / booking details")){
        const box = h.closest(".modal-section,.form-section,.card,section,div");
        if(box && box !== modern && !modern.contains(box)) box.remove();
      }
    });
  }

  modal.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(t === "confirm booking" && !btn.closest(".v65-quote-panel,.booking-confirm-panel")) btn.remove();
    if(t === "property bookings" || t === "tour bookings") btn.remove();
  });

  v91DedupeButtons(modal);
}

function v91CleanPage(){
  document.querySelectorAll(".v6-mode-tabs").forEach(x=>x.remove());
  document.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(t === "property bookings" || t === "tour bookings") btn.remove();
  });
  v91DedupeButtons(document);
}

const v91OldOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v91OldOpenInquiryModal){
  openInquiryModal = function(id){
    v91OldOpenInquiryModal(id);
    setTimeout(v91CleanModal, 80);
    setTimeout(v91CleanModal, 250);
    setTimeout(v91CleanModal, 700);
  };
}

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(v91CleanPage, 600);
  setInterval(()=>{ v91CleanPage(); v91CleanModal(); }, 1500);
});


/* =========================
   V9.2 TOUR CONFIRM FIX
   Tour booking uses Tour Date / Pickup details and does not require property fields.
========================= */

function v92IsTourInquiry(item){
  const t = `${item?.serviceType || ""} ${item?.itemName || ""} ${item?.message || ""}`.toLowerCase();
  return t.includes("tour") || t.includes("trip") || t.includes("safari") || t.includes("excursion") || t.includes("pickup") || t.includes("round tour");
}

function v92DatePlusOne(value){
  if(!value) return "";
  const d = new Date(value + "T00:00:00");
  if(isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0,10);
}

function v92GetTourDate(){
  return document.getElementById("tourDate")?.value ||
         document.getElementById("bookingConfirmTourDate")?.value ||
         document.querySelector("input[type='date']")?.value ||
         currentInquiry?.dateFrom ||
         "";
}

function v92GetBookingDates(inquiry){
  if(v92IsTourInquiry(inquiry)){
    const d = v92GetTourDate();
    return { dateFrom: d, dateTo: v92DatePlusOne(d) };
  }
  return {
    dateFrom: inquiry?.dateFrom || document.getElementById("bookingConfirmDateFrom")?.value || "",
    dateTo: inquiry?.dateTo || document.getElementById("bookingConfirmDateTo")?.value || ""
  };
}

function v92GetItemName(inquiry){
  return inquiry?.itemName ||
    String(inquiry?.serviceType || "")
      .replace("Tour Inquiry - ","")
      .replace("Tours Inquiry - ","")
      .replace("Villa Inquiry - ","")
      .replace("Apartment Inquiry - ","")
      .replace("Homestay Inquiry - ","")
      .trim() ||
    (v92IsTourInquiry(inquiry) ? "Tour Booking" : "Property Booking");
}

async function confirmBooking(sendEmail = true) {
  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  const isTour = v92IsTourInquiry(currentInquiry);
  const dates = v92GetBookingDates(currentInquiry);
  const itemName = v92GetItemName(currentInquiry);

  if(!itemName || !dates.dateFrom){
    alert(isTour ? "Please enter Tour Date before confirming." : "Missing property/tour or booking dates");
    return;
  }

  if(!isTour && !dates.dateTo){
    alert("Please enter check-out date before confirming.");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

  try {
    const currency = document.getElementById("bookingConfirmCurrency")?.value || "USD";
    const rate = document.getElementById("bookingConfirmDayRate")?.value ||
                 document.getElementById("tourAdultRate")?.value ||
                 document.getElementById("adultRate")?.value || "";
    const totalAmount = document.getElementById("bookingConfirmTotalAmount")?.value || "";
    const discountPercent = document.getElementById("quoteDiscountPercent")?.value || "0";
    const discountAmount = document.getElementById("quoteDiscountAmount")?.value || "0";
    const paymentStatus = document.getElementById("quotePaymentStatus")?.value || "Pending";
    const advanceAmount = document.getElementById("quoteAdvanceAmount")?.value || "";
    const balanceAmount = document.getElementById("quoteBalanceAmount")?.value || "";
    const adminMessage = document.getElementById("bookingConfirmAdminMessage")?.value || "";

    const payload = {
      inquiryId: currentInquiry.id,
      reference: currentInquiry.reference,
      itemName,
      serviceType: currentInquiry.serviceType || (isTour ? "Tour Inquiry" : "Property Inquiry"),
      guestName: currentInquiry.guestName,
      guestEmail: currentInquiry.guestEmail,
      guestMobile: currentInquiry.guestMobile,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      guests: document.getElementById("bookingConfirmNights")?.value || currentInquiry.guests || "1",
      checkInTime: document.getElementById("bookingConfirmCheckInTime")?.value || currentInquiry.checkInTime || "14:00",
      checkOutTime: document.getElementById("bookingConfirmCheckOutTime")?.value || currentInquiry.checkOutTime || "11:00",
      pickupTime: document.getElementById("tourPickupTime")?.value || currentInquiry.pickupTime || "",
      pickupLocation: document.getElementById("tourPickupLocation")?.value || currentInquiry.pickupLocation || "",
      childRate: document.getElementById("tourChildRate")?.value || currentInquiry.childRate || "",
      currency,
      dayRate: rate,
      adultRate: rate,
      totalDays: isTour ? "1" : (document.getElementById("bookingConfirmNights")?.value || "1"),
      discountPercent,
      discountAmount,
      totalAmount,
      paymentStatus,
      advanceAmount,
      balanceAmount,
      guestConfirmed: currentInquiry.guestConfirmed ? 1 : 0,
      adminConfirmed: 1,
      bookingCategory: isTour ? "tour" : "property",
      sendEmail,
      adminMessage
    };

    const res = await fetch(`${API_BASE}/api/admin/bookings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || "Booking failed");
      return;
    }

    await loadBookings();
    await loadInquiries();

    alert("Booking Confirmed");
    closeInquiryModal?.();

  } catch (err) {
    alert(err.message);
  }
}


/* =========================
   V10 PROFESSIONAL STABLE - SEPARATE TOUR / PROPERTY WORKFLOW
========================= */
function v10Norm(x){return String(x||'').replace(/\s+/g,' ').trim().toLowerCase();}
function v10IsTour(i){const t=v10Norm(`${i?.serviceType||''} ${i?.itemName||''} ${i?.message||''}`);return t.includes('tour')||t.includes('trip')||t.includes('safari')||t.includes('excursion')||t.includes('pickup')||t.includes('guide')||t.includes('round tour');}
function v10IsService(i){const t=v10Norm(`${i?.serviceType||''} ${i?.itemName||''}`);return t.includes('service')||t.includes('cafe')||t.includes('restaurant')||t.includes('contact')||t.includes('taxi')||t.includes('rental');}
function classifyInquiryItem(i){return v10IsTour(i)?'tour':(v10IsService(i)?'service':'property');}
function classifyBookingItem(i){if(v10IsTour(i))return'tour'; if(String(i?.reference||'').startsWith('MAN-')||String(i?.inquiryId||'').startsWith('MAN-'))return'manual'; return'property';}
function v10Bool(v){return v===1||v===true||String(v||'').toLowerCase()==='true'||String(v||'')==='1';}
function v10Badge(i){return `${v10Bool(i?.guestConfirmed)?'<span class="status-badge status-booked">Guest Confirmed</span>':'<span class="status-badge status-quoted">Guest Pending</span>'} ${v10Bool(i?.adminConfirmed)||normalizeStatus(i?.status)==='booked'?'<span class="status-badge status-booked">Admin Confirmed</span>':'<span class="status-badge status-contacted">Admin Pending</span>'} <span class="status-badge ${String(i?.paymentStatus||'Pending').toLowerCase().includes('paid')?'status-booked':'status-contacted'}">${escapeHtml(i?.paymentStatus||'Pending')}</span>`;}
function v10DatePlusOne(v){if(!v)return'';const d=new Date(v+'T00:00:00');if(isNaN(d.getTime()))return'';d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
function v10Name(i){return i?.itemName||String(i?.serviceType||'').replace('Tour Inquiry - ','').replace('Tours Inquiry - ','').replace('Villa Inquiry - ','').replace('Apartment Inquiry - ','').replace('Homestay Inquiry - ','').trim()||(v10IsTour(i)?'Tour Booking':'Property Booking');}
function v10CleanOldPanels(root=document){
  root.querySelectorAll('.v65-quote-panel,.booking-confirm-panel').forEach(x=>x.remove());
  root.querySelectorAll('button').forEach(b=>{const t=v10Norm(b.textContent); if((t==='confirm booking'||t==='property bookings'||t==='tour bookings')&&!b.closest('.v10-panel')) b.remove();});
  const seen=new Set(); root.querySelectorAll('button').forEach(b=>{const t=v10Norm(b.textContent); if(['send quote / invoice','mark guest confirmed','admin confirm booking','save payment status','send payment / invoice email'].includes(t)){if(seen.has(t))b.remove();else seen.add(t);}});
}
function v10Panel(i){
 const isTour=v10IsTour(i), cur=i.quoteCurrency||i.currency||'USD', pay=i.paymentStatus||'Pending';
 const opts=['USD','LKR','EUR','OMR'].map(c=>`<option value="${c}" ${cur===c?'selected':''}>${c}</option>`).join('');
 const payopts=['Pending','Advance Paid','Paid','Refunded'].map(s=>`<option value="${s}" ${pay===s?'selected':''}>${s}</option>`).join('');
 if(isTour){return `<div class="modal-section v10-panel"><h4>Tour Quote / Booking Details</h4><div class="v10-badges">${v10Badge(i)}</div><div class="v10-grid">
 <label>Tour Date *<input id="v10TourDate" type="date" value="${escapeHtml(i.dateFrom||'')}"></label><label>Pickup Time<input id="tourPickupTime" type="time" value="${escapeHtml(i.pickupTime||'')}"></label><label>Pickup Location<input id="tourPickupLocation" value="${escapeHtml(i.pickupLocation||'')}"></label><label>Currency<select id="bookingConfirmCurrency">${opts}</select></label><label>Adults / Qty<input id="bookingConfirmNights" type="number" min="1" value="${escapeHtml(i.guests||'1')}" oninput="v10Calc()"></label><label>Children<input id="v10Children" type="number" min="0" value="${escapeHtml(i.children||'0')}" oninput="v10Calc()"></label><label>Adult Rate<input id="bookingConfirmDayRate" type="number" step="0.01" value="${escapeHtml(i.quoteUnitRate||i.adultRate||i.dayRate||'')}" oninput="v10Calc()"></label><label>Child Rate<input id="tourChildRate" type="number" step="0.01" value="${escapeHtml(i.childRate||'')}" oninput="v10Calc()"></label><label>Discount %<input id="quoteDiscountPercent" type="number" step="0.01" value="${escapeHtml(i.quoteDiscountPercent||i.discountPercent||'0')}" oninput="v10Calc()"></label><label>Discount Amount<input id="quoteDiscountAmount" type="number" step="0.01" value="${escapeHtml(i.quoteDiscountAmount||i.discountAmount||'0')}" oninput="v10Calc()"></label><label>Total Amount<input id="bookingConfirmTotalAmount" type="number" step="0.01" value="${escapeHtml(i.quoteTotalAmount||i.totalAmount||'')}"></label><label>Advance Paid<input id="quoteAdvanceAmount" type="number" step="0.01" value="${escapeHtml(i.advanceAmount||'')}" oninput="v10Balance()"></label><label>Balance<input id="quoteBalanceAmount" type="number" step="0.01" value="${escapeHtml(i.balanceAmount||'')}"></label><label>Payment Status<select id="quotePaymentStatus">${payopts}</select></label><label>Quote Valid Until<input id="quoteValidUntil" type="date" value="${escapeHtml(i.quoteValidUntil||'')}"></label></div><label class="v10-full">Admin Message to Guest<textarea id="bookingConfirmAdminMessage">${escapeHtml(i.adminMessage||'')}</textarea></label>${v10Actions()}</div>`;}
 return `<div class="modal-section v10-panel"><h4>Property Quote / Booking Details</h4><div class="v10-badges">${v10Badge(i)}</div><div class="v10-grid"><label>Check-in Date *<input id="v10DateFrom" type="date" value="${escapeHtml(i.dateFrom||'')}"></label><label>Check-out Date *<input id="v10DateTo" type="date" value="${escapeHtml(i.dateTo||'')}"></label><label>Check-in Time<input id="bookingConfirmCheckInTime" type="time" value="${escapeHtml(i.checkInTime||'14:00')}"></label><label>Check-out Time<input id="bookingConfirmCheckOutTime" type="time" value="${escapeHtml(i.checkOutTime||'11:00')}"></label><label>Currency<select id="bookingConfirmCurrency">${opts}</select></label><label>Night Rate<input id="bookingConfirmDayRate" type="number" step="0.01" value="${escapeHtml(i.quoteUnitRate||i.dayRate||'')}" oninput="v10Calc()"></label><label>Total Nights<input id="bookingConfirmNights" type="number" min="1" value="${escapeHtml(i.totalDays||i.guests||'1')}" oninput="v10Calc()"></label><label>Discount %<input id="quoteDiscountPercent" type="number" step="0.01" value="${escapeHtml(i.quoteDiscountPercent||i.discountPercent||'0')}" oninput="v10Calc()"></label><label>Discount Amount<input id="quoteDiscountAmount" type="number" step="0.01" value="${escapeHtml(i.quoteDiscountAmount||i.discountAmount||'0')}" oninput="v10Calc()"></label><label>Total Amount<input id="bookingConfirmTotalAmount" type="number" step="0.01" value="${escapeHtml(i.quoteTotalAmount||i.totalAmount||'')}"></label><label>Advance Paid<input id="quoteAdvanceAmount" type="number" step="0.01" value="${escapeHtml(i.advanceAmount||'')}" oninput="v10Balance()"></label><label>Balance<input id="quoteBalanceAmount" type="number" step="0.01" value="${escapeHtml(i.balanceAmount||'')}"></label><label>Payment Status<select id="quotePaymentStatus">${payopts}</select></label><label>Quote Valid Until<input id="quoteValidUntil" type="date" value="${escapeHtml(i.quoteValidUntil||'')}"></label></div><label class="v10-full">Admin Message to Guest<textarea id="bookingConfirmAdminMessage">${escapeHtml(i.adminMessage||'')}</textarea></label>${v10Actions()}</div>`;
}
function v10Actions(){return `<div class="v10-actions"><button type="button" onclick="sendQuoteToGuest('${escapeJs(currentInquiry?.id||'')}')">Send Quote / Invoice</button><button type="button" onclick="markGuestConfirmedManually('${escapeJs(currentInquiry?.id||'')}')">Mark Guest Confirmed</button><button type="button" onclick="confirmBooking(true)">Admin Confirm Booking</button><button type="button" onclick="savePaymentStatus(false)">Save Payment Status</button><button type="button" onclick="savePaymentStatus(true)">Send Payment / Invoice Email</button></div>`;}
function v10Calc(){const tour=v10IsTour(currentInquiry||{}), ar=Number(document.getElementById('bookingConfirmDayRate')?.value||0), q=Number(document.getElementById('bookingConfirmNights')?.value||1), cr=Number(document.getElementById('tourChildRate')?.value||0), ch=Number(document.getElementById('v10Children')?.value||0), p=Number(document.getElementById('quoteDiscountPercent')?.value||0), da=Number(document.getElementById('quoteDiscountAmount')?.value||0);let gross=tour?(ar*q+cr*ch):(ar*q);let total=Math.max(gross-(gross*p/100)-da,0);const b=document.getElementById('bookingConfirmTotalAmount');if(b)b.value=total?total.toFixed(2):'';v10Balance();}
function v10Balance(){const total=Number(document.getElementById('bookingConfirmTotalAmount')?.value||0), adv=Number(document.getElementById('quoteAdvanceAmount')?.value||0), b=document.getElementById('quoteBalanceAmount');if(b)b.value=total?Math.max(total-adv,0).toFixed(2):'';}
function v10RenderModal(){const modal=document.getElementById('inquiryModal')||document.querySelector('.modal,.admin-modal')||document;if(!currentInquiry)return;v10CleanOldPanels(modal);if(!modal.querySelector('.v10-panel')){const body=document.getElementById('inquiryModalBody')||modal;body.insertAdjacentHTML('afterbegin',v10Panel(currentInquiry));}}
const v10OldOpenInquiryModal=typeof openInquiryModal==='function'?openInquiryModal:null;if(v10OldOpenInquiryModal){openInquiryModal=function(id){v10OldOpenInquiryModal(id);setTimeout(v10RenderModal,80);setTimeout(v10RenderModal,300);setTimeout(v10RenderModal,800);};}
function v10PaymentPayload(){return{currency:document.getElementById('bookingConfirmCurrency')?.value||'USD',unitRate:document.getElementById('bookingConfirmDayRate')?.value||'',discountPercent:document.getElementById('quoteDiscountPercent')?.value||'0',discountAmount:document.getElementById('quoteDiscountAmount')?.value||'0',totalAmount:document.getElementById('bookingConfirmTotalAmount')?.value||'',validUntil:document.getElementById('quoteValidUntil')?.value||'',paymentStatus:document.getElementById('quotePaymentStatus')?.value||'Pending',advanceAmount:document.getElementById('quoteAdvanceAmount')?.value||'',balanceAmount:document.getElementById('quoteBalanceAmount')?.value||'',adminMessage:document.getElementById('bookingConfirmAdminMessage')?.value||''};}
async function savePaymentStatus(sendEmail=false){const id=currentInquiry?.id;if(!id)return alert('Inquiry not selected');const payload=v10PaymentPayload();payload.sendEmail=!!sendEmail;if(!confirm(sendEmail?'Save payment and send invoice/payment email to guest?':'Save payment status and sync with booking?'))return;const res=await fetch(`${API_BASE}/api/admin/inquiries/${id}/payment-sync`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)return alert(result.error||'Payment sync failed');alert(sendEmail?(result.emailSent?'Payment saved and email sent':'Payment saved, but email was not sent'):'Payment status saved');await loadInquiries();await loadBookings();const r=allInquiries.find(x=>String(x.id)===String(id));if(r){currentInquiry=r;openInquiryModal(id);}}
async function confirmBooking(sendEmail=true){if(!currentInquiry)return alert('No inquiry selected');const tour=v10IsTour(currentInquiry);const itemName=v10Name(currentInquiry);let dateFrom,dateTo;if(tour){dateFrom=document.getElementById('v10TourDate')?.value||currentInquiry.dateFrom||'';dateTo=dateFrom?v10DatePlusOne(dateFrom):'';if(!dateFrom)return alert('Please enter Tour Date before confirming.');}else{dateFrom=document.getElementById('v10DateFrom')?.value||currentInquiry.dateFrom||'';dateTo=document.getElementById('v10DateTo')?.value||currentInquiry.dateTo||'';if(!dateFrom||!dateTo)return alert('Please enter Check-in and Check-out dates before confirming.');}if(!confirm('Confirm this booking?'))return;const payload={inquiryId:currentInquiry.id,reference:currentInquiry.reference,itemName,serviceType:currentInquiry.serviceType||(tour?'Tour Inquiry':'Property Inquiry'),guestName:currentInquiry.guestName,guestEmail:currentInquiry.guestEmail,guestMobile:currentInquiry.guestMobile,dateFrom,dateTo,guests:document.getElementById('bookingConfirmNights')?.value||currentInquiry.guests||'1',checkInTime:document.getElementById('bookingConfirmCheckInTime')?.value||'14:00',checkOutTime:document.getElementById('bookingConfirmCheckOutTime')?.value||'11:00',pickupTime:document.getElementById('tourPickupTime')?.value||'',pickupLocation:document.getElementById('tourPickupLocation')?.value||'',childRate:document.getElementById('tourChildRate')?.value||'',adultRate:document.getElementById('bookingConfirmDayRate')?.value||'',currency:document.getElementById('bookingConfirmCurrency')?.value||'USD',dayRate:document.getElementById('bookingConfirmDayRate')?.value||'',totalDays:tour?'1':(document.getElementById('bookingConfirmNights')?.value||'1'),discountPercent:document.getElementById('quoteDiscountPercent')?.value||'0',discountAmount:document.getElementById('quoteDiscountAmount')?.value||'0',totalAmount:document.getElementById('bookingConfirmTotalAmount')?.value||'',paymentStatus:document.getElementById('quotePaymentStatus')?.value||'Pending',advanceAmount:document.getElementById('quoteAdvanceAmount')?.value||'',balanceAmount:document.getElementById('quoteBalanceAmount')?.value||'',bookingCategory:tour?'tour':'property',guestConfirmed:currentInquiry.guestConfirmed?1:0,adminConfirmed:1,sendEmail,adminMessage:document.getElementById('bookingConfirmAdminMessage')?.value||''};const res=await fetch(`${API_BASE}/api/admin/bookings`,{method:'POST',headers:authHeaders(),body:JSON.stringify(payload)});const result=await res.json();if(!res.ok)return alert(result.error||'Booking failed');alert('Booking Confirmed');await loadBookings();await loadInquiries();closeInquiryModal?.();}
document.addEventListener('DOMContentLoaded',()=>{setInterval(()=>{const m=document.getElementById('inquiryModal');if(m&&!m.classList.contains('hidden'))v10RenderModal();},1500);});
/* =====================================================
   BOOKING DATE GUARD - OVERLAP PROTECTION
===================================================== */

async function ceybreezLoadBookedDatesForProperty(propertyName) {
  if (!propertyName) return [];

  const res = await fetch(`${API_BASE}/api/admin/bookings`, {
    headers: authHeaders()
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to load bookings");
  }

  const booked = [];

  (data || []).forEach(item => {
    const status = String(item.status || "Booked").toLowerCase();
    const itemName = String(item.itemName || "").trim().toLowerCase();
    const selected = String(propertyName || "").trim().toLowerCase();

    if (status !== "booked") return;
    if (itemName !== selected) return;

    const start = String(item.dateFrom || "").slice(0, 10);
    const end = String(item.dateTo || "").slice(0, 10);

    if (!start || !end) return;

    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);

    for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
      booked.push({
        date: d.toISOString().slice(0, 10),
        reference: item.reference || item.id || "",
        guestName: item.guestName || "",
        type: item.serviceType || "Booking"
      });
    }
  });

  return booked;
}

async function ceybreezCheckManualBookingDateConflict() {
  const propertyName = document.getElementById("manualItemName")?.value || "";
  const dateFrom = document.getElementById("manualDateFrom")?.value || "";
  const dateTo = document.getElementById("manualDateTo")?.value || "";
  const msg = document.getElementById("manualAvailabilityMsg");

  if (msg) {
    msg.className = "manual-availability-msg";
    msg.textContent = "";
  }

  if (!propertyName || !dateFrom || !dateTo) {
    return true;
  }

  const booked = await ceybreezLoadBookedDatesForProperty(propertyName);

  const s = new Date(`${dateFrom}T00:00:00`);
  const e = new Date(`${dateTo}T00:00:00`);

  for (let d = new Date(s); d < e; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const conflict = booked.find(x => x.date === iso);

    if (conflict) {
      if (msg) {
        msg.className = "manual-availability-msg bad";
        msg.textContent =
          `Not available: ${iso} already booked (${conflict.reference || "Booking"}).`;
      }

      return false;
    }
  }

  if (msg) {
    msg.className = "manual-availability-msg good";
    msg.textContent = "Available for selected dates.";
  }

  return true;
}

function ceybreezAttachManualBookingDateGuard() {
  const form = document.getElementById("manualBookingForm");
  if (!form || form.dataset.dateGuard === "1") return;

  form.dataset.dateGuard = "1";

  ["manualItemName", "manualDateFrom", "manualDateTo"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      ceybreezCheckManualBookingDateConflict().catch(console.error);
    });
  });

  form.addEventListener(
    "submit",
    async event => {
      const ok = await ceybreezCheckManualBookingDateConflict();

      if (!ok) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("This property is not available for the selected dates.");
      }
    },
    true
  );
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(ceybreezAttachManualBookingDateGuard, 500);
});
let allTourPackages = [];

function tourLinesToArray(value) {
  return String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
}

function tourArrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function showTourPackagesTab() {
  document.querySelectorAll(".admin-panel section").forEach(s => s.classList.add("hidden"));
  document.getElementById("tourPackagesTab")?.classList.remove("hidden");
  loadTourPackages();
}

async function loadTourPackages() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/tour-packages`, {
      headers: authHeaders()
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load tour packages");

    allTourPackages = data || [];
    renderTourPackagesTable();
  } catch (err) {
    alert(err.message);
  }
}

function renderTourPackagesTable() {
  const tbody = document.getElementById("tourPackagesTableBody");
  if (!tbody) return;

  const search = (document.getElementById("tourPackageSearch")?.value || "").toLowerCase();
  const status = document.getElementById("tourPackageStatusFilter")?.value || "all";

  let data = allTourPackages.filter(t => {
    const text = `${t.title || ""} ${t.category || ""} ${t.location || ""}`.toLowerCase();

    const statusOk =
      status === "all" ||
      (status === "active" && t.active) ||
      (status === "hidden" && !t.active) ||
      (status === "featured" && t.featured);

    return statusOk && (!search || text.includes(search));
  });

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No tour packages found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(t => `
    <tr class="clickable-row" onclick="editTourPackage('${escapeJs(t.id)}')">
      <td>
        <strong>${escapeHtml(t.title || "-")}</strong><br>
        <small>${escapeHtml(t.slug || "")}</small>
      </td>
      <td>${escapeHtml(t.category || "-")}</td>
      <td>${escapeHtml(t.location || "-")}</td>
      <td>${escapeHtml(t.duration || "-")}</td>
      <td>${escapeHtml(t.currency || "USD")} ${escapeHtml(t.basePrice || "0")}</td>
      <td>${t.active ? `<span class="status-badge status-booked">Active</span>` : `<span class="status-badge status-cancelled">Hidden</span>`}</td>
      <td>${t.featured ? `<span class="status-badge status-quoted">Featured</span>` : "-"}</td>
      <td onclick="event.stopPropagation();">
        <button class="mini-btn" onclick="editTourPackage('${escapeJs(t.id)}')">Edit</button>
        <button class="delete-btn mini-btn" onclick="deleteTourPackage('${escapeJs(t.id)}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openAddTourPackageForm() {
  resetTourPackageForm();
  document.getElementById("tourPackageFormTitle").textContent = "Add Tour Package";
  document.getElementById("tourPackageFormBox").classList.remove("hidden");
}

function editTourPackage(id) {
  const t = allTourPackages.find(x => String(x.id) === String(id));
  if (!t) return;

  document.getElementById("tourPackageFormTitle").textContent = "Edit Tour Package";
  document.getElementById("tourEditId").value = t.id || "";
  document.getElementById("tourTitle").value = t.title || "";
  document.getElementById("tourSlug").value = t.slug || "";
  document.getElementById("tourCategory").value = t.category || "";
  document.getElementById("tourLocation").value = t.location || "";
  document.getElementById("tourDuration").value = t.duration || "";
  document.getElementById("tourCurrency").value = t.currency || "USD";
  document.getElementById("tourBasePrice").value = t.basePrice || "";
  document.getElementById("tourChildPrice").value = t.childPrice || "";
  document.getElementById("tourShortDescription").value = t.shortDescription || "";
  document.getElementById("tourFullDescription").value = t.fullDescription || "";
  document.getElementById("tourItinerary").value = tourArrayToLines(t.itinerary);
  document.getElementById("tourInclusions").value = tourArrayToLines(t.inclusions);
  document.getElementById("tourExclusions").value = tourArrayToLines(t.exclusions);
  document.getElementById("tourMainImage").value = t.mainImage || "";
  document.getElementById("tourPhotos").value = tourArrayToLines(t.photos);
  document.getElementById("tourPickupAvailable").checked = !!t.pickupAvailable;
  document.getElementById("tourActive").checked = !!t.active;
  document.getElementById("tourFeatured").checked = !!t.featured;
  document.getElementById("tourSortOrder").value = t.sortOrder || 0;

  document.getElementById("tourPackageFormBox").classList.remove("hidden");
}

function resetTourPackageForm() {
  document.getElementById("tourPackageForm")?.reset();
  document.getElementById("tourEditId").value = "";
  document.getElementById("tourPickupAvailable").checked = true;
  document.getElementById("tourActive").checked = true;
  document.getElementById("tourFeatured").checked = false;
  document.getElementById("tourSortOrder").value = 0;
}

async function saveTourPackage(e) {
  e.preventDefault();

  const id = document.getElementById("tourEditId").value || "";

  const data = {
    title: document.getElementById("tourTitle").value.trim(),
    slug: document.getElementById("tourSlug").value.trim(),
    category: document.getElementById("tourCategory").value.trim(),
    location: document.getElementById("tourLocation").value.trim(),
    duration: document.getElementById("tourDuration").value.trim(),
    currency: document.getElementById("tourCurrency").value,
    basePrice: document.getElementById("tourBasePrice").value.trim(),
    childPrice: document.getElementById("tourChildPrice").value.trim(),
    shortDescription: document.getElementById("tourShortDescription").value.trim(),
    fullDescription: document.getElementById("tourFullDescription").value.trim(),
    itinerary: tourLinesToArray(document.getElementById("tourItinerary").value),
    inclusions: tourLinesToArray(document.getElementById("tourInclusions").value),
    exclusions: tourLinesToArray(document.getElementById("tourExclusions").value),
    mainImage: document.getElementById("tourMainImage").value.trim(),
    photos: tourLinesToArray(document.getElementById("tourPhotos").value),
    pickupAvailable: document.getElementById("tourPickupAvailable").checked,
    active: document.getElementById("tourActive").checked,
    featured: document.getElementById("tourFeatured").checked,
    sortOrder: Number(document.getElementById("tourSortOrder").value || 0)
  };

  if (!data.title) return alert("Tour title is required");

  const url = id
    ? `${API_BASE}/api/admin/tour-packages/${id}`
    : `${API_BASE}/api/admin/tour-packages`;

  const method = id ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Tour save failed");
    return;
  }

  alert(result.message || "Tour saved");
  resetTourPackageForm();
  document.getElementById("tourPackageFormBox").classList.add("hidden");
  await loadTourPackages();
}

async function deleteTourPackage(id) {
  if (!confirm("Delete this tour package?")) return;

  const res = await fetch(`${API_BASE}/api/admin/tour-packages/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Tour package deleted");
  await loadTourPackages();
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tourPackageForm")?.addEventListener("submit", saveTourPackage);
  document.getElementById("tourPackageSearch")?.addEventListener("input", renderTourPackagesTable);
  document.getElementById("tourPackageStatusFilter")?.addEventListener("change", renderTourPackagesTable);
});
