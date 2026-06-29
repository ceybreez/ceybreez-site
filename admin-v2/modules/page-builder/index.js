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

