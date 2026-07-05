import { getDestinations, getTourPackages, saveTourPackage, deleteTourPackage } from "./api.js";
import { renderToursModuleShell, renderDestinationOptions, renderCategoryOptions, renderTourPackagesTable, linesToArray, arrayToLines } from "./render.js";

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

function setPane(name) {
  document.querySelectorAll(".tours-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tourTab === name);
  });
  document.getElementById("tourDestinationsPane")?.classList.toggle("active", name === "destinations");
  document.getElementById("tourPackagesPane")?.classList.toggle("active", name === "packages");
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
  allTourDestinations = await getDestinations().catch(() => []);
  allTourPackages = await getTourPackages().catch(() => []);
  renderDestinationOptions(allTourDestinations);
  renderCategoryOptions(allTourPackages);
  renderTourPackagesTable(allTourPackages);
}

function resetTourForm() {
  document.getElementById("tourPackageForm")?.reset();
  document.getElementById("tourEditId").value = "";
  document.getElementById("tourPickupAvailable").checked = true;
  document.getElementById("tourActive").checked = true;
  document.getElementById("tourFeatured").checked = false;
  document.getElementById("tourSortOrder").value = 0;
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
    document.getElementById("tourActive").checked = !!tour.active;
    document.getElementById("tourFeatured").checked = !!tour.featured;
    document.getElementById("tourSortOrder").value = tour.sortOrder || 0;
  }

  document.getElementById("tourPackageFormBox")?.classList.remove("hidden");
  document.body.classList.add("tour-modal-open");
  setFormTab("basic");
}

function closeTourForm() {
  document.getElementById("tourPackageFormBox")?.classList.add("hidden");
  document.body.classList.remove("tour-modal-open");
}

async function handleTourSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("tourEditId").value || "";
  const title = document.getElementById("tourTitle").value.trim();

  if (!title) {
    setFormTab("basic");
    return alert("Tour title is required");
  }

  const payload = {
    title,
    slug: document.getElementById("tourSlug").value.trim() || slugify(title),
    category: document.getElementById("tourCategory").value.trim(),
    location: document.getElementById("tourLocation").value.trim(),
    duration: document.getElementById("tourDuration").value.trim(),
    currency: document.getElementById("tourCurrency").value || "USD",
    basePrice: document.getElementById("tourBasePrice").value.trim(),
    childPrice: document.getElementById("tourChildPrice").value.trim(),
    shortDescription: document.getElementById("tourShortDescription").value.trim(),
    fullDescription: document.getElementById("tourFullDescription").value.trim(),
    itinerary: linesToArray(document.getElementById("tourItinerary").value),
    inclusions: linesToArray(document.getElementById("tourInclusions").value),
    exclusions: linesToArray(document.getElementById("tourExclusions").value),
    mainImage: document.getElementById("tourMainImage").value.trim(),
    photos: linesToArray(document.getElementById("tourPhotos").value),
    pickupAvailable: document.getElementById("tourPickupAvailable").checked,
    active: document.getElementById("tourActive").checked,
    featured: document.getElementById("tourFeatured").checked,
    sortOrder: Number(document.getElementById("tourSortOrder").value || 0)
  };

  const result = await saveTourPackage(payload, id);
  alert(result.message || "Tour package saved");
  closeTourForm();
  await loadTourPackages();
}

function wireToursModule() {
  document.querySelectorAll(".tours-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      setPane(btn.dataset.tourTab);
      if (btn.dataset.tourTab === "packages") loadTourPackages();
    });
  });

  document.querySelectorAll(".tour-editor-tab").forEach(btn => {
    btn.addEventListener("click", () => setFormTab(btn.dataset.tourFormTab));
  });

  document.getElementById("tourFormPrevBtn")?.addEventListener("click", () => nextFormTab(-1));
  document.getElementById("tourFormNextBtn")?.addEventListener("click", () => nextFormTab(1));

  document.getElementById("addTourPackageBtn")?.addEventListener("click", () => openTourForm());
  document.getElementById("tourPackageCloseBtn")?.addEventListener("click", closeTourForm);
  document.getElementById("tourPackageClearBtn")?.addEventListener("click", resetTourForm);
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
    const editId = e.target.closest("[data-tour-edit]")?.dataset.tourEdit;
    const deleteId = e.target.closest("[data-tour-delete]")?.dataset.tourDelete;

    if (deleteId) {
      if (!confirm("Delete this tour package?")) return;
      await deleteTourPackage(deleteId);
      alert("Tour package deleted");
      await loadTourPackages();
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
  if (!container || toursModuleReady) return;

  renderToursModuleShell(container);
  wireToursModule();
  setFormTab("basic");
  toursModuleReady = true;
}

window.initToursModule = initToursModule;
window.openToursPackagesPane = async function () {
  await initToursModule();
  setPane("packages");
  await loadTourPackages();
};
