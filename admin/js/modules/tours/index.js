import { getDestinations, getTourPackages, saveTourPackage, deleteTourPackage, uploadTourImage } from "./api.js";
import { renderToursModuleShell, renderDestinationOptions, renderCategoryOptions, renderTourPackagesTable, renderTourStats, linesToArray, arrayToLines } from "./render.js";

let toursModuleReady = false;
let allTourPackages = [];
let allTourDestinations = [];
const formTabs = ["basic", "pricing", "content", "gallery", "settings", "seo"];
let currentFormTab = "basic";
let formDirty = false;
let slugManuallyEdited = false;
let draggedGalleryIndex = null;

function slugify(value) {
  return String(value || "").toLowerCase().trim().replaceAll("&", "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function byId(id) { return document.getElementById(id); }
function val(id) { return byId(id)?.value?.trim?.() || ""; }
function checked(id) { return !!byId(id)?.checked; }
function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }
function setValue(id, value) { const el = byId(id); if (el) el.value = value ?? ""; }
function setUploadStatus(id, message = "", isError = false) { const el = byId(id); if (!el) return; el.textContent = message; el.classList.toggle("error", !!isError); }
function isValidUrlOrPath(value) {
  if (!value) return true;
  if (/^(images\/|\.\.?\/|\/)/i.test(value)) return true;
  try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol); } catch { return false; }
}
function isNonNegativeNumber(value) { if (!value) return true; const n = Number(value); return Number.isFinite(n) && n >= 0; }
function setDirty(value = true) { formDirty = value; const badge = byId("tourDirtyBadge"); if (badge) { badge.textContent = value ? "Unsaved" : "Saved"; badge.classList.toggle("unsaved", value); } }

/* V6.6.1: detach the Tours editor from transformed/overflow admin containers.
   A fixed modal inside those containers can be clipped and appear as a half form.
   Mounting it directly under <body> makes it use the real browser viewport,
   matching the final Properties editor behaviour. */
function ensureTourModalPortal() {
  const overlay = byId("tourPackageFormBox");
  if (!overlay || !document.body) return;
  overlay.classList.add("tour-modal-overlay");
  if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
  overlay.dataset.tourViewportPortal = "1";
}

