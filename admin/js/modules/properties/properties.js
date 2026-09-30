import { loadProperties as apiLoadProperties, saveProperty as apiSaveProperty, deleteProperty as apiDeleteProperty, uploadPropertyImage } from "./api.js";
import { renderPropertiesTable, extendPropertyForm, fillPropertyForm, collectPropertyPayload, linesToArray, arrayToLines } from "./render.js";

let propertyState = [];
const formTabs = ["basic", "stay", "pricing", "facilities", "gallery", "settings", "seo"];
let currentFormTab = "basic";
let formDirty = false;
let slugManuallyEdited = false;
let draggedGalleryIndex = null;
let refreshTimer = null;

function byId(id) { return document.getElementById(id); }
function val(id) { return byId(id)?.value?.trim?.() || ""; }
function checked(id) { return !!byId(id)?.checked; }
function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }
function setValue(id, value) { const el = byId(id); if (el) el.value = value ?? ""; }
function slugify(value) { return String(value || "").toLowerCase().trim().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function escapeAttr(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function isValidUrl(value) { if (!value) return true; try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol); } catch { return false; } }
function isValidImageUrlOrPath(value) { if (!value) return true; if (/^(images\/|\.\.?\/|\/)/i.test(value)) return true; return isValidUrl(value); }
function isNonNegative(value) { if (!value) return true; const n = Number(value); return Number.isFinite(n) && n >= 0; }

/* V6.1.2: keep the premium editor outside the V14/V15 content grid.
   Some admin shell/layout rules create clipping/containing contexts for descendants.
   Portalling the modal to <body> guarantees viewport-based positioning. */
function mountPropertyModalToBody() {
  const box = byId("propertyFormBox");
  if (!box || !document.body) return;
  if (box.parentNode !== document.body) document.body.appendChild(box);
  box.dataset.propertyViewportPortal = "1";
}
function recoverPropertyFormFromLegacyDrawer() {
  const form = byId("propertyForm");
  const box = byId("propertyFormBox");
  const drawer = byId("v64CmsDrawer");
  const drawerBody = byId("v64CmsDrawerBody");
  if (!form || !box) return;

  // Older Admin V6.4 moves CMS forms into the narrow right-side drawer and
  // wraps every input in .v64-field. The V6.1 property editor is a complete
  // layout of its own, so restore/unwrap it before opening.
  if (drawerBody?.contains(form) && typeof window.v64CloseCmsDrawer === "function") {
    try { window.v64CloseCmsDrawer(); } catch (_) {}
  }
  if (!box.contains(form)) box.appendChild(form);

  form.querySelectorAll(".v64-field").forEach((wrap) => {
    const control = wrap.querySelector("input, select, textarea");
    if (control) wrap.replaceWith(control);
    else wrap.remove();
  });
  delete form.dataset.v64Wrapped;
  drawer?.classList.add("hidden");
}

function showForm() {
  recoverPropertyFormFromLegacyDrawer();
  mountPropertyModalToBody();
  const box = byId("propertyFormBox");
  if (!box) return;
  box.classList.remove("hidden");
  box.classList.add("property-cms-modal-open");
  document.body.classList.add("property-editor-open");
}

function closeForm() {
  if (formDirty && !confirm("You have unsaved property changes. Close without saving?")) return;
  formDirty = false;
  const box = byId("propertyFormBox");
  box?.classList.add("hidden");
  box?.classList.remove("property-cms-modal-open");
  document.body.classList.remove("property-editor-open");
}
function setUploadStatus(id, message = "", isError = false) { const el = byId(id); if (!el) return; el.textContent = message; el.classList.toggle("error", !!isError); }
function setDirty(value = true) { formDirty = value; const badge = byId("propertyDirtyBadge"); if (badge) { badge.textContent = value ? "Unsaved" : "Saved"; badge.classList.toggle("unsaved", value); } }

