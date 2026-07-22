import { getDestinations, getTourPackages, saveTourPackage, deleteTourPackage, uploadTourImage } from "./api.js";
import {
  renderToursModuleShell,
  renderDestinationOptions,
  renderCategoryOptions,
  renderTourPackagesTable,
  linesToArray,
  arrayToLines
} from "./render.js";

let toursModuleReady = false;
let allTourPackages = [];
let allTourDestinations = [];
const formTabs = ["basic", "pricing", "content", "gallery", "settings"];
let currentFormTab = "basic";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function setUploadStatus(id, message = "", isError = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", !!isError);
}

function renderTourImagePreviews() {
  const mainUrl = document.getElementById("tourMainImage")?.value.trim() || "";
  const mainPreview = document.getElementById("tourMainImagePreview");
  if (mainPreview) {
    mainPreview.innerHTML = mainUrl
      ? `<img src="${mainUrl}" alt="Tour main image preview">`
      : "No main image selected";
  }

  const photos = linesToArray(document.getElementById("tourPhotos")?.value || "");
  const gallery = document.getElementById("tourGalleryPreview");
  if (gallery) {
    gallery.innerHTML = photos.length
      ? photos.map((url, index) => `
          <div class="tour-gallery-thumb">
            <img src="${url}" alt="Tour gallery image ${index + 1}">
            <button type="button" data-tour-photo-remove="${index}" aria-label="Remove image">×</button>
          </div>
        `).join("")
      : "<p>No gallery images selected</p>";
  }
}

async function uploadMainTourImage() {
  const input = document.getElementById("tourMainImageFile");
  const file = input?.files?.[0];
  if (!file) return;

  const button = document.getElementById("tourMainImageUploadBtn");
  try {
    if (button) button.disabled = true;
    setUploadStatus("tourMainImageStatus", "Uploading...");
    const url = await uploadTourImage(file, "tour-packages/main");
    const field = document.getElementById("tourMainImage");
    if (field) field.value = url;
    setUploadStatus("tourMainImageStatus", "Uploaded");
    renderTourImagePreviews();
  } catch (err) {
    console.error("Main tour image upload failed", err);
    setUploadStatus("tourMainImageStatus", err.message || "Upload failed", true);
    alert(err.message || "Main image upload failed");
  } finally {
    if (button) button.disabled = false;
    if (input) input.value = "";
  }
}

async function uploadTourGalleryImages() {
  const input = document.getElementById("tourGalleryFiles");
  const files = [...(input?.files || [])];
  if (!files.length) return;

  const button = document.getElementById("tourGalleryUploadBtn");
  const existing = linesToArray(document.getElementById("tourPhotos")?.value || "");
  const uploaded = [];

  try {
    if (button) button.disabled = true;
    for (let i = 0; i < files.length; i += 1) {
      setUploadStatus("tourGalleryStatus", `Uploading ${i + 1} of ${files.length}...`);
      uploaded.push(await uploadTourImage(files[i], "tour-packages/gallery"));
    }

    const field = document.getElementById("tourPhotos");
    if (field) field.value = arrayToLines([...existing, ...uploaded]);
    setUploadStatus("tourGalleryStatus", `${uploaded.length} photo(s) uploaded`);
    renderTourImagePreviews();
  } catch (err) {
    console.error("Tour gallery upload failed", err);
    if (uploaded.length) {
      const field = document.getElementById("tourPhotos");
      if (field) field.value = arrayToLines([...existing, ...uploaded]);
      renderTourImagePreviews();
    }
    setUploadStatus("tourGalleryStatus", err.message || "Upload failed", true);
    alert(err.message || "Gallery upload failed");
  } finally {
    if (button) button.disabled = false;
    if (input) input.value = "";
  }
}

function setPane(name) {
  const pane = name === "packages" ? "packages" : "destinations";

  document.querySelectorAll(".tours-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tourTab === pane);
  });

  document.getElementById("tourDestinationsPane")?.classList.toggle("active", pane === "destinations");
  document.getElementById("tourPackagesPane")?.classList.toggle("active", pane === "packages");

  if (pane === "packages") loadTourPackages();
}

function setFormTab(name) {
  currentFormTab = formTabs.includes(name) ? name : "basic";

  document.querySelectorAll(".tour-editor-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tourFormTab === currentFormTab);
  });

  document.querySelectorAll(".tour-form-pane").forEach(pane => {
    pane.classList.toggle("active", pane.dataset.tourFormPane === currentFormTab);
  });

  const idx = formTabs.indexOf(currentFormTab);
  const prevBtn = document.getElementById("tourFormPrevBtn");
  const nextBtn = document.getElementById("tourFormNextBtn");

  if (prevBtn) prevBtn.disabled = idx <= 0;
  if (nextBtn) nextBtn.disabled = idx >= formTabs.length - 1;
}

function nextFormTab(step) {
  const idx = formTabs.indexOf(currentFormTab);
  const next = formTabs[Math.min(Math.max(idx + step, 0), formTabs.length - 1)];
  setFormTab(next);
}