function setPane(name) {
  const pane = name === "packages" ? "packages" : "destinations";
  document.querySelectorAll(".tours-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tourTab === pane));
  byId("tourDestinationsPane")?.classList.toggle("active", pane === "destinations");
  byId("tourPackagesPane")?.classList.toggle("active", pane === "packages");
  if (pane === "packages") loadTourPackages();
}

function setFormTab(name) {
  currentFormTab = formTabs.includes(name) ? name : "basic";
  document.querySelectorAll(".tour-editor-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tourFormTab === currentFormTab));
  document.querySelectorAll(".tour-form-pane").forEach(pane => pane.classList.toggle("active", pane.dataset.tourFormPane === currentFormTab));
  const idx = formTabs.indexOf(currentFormTab);
  const prevBtn = byId("tourFormPrevBtn"); const nextBtn = byId("tourFormNextBtn");
  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) { nextBtn.disabled = idx >= formTabs.length - 1; nextBtn.textContent = idx === formTabs.length - 2 ? "Review SEO →" : "Next →"; }
  byId("tourPackageFormBox")?.querySelector(".tour-modal-body")?.scrollTo({ top: 0, behavior: "smooth" });
}
function nextFormTab(step) { const idx = formTabs.indexOf(currentFormTab); setFormTab(formTabs[Math.min(Math.max(idx + step, 0), formTabs.length - 1)]); }

function updateImageErrorState(img, container, errorText) {
  img.addEventListener("error", () => { container?.classList.add("image-broken"); setText(errorText, "Image could not be loaded"); });
  img.addEventListener("load", () => { container?.classList.remove("image-broken"); if (errorText) setText(errorText, ""); });
}

function renderTourImagePreviews() {
  const mainUrl = val("tourMainImage");
  const mainPreview = byId("tourMainImagePreview");
  if (mainPreview) {
    if (mainUrl) {
      mainPreview.innerHTML = `<img src="${mainUrl.replaceAll('"','&quot;')}" alt="Tour main image preview"><div class="tour-image-broken-label">⚠ Image unavailable</div>`;
      const img = mainPreview.querySelector("img"); if (img) updateImageErrorState(img, mainPreview, "tourMainImageStatus");
    } else mainPreview.innerHTML = `<div class="tour-empty-media">🖼️<span>No main image selected</span></div>`;
  }

  const photos = linesToArray(val("tourPhotos"));
  const gallery = byId("tourGalleryPreview");
  if (gallery) {
    gallery.innerHTML = photos.length ? photos.map((url, index) => `<div class="tour-gallery-thumb" draggable="true" data-tour-photo-index="${index}"><img src="${url.replaceAll('"','&quot;')}" alt="Tour gallery image ${index + 1}"><span class="tour-gallery-order">${index + 1}</span><div class="tour-thumb-actions"><button type="button" data-tour-photo-up="${index}" aria-label="Move image left">←</button><button type="button" data-tour-photo-down="${index}" aria-label="Move image right">→</button><button type="button" class="remove" data-tour-photo-remove="${index}" aria-label="Remove image">×</button></div><div class="tour-image-broken-label">⚠ Broken</div></div>`).join("") : "<p>No gallery images selected</p>";
    gallery.querySelectorAll(".tour-gallery-thumb img").forEach(img => { img.addEventListener("error", () => img.closest(".tour-gallery-thumb")?.classList.add("image-broken")); img.addEventListener("load", () => img.closest(".tour-gallery-thumb")?.classList.remove("image-broken")); });
  }
  setText("tourGalleryCount", photos.length);
  updateLivePreview();
}

function reorderGallery(from, to) {
  const photos = linesToArray(val("tourPhotos"));
  if (from < 0 || to < 0 || from >= photos.length || to >= photos.length || from === to) return;
  const [item] = photos.splice(from, 1); photos.splice(to, 0, item); setValue("tourPhotos", arrayToLines(photos)); renderTourImagePreviews(); setDirty(true);
}

async function uploadMainTourImage() {
  const input = byId("tourMainImageFile"); const file = input?.files?.[0]; if (!file) return;
  const button = byId("tourMainImageUploadBtn");
  try { if (button) button.disabled = true; setUploadStatus("tourMainImageStatus", "Uploading..."); const url = await uploadTourImage(file, "tour-packages/main"); setValue("tourMainImage", url); setUploadStatus("tourMainImageStatus", "Uploaded ✓"); renderTourImagePreviews(); setDirty(true); }
  catch (err) { console.error(err); setUploadStatus("tourMainImageStatus", err.message || "Upload failed", true); alert(err.message || "Main image upload failed"); }
  finally { if (button) button.disabled = false; if (input) input.value = ""; }
}

async function uploadTourGalleryImages() {
  const input = byId("tourGalleryFiles"); const files = [...(input?.files || [])]; if (!files.length) return;
  const button = byId("tourGalleryUploadBtn"); const existing = linesToArray(val("tourPhotos")); const uploaded = [];
  try { if (button) button.disabled = true; for (let i = 0; i < files.length; i += 1) { setUploadStatus("tourGalleryStatus", `Uploading ${i + 1} of ${files.length}...`); uploaded.push(await uploadTourImage(files[i], "tour-packages/gallery")); } setValue("tourPhotos", arrayToLines([...existing, ...uploaded])); setUploadStatus("tourGalleryStatus", `${uploaded.length} photo(s) uploaded ✓`); renderTourImagePreviews(); setDirty(true); }
  catch (err) { console.error(err); if (uploaded.length) { setValue("tourPhotos", arrayToLines([...existing, ...uploaded])); renderTourImagePreviews(); } setUploadStatus("tourGalleryStatus", err.message || "Upload failed", true); alert(err.message || "Gallery upload failed"); }
  finally { if (button) button.disabled = false; if (input) input.value = ""; }
}

function updateLivePreview() {
  const title = val("tourTitle") || "New Tour Package";
  const shortDesc = val("tourShortDescription") || "Add a short description to preview the package card.";
  const location = val("tourLocation") || "Sri Lanka"; const duration = val("tourDuration") || "Flexible"; const category = val("tourCategory") || "Tour Package"; const currency = byId("tourCurrency")?.value || "USD"; const price = val("tourBasePrice"); const image = val("tourMainImage");
  setText("tourLiveTitle", title); setText("tourLiveDescription", shortDesc); setText("tourLiveLocation", `📍 ${location}`); setText("tourLiveDuration", `🕒 ${duration}`); setText("tourLiveCategory", category); setText("tourLivePrice", price ? `${currency} ${price}` : "Price on request");
  byId("tourLiveFeatured")?.classList.toggle("hidden", !checked("tourFeatured"));
  const previewImage = byId("tourLivePreviewImage"); if (previewImage) { previewImage.innerHTML = image ? `<img src="${image.replaceAll('"','&quot;')}" alt="">` : `<div class="tour-empty-media">🖼️</div>`; }

  setText("tourShortCount", val("tourShortDescription").length); setText("tourFullCount", val("tourFullDescription").length);
  setText("tourItineraryCount", linesToArray(val("tourItinerary")).length); setText("tourInclusionsCount", linesToArray(val("tourInclusions")).length); setText("tourExclusionsCount", linesToArray(val("tourExclusions")).length);
  setText("tourContentItemCount", linesToArray(val("tourItinerary")).length + linesToArray(val("tourInclusions")).length + linesToArray(val("tourExclusions")).length);

  const slug = val("tourSlug") || slugify(title) || "tour-package"; const seoTitle = `${title} | CeyBreez`; const seoDescription = (val("tourShortDescription") || val("tourFullDescription") || "Explore this Sri Lanka tour package with CeyBreez.").replace(/\s+/g, " ").slice(0, 158);
  setText("tourSeoUrl", `https://ceybreez.com/tour-details.html?slug=${slug}`); setText("tourSeoTitlePreview", seoTitle); setText("tourSeoDescriptionPreview", seoDescription); setText("tourSeoTitleCount", seoTitle.length); setText("tourSeoDescriptionCount", seoDescription.length);

  const checks = [
    [!!title && title !== "New Tour Package", "Tour title"], [!!val("tourLocation"), "Destination"], [!!val("tourDuration"), "Duration"], [!!val("tourShortDescription"), "Short description"], [!!val("tourFullDescription"), "Full description"], [!!val("tourItinerary"), "Itinerary"], [!!image, "Main image"], [linesToArray(val("tourPhotos")).length > 0, "Gallery"]
  ];
  const done = checks.filter(x => x[0]).length; const percent = Math.round(done / checks.length * 100); setText("tourCompletenessPercent", `${percent}%`); if (byId("tourCompletenessBar")) byId("tourCompletenessBar").style.width = `${percent}%`;
  if (byId("tourCompletenessList")) byId("tourCompletenessList").innerHTML = checks.map(([ok,label]) => `<span class="${ok ? "done" : ""}">${ok ? "✓" : "○"} ${label}</span>`).join("");
  if (byId("tourSeoChecklist")) byId("tourSeoChecklist").innerHTML = `<div class="${seoTitle.length <= 60 ? "good" : "warn"}"><b>${seoTitle.length <= 60 ? "✓" : "!"}</b><span>SEO title ${seoTitle.length <= 60 ? "is within" : "is above"} the recommended ~60 characters.</span></div><div class="${seoDescription.length >= 80 && seoDescription.length <= 158 ? "good" : "warn"}"><b>${seoDescription.length >= 80 && seoDescription.length <= 158 ? "✓" : "!"}</b><span>Meta description is ${seoDescription.length} characters.</span></div><div class="${image ? "good" : "warn"}"><b>${image ? "✓" : "!"}</b><span>${image ? "Main image is available for social sharing." : "Add a main image for stronger social sharing."}</span></div>`;

  setText("tourTabStateBasic", title && val("tourLocation") && val("tourDuration") ? "✓" : ""); setText("tourTabStatePricing", price ? "✓" : ""); setText("tourTabStateContent", val("tourFullDescription") && val("tourItinerary") ? "✓" : ""); setText("tourTabStateGallery", image ? "✓" : ""); setText("tourTabStateSettings", checked("tourActive") ? "LIVE" : "HIDDEN"); setText("tourTabStateSeo", seoDescription.length >= 80 ? "✓" : "");
  setText("tourPublishStatus", checked("tourActive") ? "Will be public" : "Hidden from public");
  const warning = byId("tourPublishWarning"); if (warning) { const warnings = []; if (checked("tourActive") && !image) warnings.push("Active package has no main image."); if (checked("tourActive") && !val("tourShortDescription")) warnings.push("Active package has no short description."); warning.textContent = warnings.join(" "); warning.classList.toggle("hidden", !warnings.length); }
}

function markInputValidity() {
  let valid = true;
  const title = val("tourTitle"); const slug = val("tourSlug"); const base = val("tourBasePrice"); const child = val("tourChildPrice"); const main = val("tourMainImage"); const editId = val("tourEditId");
  const titleError = !title ? "Tour title is required." : ""; setText("tourTitleError", titleError); if (titleError) valid = false;
  let slugError = ""; if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) slugError = "Use lowercase letters, numbers and hyphens only."; if (!slugError && slug && allTourPackages.some(t => String(t.id) !== String(editId) && String(t.slug || "") === slug)) slugError = "This slug is already used by another tour."; setText("tourSlugError", slugError); if (slugError) valid = false;
  const baseError = !isNonNegativeNumber(base) ? "Enter a valid non-negative amount." : ""; setText("tourBasePriceError", baseError); if (baseError) valid = false;
  const childError = !isNonNegativeNumber(child) ? "Enter a valid non-negative amount." : ""; setText("tourChildPriceError", childError); if (childError) valid = false;
  const imageError = !isValidUrlOrPath(main) ? "Use a valid https:// URL or local image path." : ""; setText("tourMainImageError", imageError); if (imageError) valid = false;
  return valid;
}

