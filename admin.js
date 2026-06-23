const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
let ADMIN_TOKEN = localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";
let allInquiries = [];
let allBookings = [];
let bookingCalendarDate = new Date();

document.addEventListener("DOMContentLoaded", () => {
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

 const manualBookingForm = document.getElementById("manualBookingForm");
if (manualBookingForm) manualBookingForm.addEventListener("submit", createManualBooking);

document.getElementById("manualServiceType")?.addEventListener("change", () => {
  renderManualPropertyDropdown(window.allProperties || []);
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
  document.getElementById("destinationsTab").classList.toggle("hidden", tab !== "destinations");
  document.getElementById("propertiesTab").classList.toggle("hidden", tab !== "properties");

  const inquiriesTab = document.getElementById("inquiriesTab");
  if (inquiriesTab) inquiriesTab.classList.toggle("hidden", tab !== "inquiriesTab");

  if (tab === "inquiriesTab") {
    loadInquiries();
  }

  const servicesTab = document.getElementById("servicesTab");
  if (servicesTab) servicesTab.classList.toggle("hidden", tab !== "services");

  if (tab === "services") {
    loadServices();
  }

  const bookingsTab = document.getElementById("bookingsTab");
  if (bookingsTab) bookingsTab.classList.toggle("hidden", tab !== "bookingsTab");

  if (tab === "bookingsTab") {
    loadBookings();
  }

  const pageTab = document.getElementById("pageControlTab");
  if (pageTab) pageTab.classList.toggle("hidden", tab !== "pageControl");

  if (tab === "pageControl") {
    loadSiteContent();
    loadPageSections();
  }
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

/* DESTINATIONS */

async function loadDestinations() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/destinations`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load destinations");

    const box = document.getElementById("destinationsList");
    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      const firstPhoto = item.photos && item.photos.length ? item.photos[0] : "";

      card.innerHTML = `
        ${firstPhoto ? `<img src="${firstPhoto}" class="card-thumb" alt="${item.name}">` : ""}
        <span class="status ${item.active ? "" : "off"}">${item.active ? "Active" : "Hidden"}</span>
        <h3>${item.name}</h3>
        <p><strong>Province:</strong> ${item.province || ""}</p>
        <p><strong>Best For:</strong> ${item.bestFor || ""}</p>
        <p><strong>Time:</strong> ${item.timeNeeded || ""}</p>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      `;

      card.querySelector(".edit-btn").onclick = () => editDestination(item);
      card.querySelector(".delete-btn").onclick = () => deleteDestination(item.id);
      box.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

async function saveDestination(e) {
  e.preventDefault();

  const editId = document.getElementById("destEditId").value;

  const data = {
    name: document.getElementById("destName").value.trim(),
    province: document.getElementById("destProvince").value.trim(),
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
  document.getElementById("destEditId").value = item.id;
  document.getElementById("destName").value = item.name || "";
  document.getElementById("destProvince").value = item.province || "";
  document.getElementById("destLat").value = item.lat || "";
  document.getElementById("destLng").value = item.lng || "";
  document.getElementById("destMapUrl").value = item.mapUrl || "";
  document.getElementById("destBestFor").value = item.bestFor || "";
  document.getElementById("destTime").value = item.timeNeeded || "";
  document.getElementById("destNearby").value = item.nearby || "";
  document.getElementById("destDescription").value = item.description || "";
  document.getElementById("destPhotos").value = arrayToLines(item.photos);
  document.getElementById("destActive").checked = !!item.active;
  document.getElementById("destFeatured").checked = item.featured || false;
  renderPhotoPreview("dest");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDestinationForm() {
  document.getElementById("destinationForm").reset();
  document.getElementById("destEditId").value = "";
  document.getElementById("destActive").checked = true;
  document.getElementById("destUploadStatus").textContent = "";
  document.getElementById("destPhotoPreview").innerHTML = "";
  document.getElementById("destFeatured").checked = false;
  document.getElementById("destMapUrl").value = "";
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

/* PROPERTIES */

async function loadProperties() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/properties`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load properties");

    window.allProperties = data || [];
    renderManualPropertyDropdown(window.allProperties);

    const box = document.getElementById("propertiesList");
    if (!box) return;

    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      const firstPhoto = item.photos && item.photos.length ? item.photos[0] : "";

      card.innerHTML = `
        ${firstPhoto ? `<img src="${firstPhoto}" class="card-thumb" alt="${escapeHtml(item.name)}">` : ""}
        <span class="status ${item.active ? "" : "off"}">${item.active ? "Active" : "Hidden"}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p><strong>Type:</strong> ${escapeHtml(item.type)}</p>
        <p><strong>Location:</strong> ${escapeHtml(item.location || "")}</p>
        <p><strong>Price:</strong> ${escapeHtml(item.price || "")}</p>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      `;

      card.querySelector(".edit-btn").onclick = () => editProperty(item);
      card.querySelector(".delete-btn").onclick = () => deleteProperty(item.id);
      box.appendChild(card);
    });

  } catch (err) {
    alert(err.message);
  }
}

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
    price: document.getElementById("propPrice").value.trim(),
    guests: document.getElementById("propGuests").value.trim(),
    bedrooms: document.getElementById("propBedrooms").value.trim(),
    bathrooms: document.getElementById("propBathrooms").value.trim(),
    facilities: linesToArray(document.getElementById("propFacilities").value),
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
  document.getElementById("propEditId").value = item.id;
  document.getElementById("propType").value = item.type || "villa";
  document.getElementById("propName").value = item.name || "";
  document.getElementById("propLocation").value = item.location || "";
  document.getElementById("propLat").value = item.lat || "";
  document.getElementById("propLng").value = item.lng || "";
  document.getElementById("propMapUrl").value = item.mapUrl || "";
  document.getElementById("propPrice").value = item.price || "";
  document.getElementById("propGuests").value = item.guests || "";
  document.getElementById("propBedrooms").value = item.bedrooms || "";
  document.getElementById("propBathrooms").value = item.bathrooms || "";
  document.getElementById("propFacilities").value = arrayToLines(item.facilities);
  document.getElementById("propDescription").value = item.description || "";
  document.getElementById("propPhotos").value = arrayToLines(item.photos);
  document.getElementById("propActive").checked = !!item.active;
  document.getElementById("propFeatured").checked = item.featured || false;
  renderPhotoPreview("prop");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetPropertyForm() {
  document.getElementById("propertyForm").reset();
  document.getElementById("propEditId").value = "";
  document.getElementById("propActive").checked = true;
  document.getElementById("propUploadStatus").textContent = "";
  document.getElementById("propPhotoPreview").innerHTML = "";
  document.getElementById("propFeatured").checked = false;
  document.getElementById("propMapUrl").value = "";
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

  window.scrollTo({ top: 0, behavior: "smooth" });
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

/* SERVICES */

async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/services`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load services");

    const box = document.getElementById("servicesList");
    if (!box) return;

    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        ${item.image ? `<img src="${item.image}" class="card-thumb" alt="${item.name}">` : ""}
        <span class="status ${item.active ? "" : "off"}">${item.active ? "Active" : "Hidden"}</span>
        <h3>${item.name}</h3>
        <p><strong>Category:</strong> ${item.category || ""}</p>
        <p><strong>Location:</strong> ${item.location || ""}</p>
        <p><strong>Short:</strong> ${item.shortDescription || ""}</p>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      `;

      card.querySelector(".edit-btn").onclick = () => editService(item);
      card.querySelector(".delete-btn").onclick = () => deleteService(item.id);

      box.appendChild(card);
    });

  } catch (err) {
    alert(err.message);
  }
}

