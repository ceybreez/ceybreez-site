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
});

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ADMIN_TOKEN}`
  };
}

function loginAdmin() {
  ADMIN_TOKEN = document.getElementById("adminToken").value.trim();

  if (!ADMIN_TOKEN) {
    alert("Enter admin token");
    return;
  }

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
}

function linesToArray(value) {
  return value.split("\n").map(x => x.trim()).filter(Boolean);
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

async function loadAll() {
  await loadDestinations();
  await loadProperties();
}

async function loadDestinations() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/destinations`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load destinations");

    const box = document.getElementById("destinationsList");
    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
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

  const url = editId
    ? `${API_BASE}/api/admin/destinations/${editId}`
    : `${API_BASE}/api/admin/destinations`;

  const method = editId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Save failed");
    return;
  }

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

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetDestinationForm() {
  document.getElementById("destinationForm").reset();
  document.getElementById("destEditId").value = "";
  document.getElementById("destActive").checked = true;
}

async function deleteDestination(id) {
  if (!confirm("Delete this destination?")) return;

  const res = await fetch(`${API_BASE}/api/admin/destinations/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Deleted");
  loadDestinations();
}

async function loadProperties() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/properties`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load properties");

    const box = document.getElementById("propertiesList");
    box.innerHTML = "";

    data.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
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

  const url = editId
    ? `${API_BASE}/api/admin/properties/${editId}`
    : `${API_BASE}/api/admin/properties`;

  const method = editId ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Save failed");
    return;
  }

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

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetPropertyForm() {
  document.getElementById("propertyForm").reset();
  document.getElementById("propEditId").value = "";
  document.getElementById("propActive").checked = true;
}

async function deleteProperty(id) {
  if (!confirm("Delete this property?")) return;

  const res = await fetch(`${API_BASE}/api/admin/properties/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Deleted");
  loadProperties();
}