async function loadTourPackages() {
  try { allTourDestinations = await getDestinations().catch(() => []); allTourPackages = await getTourPackages().catch(err => { console.error(err); return []; }); renderDestinationOptions(allTourDestinations || []); renderCategoryOptions(allTourPackages || []); renderTourPackagesTable(allTourPackages || []); renderTourStats(allTourPackages || []); }
  catch (err) { console.error("loadTourPackages failed", err); alert(err.message || "Failed to load tour packages"); }
}

function resetTourForm({ keepOpen = true } = {}) {
  const form = byId("tourPackageForm"); if (form) form.reset(); setValue("tourEditId", ""); if (byId("tourPickupAvailable")) byId("tourPickupAvailable").checked = true; if (byId("tourActive")) byId("tourActive").checked = true; if (byId("tourFeatured")) byId("tourFeatured").checked = false; setValue("tourSortOrder", 0); setUploadStatus("tourMainImageStatus", ""); setUploadStatus("tourGalleryStatus", ""); slugManuallyEdited = false; setDirty(false); renderTourImagePreviews(); markInputValidity(); setFormTab("basic"); updateLivePreview(); if (!keepOpen) closeTourForm(true);
}

function openTourForm(tour = null) {
  ensureTourModalPortal();
  resetTourForm(); setText("tourPackageFormTitle", tour ? "Edit Tour Package" : "Add Tour Package"); setText("tourPackageModeLabel", tour ? "EDIT PACKAGE" : "NEW PACKAGE"); setText("tourPackageFormSubtitle", tour ? "Update package details, media and publishing status." : "Build the package step by step. Required and recommended fields are highlighted.");
  if (tour) {
    setValue("tourEditId", tour.id || ""); setValue("tourTitle", tour.title || ""); setValue("tourSlug", tour.slug || ""); setValue("tourCategory", tour.category || ""); setValue("tourLocation", tour.location || ""); setValue("tourDuration", tour.duration || ""); setValue("tourCurrency", tour.currency || "USD"); setValue("tourBasePrice", tour.basePrice || ""); setValue("tourChildPrice", tour.childPrice || ""); setValue("tourShortDescription", tour.shortDescription || ""); setValue("tourFullDescription", tour.fullDescription || ""); setValue("tourItinerary", arrayToLines(tour.itinerary)); setValue("tourInclusions", arrayToLines(tour.inclusions)); setValue("tourExclusions", arrayToLines(tour.exclusions)); setValue("tourMainImage", tour.mainImage || ""); setValue("tourPhotos", arrayToLines(tour.photos)); if (byId("tourPickupAvailable")) byId("tourPickupAvailable").checked = !!tour.pickupAvailable; if (byId("tourActive")) byId("tourActive").checked = tour.active === true || Number(tour.active) === 1; if (byId("tourFeatured")) byId("tourFeatured").checked = tour.featured === true || Number(tour.featured) === 1; setValue("tourSortOrder", tour.sortOrder || 0); slugManuallyEdited = true;
  }
  renderTourImagePreviews(); updateLivePreview(); markInputValidity(); setDirty(false); const overlay = byId("tourPackageFormBox"); overlay?.classList.remove("hidden"); overlay?.setAttribute("aria-hidden", "false"); document.body.classList.add("tour-modal-open"); setFormTab("basic");
  const previewBtn = byId("tourPublicPreviewBtn"); if (previewBtn) previewBtn.disabled = !tour;
}