async function saveService(e) {
  e.preventDefault();

  const editId = document.getElementById("serviceEditId").value;

  const data = {
    id: editId || "",
    name: document.getElementById("serviceName").value.trim(),
    category: document.getElementById("serviceCategory").value,
    location: document.getElementById("serviceLocation").value.trim(),
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
  document.getElementById("serviceEditId").value = item.id || "";
  document.getElementById("serviceName").value = item.name || "";
  document.getElementById("serviceCategory").value = item.category || "Cafe";
  document.getElementById("serviceLocation").value = item.location || "";
  document.getElementById("serviceShortDescription").value = item.shortDescription || "";
  document.getElementById("serviceFullDescription").value = item.fullDescription || "";
  document.getElementById("servicePhone").value = item.phone || "";
  document.getElementById("serviceWhatsapp").value = item.whatsapp || "";
  document.getElementById("serviceWebsite").value = item.website || "";
  document.getElementById("serviceMapUrl").value = item.mapUrl || "";
  document.getElementById("serviceOpeningHours").value = item.openingHours || "";
  document.getElementById("serviceImage").value = item.image || "";
  document.getElementById("servicePhotos").value = arrayToLines(item.photos);
  document.getElementById("serviceActive").checked = !!item.active;
  document.getElementById("serviceFeatured").checked = item.featured || false;

  renderServicePhotosPreview();

  window.scrollTo({ top: 0, behavior: "smooth" });
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

    renderInquiryStats(allInquiries);
    renderDashboardCards(allInquiries);
    renderInquiryTypeCards(allInquiries);
    renderMonthlyInquiryChart(allInquiries);
    applyInquiryFilters();

  } catch (err) {
    alert(err.message);
  }
}

