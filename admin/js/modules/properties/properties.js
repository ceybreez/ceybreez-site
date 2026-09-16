import { loadProperties, saveProperty, deleteProperty } from "./api.js";
import { renderPropertiesTable, extendPropertyForm, fillPropertyForm, collectPropertyPayload } from "./render.js";

let propertyState = [];

function byId(id) {
  return document.getElementById(id);
}

function showForm() {
  if (typeof window.showCmsForm === "function") window.showCmsForm("propertyFormBox");
  else byId("propertyFormBox")?.classList.remove("hidden");
}

function resetForm() {
  byId("propertyForm")?.reset();
  byId("propEditId") && (byId("propEditId").value = "");
  byId("propActive") && (byId("propActive").checked = true);
  byId("propFeatured") && (byId("propFeatured").checked = false);
  if (typeof window.setCheckedPropertyFacilities === "function") window.setCheckedPropertyFacilities([]);
  if (typeof window.renderPhotoPreview === "function") window.renderPhotoPreview("prop");
}

async function refreshProperties() {
  propertyState = await loadProperties();
  window.allProperties = propertyState;
  renderPropertiesTable(propertyState);
  if (typeof window.renderManualPropertyDropdown === "function") window.renderManualPropertyDropdown(propertyState);
  if (typeof window.filterManualProperties === "function") window.filterManualProperties();
  if (typeof window.renderAvailabilityMatrix === "function") window.renderAvailabilityMatrix();
}

function bindEvents() {
  byId("propertySearch")?.addEventListener("input", () => renderPropertiesTable(propertyState));
  byId("propertyTypeFilter")?.addEventListener("change", () => renderPropertiesTable(propertyState));
  byId("propertyStatusFilter")?.addEventListener("change", () => renderPropertiesTable(propertyState));

  const form = byId("propertyForm");
  if (form && form.dataset.enterpriseBound !== "1") {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = collectPropertyPayload();
      if (!payload.name) return alert("Property name is required.");
      try {
        await saveProperty(payload);
        alert("Property saved");
        resetForm();
        await refreshProperties();
      } catch (error) {
        alert(error.message || "Property save failed");
      }
    });
    form.dataset.enterpriseBound = "1";
  }
}

export function initPropertiesModule() {
  extendPropertyForm();
  bindEvents();

  window.loadEnterpriseProperties = refreshProperties;

  window.openAddEnterprisePropertyForm = function openAddEnterprisePropertyForm(type = "villa") {
    extendPropertyForm();
    resetForm();
    byId("propType") && (byId("propType").value = type);
    byId("propertyFormBoxTitle") && (byId("propertyFormBoxTitle").textContent = `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    showForm();
  };

  window.editEnterpriseProperty = function editEnterpriseProperty(id) {
    const item = propertyState.find((x) => String(x.id) === String(id)) || (window.allProperties || []).find((x) => String(x.id) === String(id));
    if (!item) return alert("Property not found.");
    byId("propertyFormBoxTitle") && (byId("propertyFormBoxTitle").textContent = "Edit Property");
    fillPropertyForm(item);
    showForm();
  };

  window.deleteEnterpriseProperty = async function deleteEnterpriseProperty(id) {
    if (!confirm("Delete this property?")) return;
    try {
      await deleteProperty(id);
      alert("Property deleted");
      await refreshProperties();
    } catch (error) {
      alert(error.message || "Property delete failed");
    }
  };

  const originalOpenAdd = window.openAddPropertyForm;
  window.openAddPropertyForm = function openAddPropertyForm(type = "villa") {
    window.openAddEnterprisePropertyForm(type);
  };

  window.editPropertyById = function editPropertyById(id) {
    window.editEnterpriseProperty(id);
  };

  window.deleteProperty = function deletePropertyCompat(id) {
    window.deleteEnterpriseProperty(id);
  };

  const active = document.querySelector(".v14-nav button.active")?.dataset?.v14Tab;
  if (active === "properties") refreshProperties().catch(console.error);
}