function closeTourForm(force = false) {
  if (!force && formDirty && !confirm("You have unsaved tour changes. Close without saving?")) return;
  const overlay = byId("tourPackageFormBox"); overlay?.classList.add("hidden"); overlay?.setAttribute("aria-hidden", "true"); document.body.classList.remove("tour-modal-open"); setDirty(false);
}

async function handleTourSubmit(e) {
  e?.preventDefault();
  if (!markInputValidity()) { if (!val("tourTitle") || val("tourSlug")) setFormTab("basic"); alert("Please fix the highlighted fields before saving."); return; }
  const saveBtn = byId("tourPackageSaveBtn"); const id = val("tourEditId"); const title = val("tourTitle");
  const payload = { title, slug: val("tourSlug") || slugify(title), category: val("tourCategory"), location: val("tourLocation"), duration: val("tourDuration"), currency: byId("tourCurrency")?.value || "USD", basePrice: val("tourBasePrice"), childPrice: val("tourChildPrice"), shortDescription: val("tourShortDescription"), fullDescription: val("tourFullDescription"), itinerary: linesToArray(val("tourItinerary")), inclusions: linesToArray(val("tourInclusions")), exclusions: linesToArray(val("tourExclusions")), mainImage: val("tourMainImage"), photos: linesToArray(val("tourPhotos")), pickupAvailable: checked("tourPickupAvailable"), active: checked("tourActive"), featured: checked("tourFeatured"), sortOrder: Number(byId("tourSortOrder")?.value || 0) };
  try { if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving..."; } const result = await saveTourPackage(payload, id); setDirty(false); alert(result.message || "Tour package saved"); closeTourForm(true); await loadTourPackages(); }
  catch (err) { console.error(err); alert(err.message || "Tour package save failed. Check Worker route /api/admin/tour-packages."); }
  finally { if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Tour Package"; } }
}

function wireToursModule() {
  document.querySelectorAll(".tours-tab-btn").forEach(btn => btn.addEventListener("click", () => setPane(btn.dataset.tourTab)));
  document.querySelectorAll(".tour-editor-tab").forEach(btn => btn.addEventListener("click", () => setFormTab(btn.dataset.tourFormTab)));
  byId("tourFormPrevBtn")?.addEventListener("click", () => nextFormTab(-1)); byId("tourFormNextBtn")?.addEventListener("click", () => nextFormTab(1)); byId("addTourPackageBtn")?.addEventListener("click", () => openTourForm()); byId("tourPackageCloseBtn")?.addEventListener("click", () => closeTourForm());
  byId("tourPackageClearBtn")?.addEventListener("click", () => { if (!formDirty || confirm("Reset all unsaved changes in this editor?")) resetTourForm(); });
  byId("tourRegenerateSlugBtn")?.addEventListener("click", () => { setValue("tourSlug", slugify(val("tourTitle"))); slugManuallyEdited = true; markInputValidity(); updateLivePreview(); setDirty(true); });
  byId("tourPublicPreviewBtn")?.addEventListener("click", () => { const slug = val("tourSlug"); if (slug) window.open(`../tour-details.html?slug=${encodeURIComponent(slug)}`, "_blank", "noopener"); });

  byId("tourMainImageUploadBtn")?.addEventListener("click", () => byId("tourMainImageFile")?.click()); byId("tourMainImageFile")?.addEventListener("change", uploadMainTourImage); byId("tourMainImageRemoveBtn")?.addEventListener("click", () => { setValue("tourMainImage", ""); setUploadStatus("tourMainImageStatus", "Removed"); renderTourImagePreviews(); setDirty(true); });
  byId("tourGalleryUploadBtn")?.addEventListener("click", () => byId("tourGalleryFiles")?.click()); byId("tourGalleryFiles")?.addEventListener("change", uploadTourGalleryImages); byId("tourGalleryClearBtn")?.addEventListener("click", () => { if (linesToArray(val("tourPhotos")).length && !confirm("Clear all gallery photos?")) return; setValue("tourPhotos", ""); setUploadStatus("tourGalleryStatus", "Gallery cleared"); renderTourImagePreviews(); setDirty(true); });

  byId("tourGalleryPreview")?.addEventListener("click", e => { const remove = e.target.closest("[data-tour-photo-remove]"); const up = e.target.closest("[data-tour-photo-up]"); const down = e.target.closest("[data-tour-photo-down]"); if (remove) { const photos = linesToArray(val("tourPhotos")); photos.splice(Number(remove.dataset.tourPhotoRemove), 1); setValue("tourPhotos", arrayToLines(photos)); renderTourImagePreviews(); setDirty(true); } else if (up) reorderGallery(Number(up.dataset.tourPhotoUp), Number(up.dataset.tourPhotoUp) - 1); else if (down) reorderGallery(Number(down.dataset.tourPhotoDown), Number(down.dataset.tourPhotoDown) + 1); });
  byId("tourGalleryPreview")?.addEventListener("dragstart", e => { const thumb = e.target.closest("[data-tour-photo-index]"); if (!thumb) return; draggedGalleryIndex = Number(thumb.dataset.tourPhotoIndex); thumb.classList.add("dragging"); });
  byId("tourGalleryPreview")?.addEventListener("dragend", e => { e.target.closest("[data-tour-photo-index]")?.classList.remove("dragging"); draggedGalleryIndex = null; });
  byId("tourGalleryPreview")?.addEventListener("dragover", e => e.preventDefault());
  byId("tourGalleryPreview")?.addEventListener("drop", e => { e.preventDefault(); const thumb = e.target.closest("[data-tour-photo-index]"); if (!thumb || draggedGalleryIndex === null) return; reorderGallery(draggedGalleryIndex, Number(thumb.dataset.tourPhotoIndex)); draggedGalleryIndex = null; });

  byId("tourPackageForm")?.addEventListener("submit", handleTourSubmit);
  byId("tourPackageForm")?.addEventListener("input", e => { if (e.target.id === "tourTitle" && !slugManuallyEdited) setValue("tourSlug", slugify(e.target.value)); if (e.target.id === "tourSlug") slugManuallyEdited = true; if (e.target.id === "tourMainImage" || e.target.id === "tourPhotos") renderTourImagePreviews(); markInputValidity(); updateLivePreview(); setDirty(true); });
  byId("tourPackageForm")?.addEventListener("change", () => { markInputValidity(); updateLivePreview(); setDirty(true); });

  byId("tourPackageSearch")?.addEventListener("input", () => renderTourPackagesTable(allTourPackages)); byId("tourPackageCategoryFilter")?.addEventListener("change", () => renderTourPackagesTable(allTourPackages)); byId("tourPackageStatusFilter")?.addEventListener("change", () => renderTourPackagesTable(allTourPackages));
  byId("tourPackageFormBox")?.addEventListener("click", e => { if (e.target.id === "tourPackageFormBox") closeTourForm(); }); document.addEventListener("keydown", e => { if (e.key === "Escape" && !byId("tourPackageFormBox")?.classList.contains("hidden")) closeTourForm(); });
  window.addEventListener("beforeunload", e => { if (!formDirty) return; e.preventDefault(); e.returnValue = ""; });

  byId("tourPackagesTableBody")?.addEventListener("click", async e => {
    const editId = e.target.closest("[data-tour-edit]")?.dataset.tourEdit || e.target.closest("[data-tour-row]")?.dataset.tourRow; const deleteId = e.target.closest("[data-tour-delete]")?.dataset.tourDelete;
    if (deleteId) { e.stopPropagation(); const tour = allTourPackages.find(t => String(t.id) === String(deleteId)); if (!confirm(`Delete “${tour?.title || "this tour package"}”? This cannot be undone.`)) return; try { await deleteTourPackage(deleteId); alert("Tour package deleted"); await loadTourPackages(); } catch (err) { alert(err.message || "Delete failed"); } return; }
    if (editId) { const tour = allTourPackages.find(t => String(t.id) === String(editId)); if (tour) openTourForm(tour); }
  });
}

export async function initToursModule() {
  const container = byId("destinationsTab"); if (!container) return;
  if (!toursModuleReady) { renderToursModuleShell(container); wireToursModule(); ensureTourModalPortal(); setFormTab("basic"); toursModuleReady = true; }
}
window.initToursModule = initToursModule;
window.openToursPackagesPane = async function () { await initToursModule(); setPane("packages"); await loadTourPackages(); };
window.openAddTourPackageForm = function () { initToursModule().then(() => { setPane("packages"); openTourForm(); }); };