async function loadTourPackages() {
  try {
    allTourDestinations = await getDestinations().catch(() => []);
    allTourPackages = await getTourPackages().catch((err) => {
      console.error(err);
      return [];
    });

    renderDestinationOptions(allTourDestinations || []);
    renderCategoryOptions(allTourPackages || []);
    renderTourPackagesTable(allTourPackages || []);
  } catch (err) {
    console.error("loadTourPackages failed", err);
    alert(err.message || "Failed to load tour packages");
  }
}

function resetTourForm() {
  const form = document.getElementById("tourPackageForm");
  if (form) form.reset();

  const editId = document.getElementById("tourEditId");
  if (editId) editId.value = "";

  const pickup = document.getElementById("tourPickupAvailable");
  const active = document.getElementById("tourActive");
  const featured = document.getElementById("tourFeatured");
  const sort = document.getElementById("tourSortOrder");

  if (pickup) pickup.checked = true;
  if (active) active.checked = true;
  if (featured) featured.checked = false;
  if (sort) sort.value = 0;

  setUploadStatus("tourMainImageStatus", "");
  setUploadStatus("tourGalleryStatus", "");
  renderTourImagePreviews();
  setFormTab("basic");
}

function openTourForm(tour = null) {
  resetTourForm();

  document.getElementById("tourPackageFormTitle").textContent = tour ? "Edit Tour Package" : "Add Tour Package";

  if (tour) {
    document.getElementById("tourEditId").value = tour.id || "";
    document.getElementById("tourTitle").value = tour.title || "";
    document.getElementById("tourSlug").value = tour.slug || "";
    document.getElementById("tourCategory").value = tour.category || "";
    document.getElementById("tourLocation").value = tour.location || "";
    document.getElementById("tourDuration").value = tour.duration || "";
    document.getElementById("tourCurrency").value = tour.currency || "USD";
    document.getElementById("tourBasePrice").value = tour.basePrice || "";
    document.getElementById("tourChildPrice").value = tour.childPrice || "";
    document.getElementById("tourShortDescription").value = tour.shortDescription || "";
    document.getElementById("tourFullDescription").value = tour.fullDescription || "";
    document.getElementById("tourItinerary").value = arrayToLines(tour.itinerary);
    document.getElementById("tourInclusions").value = arrayToLines(tour.inclusions);
    document.getElementById("tourExclusions").value = arrayToLines(tour.exclusions);
    document.getElementById("tourMainImage").value = tour.mainImage || "";
    document.getElementById("tourPhotos").value = arrayToLines(tour.photos);
    document.getElementById("tourPickupAvailable").checked = !!tour.pickupAvailable;
    document.getElementById("tourActive").checked = tour.active === true || Number(tour.active) === 1;
    document.getElementById("tourFeatured").checked = tour.featured === true || Number(tour.featured) === 1;
    document.getElementById("tourSortOrder").value = tour.sortOrder || 0;
  }

  renderTourImagePreviews();
  document.getElementById("tourPackageFormBox")?.classList.remove("hidden");
  document.body.classList.add("tour-modal-open");
  setFormTab("basic");
}

function closeTourForm() {
  document.getElementById("tourPackageFormBox")?.classList.add("hidden");
  document.body.classList.remove("tour-modal-open");
}

async function handleTourSubmit(e) {
  if (e) e.preventDefault();

  const saveBtn = document.getElementById("tourPackageSaveBtn");
  const id = document.getElementById("tourEditId")?.value || "";
  const title = document.getElementById("tourTitle")?.value.trim() || "";

  if (!title) {
    setFormTab("basic");
    alert("Tour title is required");
    return;
  }

  const payload = {
    title,
    slug: document.getElementById("tourSlug")?.value.trim() || slugify(title),
    category: document.getElementById("tourCategory")?.value.trim() || "",
    location: document.getElementById("tourLocation")?.value.trim() || "",
    duration: document.getElementById("tourDuration")?.value.trim() || "",
    currency: document.getElementById("tourCurrency")?.value || "USD",
    basePrice: document.getElementById("tourBasePrice")?.value.trim() || "",
    childPrice: document.getElementById("tourChildPrice")?.value.trim() || "",
    shortDescription: document.getElementById("tourShortDescription")?.value.trim() || "",
    fullDescription: document.getElementById("tourFullDescription")?.value.trim() || "",
    itinerary: linesToArray(document.getElementById("tourItinerary")?.value || ""),
    inclusions: linesToArray(document.getElementById("tourInclusions")?.value || ""),
    exclusions: linesToArray(document.getElementById("tourExclusions")?.value || ""),
    mainImage: document.getElementById("tourMainImage")?.value.trim() || "",
    photos: linesToArray(document.getElementById("tourPhotos")?.value || ""),
    pickupAvailable: !!document.getElementById("tourPickupAvailable")?.checked,
    active: !!document.getElementById("tourActive")?.checked,
    featured: !!document.getElementById("tourFeatured")?.checked,
    sortOrder: Number(document.getElementById("tourSortOrder")?.value || 0)
  };

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    const result = await saveTourPackage(payload, id);
    alert(result.message || "Tour package saved");
    closeTourForm();
    await loadTourPackages();
  } catch (err) {
    console.error("Tour package save failed", err);
    alert(err.message || "Tour package save failed. Check Worker route /api/admin/tour-packages.");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Tour Package";
    }
  }
}

