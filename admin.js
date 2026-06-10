const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
let ADMIN_TOKEN = localStorage.getItem("CEYBREEZ_ADMIN_TOKEN") || "";

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
const servicesTab = document.getElementById("servicesTab");
if (servicesTab) servicesTab.classList.toggle("hidden", tab !== "services");
  if (tab === "services") {
  loadServices();
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
    bestFor: document.getElementById("destBestFor").value.trim(),
    timeNeeded: document.getElementById("destTime").value.trim(),
    nearby: document.getElementById("destNearby").value.trim(),
    description: document.getElementById("destDescription").value.trim(),
    photos: linesToArray(document.getElementById("destPhotos").value),
    active: document.getElementById("destActive").checked
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
  document.getElementById("destBestFor").value = item.bestFor || "";
  document.getElementById("destTime").value = item.timeNeeded || "";
  document.getElementById("destNearby").value = item.nearby || "";
  document.getElementById("destDescription").value = item.description || "";
  document.getElementById("destPhotos").value = arrayToLines(item.photos);
  document.getElementById("destActive").checked = !!item.active;
  renderPhotoPreview("dest");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDestinationForm() {
  document.getElementById("destinationForm").reset();
  document.getElementById("destEditId").value = "";
  document.getElementById("destActive").checked = true;
  document.getElementById("destUploadStatus").textContent = "";
  document.getElementById("destPhotoPreview").innerHTML = "";
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
    const res = await fetch(`${API_BASE}/api/admin/properties`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load properties");

    const box = document.getElementById("propertiesList");
    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      const firstPhoto = item.photos && item.photos.length ? item.photos[0] : "";

      card.innerHTML = `
        ${firstPhoto ? `<img src="${firstPhoto}" class="card-thumb" alt="${item.name}">` : ""}
        <span class="status ${item.active ? "" : "off"}">${item.active ? "Active" : "Hidden"}</span>
        <h3>${item.name}</h3>
        <p><strong>Type:</strong> ${item.type}</p>
        <p><strong>Location:</strong> ${item.location || ""}</p>
        <p><strong>Price:</strong> ${item.price || ""}</p>
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
    price: document.getElementById("propPrice").value.trim(),
    guests: document.getElementById("propGuests").value.trim(),
    bedrooms: document.getElementById("propBedrooms").value.trim(),
    bathrooms: document.getElementById("propBathrooms").value.trim(),
    facilities: linesToArray(document.getElementById("propFacilities").value),
    description: document.getElementById("propDescription").value.trim(),
    photos: linesToArray(document.getElementById("propPhotos").value),
    active: document.getElementById("propActive").checked
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
  document.getElementById("propPrice").value = item.price || "";
  document.getElementById("propGuests").value = item.guests || "";
  document.getElementById("propBedrooms").value = item.bedrooms || "";
  document.getElementById("propBathrooms").value = item.bathrooms || "";
  document.getElementById("propFacilities").value = arrayToLines(item.facilities);
  document.getElementById("propDescription").value = item.description || "";
  document.getElementById("propPhotos").value = arrayToLines(item.photos);
  document.getElementById("propActive").checked = !!item.active;
  renderPhotoPreview("prop");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetPropertyForm() {
  document.getElementById("propertyForm").reset();
  document.getElementById("propEditId").value = "";
  document.getElementById("propActive").checked = true;
  document.getElementById("propUploadStatus").textContent = "";
  document.getElementById("propPhotoPreview").innerHTML = "";
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

    data.forEach(item => {
      const el = document.getElementById(item.key);
      if (el) el.value = item.value || "";
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

  for (const key of keys) {
    const el = document.getElementById(key);
    if (!el) continue;

    await fetch(`${API_BASE}/api/admin/site-content`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ key, value: el.value })
    });
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
    active: document.getElementById("serviceActive").checked
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