async function updateInquiryStatus(id, status) {

  const inquiry = allInquiries.find(
    x => String(x.id) === String(id)
  );

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Status update failed");
    return;
  }

  if (
    String(status).toLowerCase() === "booked" &&
    inquiry
  ) {
    currentInquiry = inquiry;
    await confirmBooking();
    return;
  }

  alert("Inquiry updated");
  loadInquiries();
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

    return (!status || itemStatus === status) &&
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
    renderBookingStats(allBookings);
    applyBookingFilters();
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

    return statusMatch && typeMatch && (!search || searchText.includes(search));
  });

  renderBookingsTable(filtered);
  renderBookingsCalendar(filtered);
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
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No bookings found</td></tr>`;
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
        <td>
          ${statusClass === "booked" ? `<button class="delete-btn mini-btn" onclick="event.stopPropagation(); cancelBooking('${escapeJs(item.id)}')">Cancel</button>` : "-"}
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
      guests
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

const savedBooking = allBookings.find(b =>
  String(b.reference || "").startsWith("MAN-")
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
      <p><b>Guests:</b> ${escapeHtml(booking.guests || "-")}</p>
      <p><b>Status:</b> ${escapeHtml(booking.status || "-")}</p>

      <div class="booking-detail-actions">
        ${
          normalizeStatus(booking.status) === "booked"
          ? `<button class="delete-btn" onclick="cancelBooking('${booking.id}')">Cancel Booking</button>`
          : ""
        }
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
            ${normalizeStatus(b.status) === "booked" ? `<button class="delete-btn" onclick="cancelBookingFromModal('${escapeJs(b.id)}')">Cancel Booking</button>` : ""}
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
  <button onclick="confirmBooking()">Confirm Booking</button>
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

        <button onclick="updateInquiryStatus(currentInquiry.id, document.getElementById('modalInquiryStatus').value)">
          Update Status
        </button>
      </div>
    </div>

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

  loadInquiryNotes();
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

async function confirmBooking() {

  console.log("CONFIRM BOOKING CLICKED", currentInquiry);

  if (!currentInquiry) {
    alert("No inquiry selected");
    return;
  }

  if (!confirm("Confirm this booking?")) return;

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
  dateTo: currentInquiry.dateTo,
  guests: currentInquiry.guests
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

  const selectedType =
    (document.getElementById("manualServiceType")?.value || "").toLowerCase();

  const filtered = (properties || []).filter(p => {
    const propType = String(p.type || "").toLowerCase();

    if(selectedType.includes("villa")) return propType === "villa";
    if(selectedType.includes("homestay")) return propType === "homestay";
    if(selectedType.includes("apartment")) return propType === "apartment";

    return true;
  });

  if(box.tagName.toLowerCase() === "select"){
    box.innerHTML = `
      <option value="">Select Property / Tour</option>
      ${filtered.map(p => `
        <option value="${escapeHtml(p.name)}">
          ${escapeHtml(p.name)} (${escapeHtml(p.type || "property")})
        </option>
      `).join("")}
    `;
    return;
  }

  const currentValue = box.value || "";

  const select = document.createElement("select");
  select.id = "manualItemName";
  select.required = true;

  select.innerHTML = `
    <option value="">Select Property / Tour</option>
    ${filtered.map(p => `
      <option value="${escapeHtml(p.name)}">
        ${escapeHtml(p.name)} (${escapeHtml(p.type || "property")})
      </option>
    `).join("")}
  `;

  box.replaceWith(select);

  if(currentValue){
    select.value = currentValue;
  }
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