function wireToursModule() {
  document.querySelectorAll(".tours-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => setPane(btn.dataset.tourTab));
  });

  document.querySelectorAll(".tour-editor-tab").forEach(btn => {
    btn.addEventListener("click", () => setFormTab(btn.dataset.tourFormTab));
  });

  document.getElementById("tourFormPrevBtn")?.addEventListener("click", () => nextFormTab(-1));
  document.getElementById("tourFormNextBtn")?.addEventListener("click", () => nextFormTab(1));
  document.getElementById("addTourPackageBtn")?.addEventListener("click", () => openTourForm());
  document.getElementById("tourPackageCloseBtn")?.addEventListener("click", closeTourForm);
  document.getElementById("tourPackageClearBtn")?.addEventListener("click", resetTourForm);
  document.getElementById("tourPackageSaveBtn")?.addEventListener("click", () => {
    document.getElementById("tourPackageForm")?.requestSubmit();
  });

  document.getElementById("tourMainImageUploadBtn")?.addEventListener("click", () => {
    document.getElementById("tourMainImageFile")?.click();
  });
  document.getElementById("tourMainImageFile")?.addEventListener("change", uploadMainTourImage);
  document.getElementById("tourMainImageRemoveBtn")?.addEventListener("click", () => {
    const field = document.getElementById("tourMainImage");
    if (field) field.value = "";
    setUploadStatus("tourMainImageStatus", "Removed");
    renderTourImagePreviews();
  });
  document.getElementById("tourMainImage")?.addEventListener("input", renderTourImagePreviews);

  document.getElementById("tourGalleryUploadBtn")?.addEventListener("click", () => {
    document.getElementById("tourGalleryFiles")?.click();
  });
  document.getElementById("tourGalleryFiles")?.addEventListener("change", uploadTourGalleryImages);
  document.getElementById("tourGalleryClearBtn")?.addEventListener("click", () => {
    const field = document.getElementById("tourPhotos");
    if (field) field.value = "";
    setUploadStatus("tourGalleryStatus", "Gallery cleared");
    renderTourImagePreviews();
  });
  document.getElementById("tourPhotos")?.addEventListener("input", renderTourImagePreviews);
  document.getElementById("tourGalleryPreview")?.addEventListener("click", (e) => {
    const index = e.target.closest("[data-tour-photo-remove]")?.dataset.tourPhotoRemove;
    if (index === undefined) return;
    const photos = linesToArray(document.getElementById("tourPhotos")?.value || "");
    photos.splice(Number(index), 1);
    const field = document.getElementById("tourPhotos");
    if (field) field.value = arrayToLines(photos);
    renderTourImagePreviews();
  });

  document.getElementById("tourPackageForm")?.addEventListener("submit", handleTourSubmit);

  document.getElementById("tourPackageSearch")?.addEventListener("input", () => renderTourPackagesTable(allTourPackages));
  document.getElementById("tourPackageCategoryFilter")?.addEventListener("change", () => renderTourPackagesTable(allTourPackages));
  document.getElementById("tourPackageStatusFilter")?.addEventListener("change", () => renderTourPackagesTable(allTourPackages));

  document.getElementById("tourPackageFormBox")?.addEventListener("click", (e) => {
    if (e.target.id === "tourPackageFormBox") closeTourForm();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("tourPackageFormBox")?.classList.contains("hidden")) {
      closeTourForm();
    }
  });

  document.getElementById("tourPackagesTableBody")?.addEventListener("click", async (e) => {
    const editId = e.target.closest("[data-tour-edit]")?.dataset.tourEdit || e.target.closest("[data-tour-row]")?.dataset.tourRow;
    const deleteId = e.target.closest("[data-tour-delete]")?.dataset.tourDelete;

    if (deleteId) {
      if (!confirm("Delete this tour package?")) return;
      try {
        await deleteTourPackage(deleteId);
        alert("Tour package deleted");
        await loadTourPackages();
      } catch (err) {
        alert(err.message || "Delete failed");
      }
      return;
    }

    if (editId) {
      const tour = allTourPackages.find(t => String(t.id) === String(editId));
      if (tour) openTourForm(tour);
    }
  });
}

export async function initToursModule() {
  const container = document.getElementById("destinationsTab");
  if (!container) return;

  if (!toursModuleReady) {
    renderToursModuleShell(container);
    wireToursModule();
    setFormTab("basic");
    toursModuleReady = true;
  }
}

window.initToursModule = initToursModule;
window.openToursPackagesPane = async function () {
  await initToursModule();
  setPane("packages");
  await loadTourPackages();
};
window.openAddTourPackageForm = function () {
  initToursModule().then(() => {
    setPane("packages");
    openTourForm();
  });
};