function setFormTab(name) {
  currentFormTab = formTabs.includes(name) ? name : "basic";
  document.querySelectorAll(".property-editor-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.propertyFormTab === currentFormTab));
  document.querySelectorAll(".property-form-pane").forEach(pane => pane.classList.toggle("active", pane.dataset.propertyFormPane === currentFormTab));
  const idx = formTabs.indexOf(currentFormTab);
  const prev = byId("propertyFormPrevBtn"); const next = byId("propertyFormNextBtn");
  if (prev) prev.disabled = idx <= 0;
  if (next) { next.disabled = idx >= formTabs.length - 1; next.textContent = idx === formTabs.length - 2 ? "Review SEO →" : "Next →"; }
  byId("propertyFormBox")?.scrollTo?.({ top: 0, behavior: "smooth" });
}
function moveFormTab(step) { const idx = formTabs.indexOf(currentFormTab); setFormTab(formTabs[Math.min(Math.max(idx + step, 0), formTabs.length - 1)]); }

function facilityValues() {
  if (typeof window.getCheckedPropertyFacilities === "function") return window.getCheckedPropertyFacilities();
  return [...document.querySelectorAll(".prop-facility-check:checked")].map(x => x.value);
}

function renderMediaPreviews() {
  const main = val("propMainImage"); const logo = val("propLogo");
  const mainBox = byId("propMainImagePreview");
  if (mainBox) {
    mainBox.classList.remove("image-broken");
    mainBox.innerHTML = main ? `<img src="${escapeAttr(main)}" alt="Property cover preview"><div class="property-image-broken-label">⚠ Image unavailable</div>` : `<div class="property-empty-media">🖼️<span>No cover image</span></div>`;
    const img = mainBox.querySelector("img"); if (img) { img.addEventListener("error", () => mainBox.classList.add("image-broken")); img.addEventListener("load", () => mainBox.classList.remove("image-broken")); }
  }
  const logoBox = byId("propLogoPreview");
  if (logoBox) {
    logoBox.classList.remove("image-broken");
    logoBox.innerHTML = logo ? `<img src="${escapeAttr(logo)}" alt="Property badge preview"><div class="property-image-broken-label">⚠ Image unavailable</div>` : `<div class="property-empty-media">🏷️<span>No badge image</span></div>`;
    const img = logoBox.querySelector("img"); if (img) { img.addEventListener("error", () => logoBox.classList.add("image-broken")); img.addEventListener("load", () => logoBox.classList.remove("image-broken")); }
  }

  const photos = linesToArray(val("propPhotos"));
  const gallery = byId("propGalleryPreview");
  if (gallery) {
    gallery.innerHTML = photos.length ? photos.map((url, index) => `<div class="property-gallery-thumb" draggable="true" data-property-photo-index="${index}"><img src="${escapeAttr(url)}" alt="Gallery image ${index + 1}"><span class="property-gallery-order">${index + 1}</span><div class="property-thumb-actions"><button type="button" data-property-photo-up="${index}" aria-label="Move image left">←</button><button type="button" data-property-photo-down="${index}" aria-label="Move image right">→</button><button type="button" class="remove" data-property-photo-remove="${index}" aria-label="Remove image">×</button></div><div class="property-image-broken-label">⚠ Broken</div></div>`).join("") : `<p>No gallery images selected</p>`;
    gallery.querySelectorAll(".property-gallery-thumb img").forEach(img => { img.addEventListener("error", () => img.closest(".property-gallery-thumb")?.classList.add("image-broken")); img.addEventListener("load", () => img.closest(".property-gallery-thumb")?.classList.remove("image-broken")); });
  }
  setText("propertyGalleryCount", photos.length);
}

function reorderGallery(from, to) {
  const photos = linesToArray(val("propPhotos"));
  if (from < 0 || to < 0 || from >= photos.length || to >= photos.length || from === to) return;
  const [item] = photos.splice(from, 1); photos.splice(to, 0, item); setValue("propPhotos", arrayToLines(photos)); renderMediaPreviews(); updateLivePreview(); setDirty(true);
}

async function uploadSingle(inputId, fieldId, folder, statusId) {
  const input = byId(inputId); const file = input?.files?.[0]; if (!file) return;
  try { setUploadStatus(statusId, "Uploading..."); const url = await uploadPropertyImage(file, folder); setValue(fieldId, url); setUploadStatus(statusId, "Uploaded ✓"); renderMediaPreviews(); updateLivePreview(); setDirty(true); }
  catch (error) { setUploadStatus(statusId, error.message || "Upload failed", true); alert(error.message || "Upload failed"); }
  finally { if (input) input.value = ""; }
}

async function uploadGallery() {
  const input = byId("propGalleryFiles"); const files = [...(input?.files || [])]; if (!files.length) return;
  const existing = linesToArray(val("propPhotos")); const uploaded = [];
  try {
    for (let i = 0; i < files.length; i += 1) { setUploadStatus("propGalleryStatus", `Uploading ${i + 1} of ${files.length}...`); uploaded.push(await uploadPropertyImage(files[i], "property-gallery")); }
    setValue("propPhotos", arrayToLines([...existing, ...uploaded])); setUploadStatus("propGalleryStatus", `${uploaded.length} photo(s) uploaded ✓`); renderMediaPreviews(); updateLivePreview(); setDirty(true);
  } catch (error) { if (uploaded.length) setValue("propPhotos", arrayToLines([...existing, ...uploaded])); renderMediaPreviews(); setUploadStatus("propGalleryStatus", error.message || "Upload failed", true); alert(error.message || "Gallery upload failed"); }
  finally { if (input) input.value = ""; }
}

function updateLivePreview() {
  const type = val("propType") || "villa"; const name = val("propName") || "New Property"; const location = val("propLocation") || "Sri Lanka"; const description = val("propDescription") || "Add a description to preview the public stay card."; const price = val("propPrice") || "Price on request"; const guests = val("propMaxGuests") || "Guests"; const bedrooms = val("propBedrooms") || "Rooms"; const bathrooms = val("propBathrooms") || "Baths"; const main = val("propMainImage") || linesToArray(val("propPhotos"))[0] || "";
  setText("propertyLiveType", type.charAt(0).toUpperCase() + type.slice(1)); setText("propertyLiveTitle", name); setText("propertyLiveLocation", `📍 ${location}`); setText("propertyLiveGuests", `👥 ${guests}`); setText("propertyLiveRooms", `🛏 ${bedrooms} · 🚿 ${bathrooms}`); setText("propertyLivePrice", price); setText("propertyLiveDescription", description.length > 150 ? description.slice(0, 147) + "..." : description);
  byId("propertyLiveFeatured")?.classList.toggle("hidden", !checked("propFeatured"));
  const imageBox = byId("propertyLivePreviewImage"); if (imageBox) imageBox.innerHTML = main ? `<img src="${escapeAttr(main)}" alt="">` : `<div class="property-empty-media">🏡</div>`;

  setText("propDescriptionCount", val("propDescription").length); setText("propertyFacilityCount", facilityValues().length);
  setText("propertySetupSummary", `${guests === "Guests" ? "Guest capacity not set" : `Up to ${guests} guests`} · ${bedrooms === "Rooms" ? "Bedrooms not set" : `${bedrooms} bedrooms`} · ${bathrooms === "Baths" ? "Bathrooms not set" : `${bathrooms} bathrooms`} · Check-in ${val("propCheckInTime") || "14:00"} / Check-out ${val("propCheckOutTime") || "11:00"}`);
  const rate = (id) => val(id) || "—"; const ratePreview = byId("propertyRatePreview"); if (ratePreview) ratePreview.innerHTML = `<span>Base</span><strong>${rate("propBasePrice")}</strong><span>Weekend</span><strong>${rate("propWeekendPrice")}</strong><span>Seasonal</span><strong>${rate("propSeasonalPrice")}</strong>`;

  const mapOkay = isValidUrl(val("propMapUrl")); setText("propMapStatus", val("propMapUrl") ? (mapOkay ? "Valid link" : "Check link") : ((val("propLat") && val("propLng")) ? "Coordinates set" : "Not set"));
  const publish = byId("propertyPublishSummary"); if (publish) { publish.textContent = checked("propActive") ? (checked("propFeatured") ? "Property is LIVE and marked Featured." : "Property will be visible on the website.") : "Property is HIDDEN from public property listings."; publish.classList.toggle("hidden-state", !checked("propActive")); }

  const seoTitle = val("propSeoTitle") || `${name} | CeyBreez`; const seoDescription = val("propSeoDescription") || val("propDescription") || "Explore this Sri Lanka stay with CeyBreez."; const slug = val("propSlug") || slugify(name) || "property";
  setText("propSeoTitleCount", val("propSeoTitle").length); setText("propSeoDescriptionCount", val("propSeoDescription").length); setText("propertySeoTitlePreview", seoTitle); setText("propertySeoDescriptionPreview", seoDescription.replace(/\s+/g, " ").slice(0, 165)); setText("propertySeoUrl", `https://ceybreez.com/${type === "apartment" ? "apartments" : type === "homestay" ? "homestays" : "villas"}.html`);
  const seoList = byId("propertySeoChecklist"); if (seoList) { const titleLen = seoTitle.length; const descLen = seoDescription.length; seoList.innerHTML = `<div class="${titleLen >= 45 && titleLen <= 65 ? "good" : "warn"}">● SEO title ${titleLen >= 45 && titleLen <= 65 ? "is in a good range" : "works best around 50–60 characters"}.</div><div class="${descLen >= 120 && descLen <= 170 ? "good" : "warn"}">● SEO description ${descLen >= 120 && descLen <= 170 ? "is in a good range" : "works best around 140–160 characters"}.</div><div class="${main ? "good" : "warn"}">● ${main ? "Cover image is available" : "Add a cover image for stronger sharing/search presentation"}.</div>`; }

  const checks = [[!!val("propName"), "Name"], [!!val("propLocation"), "Location"], [!!val("propDescription"), "Description"], [!!val("propMaxGuests"), "Capacity"], [!!val("propBedrooms"), "Bedrooms"], [!!val("propPrice") || !!val("propBasePrice"), "Price"], [!!main, "Cover"], [linesToArray(val("propPhotos")).length > 0, "Gallery"], [facilityValues().length > 0, "Facilities"]];
  const done = checks.filter(([ok]) => ok).length; const percent = Math.round((done / checks.length) * 100); setText("propertyCompletenessPercent", `${percent}%`); const bar = byId("propertyCompletenessBar"); if (bar) bar.style.width = `${percent}%`; const list = byId("propertyCompletenessList"); if (list) list.innerHTML = checks.map(([ok, label]) => `<span class="${ok ? "done" : ""}">${ok ? "✓" : "○"} ${label}</span>`).join("");
}

function resetForm(type = "villa") {
  const form = byId("propertyForm"); if (!form) return;
  form.reset(); setValue("propEditId", ""); setValue("propType", type); setValue("propCheckInTime", "14:00"); setValue("propCheckOutTime", "11:00"); setValue("propSortOrder", "0"); setValue("propGuests", "");
  byId("propActive") && (byId("propActive").checked = true); byId("propFeatured") && (byId("propFeatured").checked = false); if (typeof window.setCheckedPropertyFacilities === "function") window.setCheckedPropertyFacilities([]);
  slugManuallyEdited = false; setFormTab("basic"); setDirty(false); ["propMainImageStatus", "propLogoStatus", "propGalleryStatus"].forEach(id => setUploadStatus(id, "")); renderMediaPreviews(); updateLivePreview();
}

function validatePayload(payload) {
  if (!payload.name) return "Property name is required.";
  if (!payload.type) return "Property type is required.";
  if (payload.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) return "Slug must use lowercase letters, numbers and hyphens only.";
  const duplicate = propertyState.find(item => String(item.id) !== String(payload.id || "") && payload.slug && String(item.slug || "").toLowerCase() === payload.slug.toLowerCase()); if (duplicate) return `Slug already used by “${duplicate.name || duplicate.id}”.`;
  if (payload.mapUrl && !isValidUrl(payload.mapUrl)) return "Official map link must be a valid http/https URL.";
  if (payload.mainImage && !isValidImageUrlOrPath(payload.mainImage)) return "Main image URL/path is invalid.";
  if (payload.logoImage && !isValidImageUrlOrPath(payload.logoImage)) return "Logo / badge URL/path is invalid.";
  for (const id of ["propMaxGuests", "propBedrooms", "propBathrooms", "propBeds", "propBasePrice", "propWeekendPrice", "propSeasonalPrice", "propCleaningFee", "propExtraGuestFee", "propChildPrice", "propSecurityDeposit"]) if (!isNonNegative(val(id))) return `${byId(id)?.closest("label")?.querySelector("span")?.textContent || id} must be zero or a positive number.`;
  if (payload.lat && (!Number.isFinite(Number(payload.lat)) || Number(payload.lat) < -90 || Number(payload.lat) > 90)) return "Latitude must be between -90 and 90.";
  if (payload.lng && (!Number.isFinite(Number(payload.lng)) || Number(payload.lng) < -180 || Number(payload.lng) > 180)) return "Longitude must be between -180 and 180.";
  return "";
}

async function refreshProperties() {
  clearTimeout(refreshTimer);
  try { propertyState = await apiLoadProperties(); window.allProperties = propertyState; renderPropertiesTable(propertyState); if (typeof window.renderManualPropertyDropdown === "function") window.renderManualPropertyDropdown(propertyState); if (typeof window.filterManualProperties === "function") window.filterManualProperties(); if (typeof window.renderAvailabilityMatrix === "function") window.renderAvailabilityMatrix(); }
  catch (error) { console.error("Properties load failed", error); }
}

async function submitProperty(event) {
  event?.preventDefault?.(); event?.stopImmediatePropagation?.();
  const payload = collectPropertyPayload(); const error = validatePayload(payload); if (error) return alert(error);
  try { const result = await apiSaveProperty(payload); alert(result?.pendingApproval ? (result.message || "Property change submitted for approval") : "Property saved"); setDirty(false); resetForm(payload.type || "villa"); if (typeof window.closeCmsForm === "function") window.closeCmsForm("propertyFormBox"); await refreshProperties(); }
  catch (errorSave) { alert(errorSave.message || "Property save failed"); }
}

function bindEditorEvents() {
  const form = byId("propertyForm"); if (!form || form.dataset.propertyPolishBound === "1") return;
  form.addEventListener("submit", submitProperty, true);
  form.addEventListener("input", (event) => { const id = event.target?.id || ""; if (id === "propName" && !slugManuallyEdited) setValue("propSlug", slugify(val("propName"))); if (id === "propSlug") slugManuallyEdited = true; if (id === "propMaxGuests") setValue("propGuests", val("propMaxGuests")); setDirty(true); if (["propMainImage", "propLogo", "propPhotos"].includes(id)) renderMediaPreviews(); updateLivePreview(); }, true);
  form.addEventListener("change", (event) => { if (event.target?.classList?.contains("prop-facility-check")) { setDirty(true); updateLivePreview(); } if (["propType", "propActive", "propFeatured"].includes(event.target?.id)) { setDirty(true); updateLivePreview(); } }, true);
  form.addEventListener("click", (event) => { const tab = event.target.closest("[data-property-form-tab]"); if (tab) { event.preventDefault(); setFormTab(tab.dataset.propertyFormTab); return; } const remove = event.target.closest("[data-property-photo-remove]"); if (remove) { const photos = linesToArray(val("propPhotos")); photos.splice(Number(remove.dataset.propertyPhotoRemove), 1); setValue("propPhotos", arrayToLines(photos)); renderMediaPreviews(); updateLivePreview(); setDirty(true); return; } const up = event.target.closest("[data-property-photo-up]"); if (up) { const i = Number(up.dataset.propertyPhotoUp); reorderGallery(i, i - 1); return; } const down = event.target.closest("[data-property-photo-down]"); if (down) { const i = Number(down.dataset.propertyPhotoDown); reorderGallery(i, i + 1); } }, true);
  form.addEventListener("dragstart", event => { const thumb = event.target.closest("[data-property-photo-index]"); if (!thumb) return; draggedGalleryIndex = Number(thumb.dataset.propertyPhotoIndex); thumb.classList.add("dragging"); });
  form.addEventListener("dragend", event => { event.target.closest("[data-property-photo-index]")?.classList.remove("dragging"); draggedGalleryIndex = null; });
  form.addEventListener("dragover", event => { if (event.target.closest("[data-property-photo-index]")) event.preventDefault(); });
  form.addEventListener("drop", event => { const thumb = event.target.closest("[data-property-photo-index]"); if (!thumb || draggedGalleryIndex === null) return; event.preventDefault(); reorderGallery(draggedGalleryIndex, Number(thumb.dataset.propertyPhotoIndex)); draggedGalleryIndex = null; });

  byId("propertyFormPrevBtn")?.addEventListener("click", () => moveFormTab(-1)); byId("propertyFormNextBtn")?.addEventListener("click", () => moveFormTab(1));
  byId("propMainImagePickBtn")?.addEventListener("click", () => byId("propMainImageFile")?.click()); byId("propMainImageFile")?.addEventListener("change", () => uploadSingle("propMainImageFile", "propMainImage", "property-main-images", "propMainImageStatus"));
  byId("propLogoPickBtn")?.addEventListener("click", () => byId("propLogoFile")?.click()); byId("propLogoFile")?.addEventListener("change", () => uploadSingle("propLogoFile", "propLogo", "property-logos", "propLogoStatus"));
  byId("propGalleryPickBtn")?.addEventListener("click", () => byId("propGalleryFiles")?.click()); byId("propGalleryFiles")?.addEventListener("change", uploadGallery);
  byId("propMainImageRemoveBtn")?.addEventListener("click", () => { setValue("propMainImage", ""); renderMediaPreviews(); updateLivePreview(); setDirty(true); }); byId("propLogoRemoveBtn")?.addEventListener("click", () => { setValue("propLogo", ""); renderMediaPreviews(); updateLivePreview(); setDirty(true); });
  form.dataset.propertyPolishBound = "1";
}

function interceptLegacyFilters() {
  const bind = (id, eventName) => { const el = byId(id); if (!el || el.dataset.propertyFilterBound === "1") return; el.addEventListener(eventName, event => { event.stopImmediatePropagation(); renderPropertiesTable(propertyState); }, true); el.dataset.propertyFilterBound = "1"; };
  bind("propertySearch", "input"); bind("propertyTypeFilter", "change"); bind("propertyStatusFilter", "change");
}

function installGlobalCompatibility() {
  window.loadEnterpriseProperties = refreshProperties;
  window.loadProperties = refreshProperties;
  window.renderPropertiesTable = () => renderPropertiesTable(propertyState);
  window.resetPropertyForm = () => resetForm(val("propType") || "villa");
  window.openAddEnterprisePropertyForm = function(type = "villa") { resetForm(type); setText("propertyFormBoxTitle", `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`); showForm(); updateLivePreview(); };
  window.openAddPropertyForm = window.openAddEnterprisePropertyForm;
  window.editEnterpriseProperty = function(id) { const item = propertyState.find(x => String(x.id) === String(id)) || (window.allProperties || []).find(x => String(x.id) === String(id)); if (!item) return alert("Property not found."); setText("propertyFormBoxTitle", "Edit Property"); fillPropertyForm(item); slugManuallyEdited = !!item.slug; setFormTab("basic"); renderMediaPreviews(); updateLivePreview(); setDirty(false); showForm(); };
  window.editPropertyById = window.editEnterpriseProperty;
  window.deleteEnterpriseProperty = async function(id) { if (!confirm("Delete this property?")) return; try { const result = await apiDeleteProperty(id); alert(result?.pendingApproval ? (result.message || "Delete submitted for approval") : "Property deleted"); await refreshProperties(); } catch (error) { alert(error.message || "Property delete failed"); } };
  window.deleteProperty = window.deleteEnterpriseProperty;
  window.saveProperty = submitProperty;
  window.closePropertyEditor = closeForm;
}

export function initPropertiesModule() {
  recoverPropertyFormFromLegacyDrawer();
  mountPropertyModalToBody();
  extendPropertyForm(); bindEditorEvents(); interceptLegacyFilters(); installGlobalCompatibility();
  const headerClose = byId("propertyFormBoxHeader")?.querySelector("button"); if (headerClose) { headerClose.removeAttribute("onclick"); headerClose.addEventListener("click", closeForm); }
  renderMediaPreviews(); updateLivePreview(); setFormTab("basic"); setTimeout(updateLivePreview, 250);
  document.addEventListener("click", event => { if (event.target?.closest?.('[data-v14-tab="properties"]')) setTimeout(refreshProperties, 80); }, true);
  const tab = byId("propertiesTab"); if (tab && !tab.classList.contains("hidden")) refreshProperties();
  window.addEventListener("beforeunload", event => { if (!formDirty) return; event.preventDefault(); event.returnValue = ""; });
}
