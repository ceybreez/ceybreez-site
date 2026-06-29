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

