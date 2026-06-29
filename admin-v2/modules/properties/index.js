/* PROPERTIES */

async function loadProperties() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/properties`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load properties");
    window.allProperties = data || [];
    renderManualPropertyDropdown(window.allProperties); filterManualProperties(); renderPropertiesTable(); renderAvailabilityMatrix();
    const box = document.getElementById("propertiesList"); if (box) box.innerHTML = "";
  } catch (err) { alert(err.message); }
}
function renderPropertiesTable(){
  const tbody=document.getElementById("propertiesTableBody"); if(!tbody) return;
  const search=(document.getElementById("propertySearch")?.value||"").toLowerCase();
  const type=document.getElementById("propertyTypeFilter")?.value||"all";
  const status=document.getElementById("propertyStatusFilter")?.value||"all";
  let data=(window.allProperties||[]).filter(item=>{ const text=`${item.name||""} ${item.type||""} ${item.location||""} ${item.price||""}`.toLowerCase(); return (!search||text.includes(search)) && (type==="all"||String(item.type||"")===type) && statusFilterMatch(item,status); });
  data=sortByCms("properties",data);
  if(!data.length){ tbody.innerHTML=`<tr><td colspan="9" class="empty-row">No properties found</td></tr>`; return; }
  tbody.innerHTML=data.map(item=>`<tr class="clickable-row" onclick="editPropertyById('${escapeJs(item.id)}')"><td><strong>${escapeHtml(item.name||"-")}</strong><br><small>${escapeHtml(item.mapUrl||"")}</small></td><td>${escapeHtml(item.type||"-")}</td><td>${escapeHtml(item.location||"-")}</td><td>${escapeHtml(item.price||"-")}</td><td>${escapeHtml(item.guests||"-")}</td><td>${escapeHtml(item.bedrooms||"-")} / ${escapeHtml(item.bathrooms||"-")}</td><td>${cmsStatusBadge(item.active)}</td><td>${cmsFeaturedBadge(item.featured)}</td><td onclick="event.stopPropagation();"><button class="mini-btn" onclick="editPropertyById('${escapeJs(item.id)}')">Edit</button><button class="delete-btn mini-btn" onclick="deleteProperty('${escapeJs(item.id)}')">Delete</button></td></tr>`).join("");
}
function openAddPropertyForm(type="villa"){ resetPropertyForm(); document.getElementById("propType").value=type; const t=document.getElementById("propertyFormBoxTitle"); if(t)t.textContent=`Add New ${type.charAt(0).toUpperCase()+type.slice(1)}`; showCmsForm("propertyFormBox"); }
function editPropertyById(id){ const item=(window.allProperties||[]).find(x=>String(x.id)===String(id)); if(item) editProperty(item); }

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
    mainImage: document.getElementById("propMainImage")?.value.trim() || "",
    logoImage: document.getElementById("propLogo")?.value.trim() || "",
    price: document.getElementById("propPrice").value.trim(),
    guests: document.getElementById("propGuests").value.trim(),
    bedrooms: document.getElementById("propBedrooms").value.trim(),
    bathrooms: document.getElementById("propBathrooms").value.trim(),
    facilities: getCheckedPropertyFacilities().length ? getCheckedPropertyFacilities() : linesToArray(document.getElementById("propFacilities").value),
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
  const t=document.getElementById("propertyFormBoxTitle"); if(t)t.textContent="Edit Property";
  document.getElementById("propEditId").value = item.id;
  document.getElementById("propType").value = item.type || "villa";
  document.getElementById("propName").value = item.name || "";
  document.getElementById("propLocation").value = item.location || "";
  document.getElementById("propLat").value = item.lat || "";
  document.getElementById("propLng").value = item.lng || "";
  document.getElementById("propMapUrl").value = item.mapUrl || "";
  if (document.getElementById("propMainImage")) document.getElementById("propMainImage").value = item.mainImage || "";
  if (document.getElementById("propLogo")) document.getElementById("propLogo").value = item.logoImage || "";
  document.getElementById("propPrice").value = item.price || "";
  document.getElementById("propGuests").value = item.guests || "";
  document.getElementById("propBedrooms").value = item.bedrooms || "";
  document.getElementById("propBathrooms").value = item.bathrooms || "";
  document.getElementById("propFacilities").value = arrayToLines(item.facilities);
  setCheckedPropertyFacilities(item.facilities || []);
  document.getElementById("propDescription").value = item.description || "";
  document.getElementById("propPhotos").value = arrayToLines(item.photos);
  document.getElementById("propActive").checked = !!item.active;
  document.getElementById("propFeatured").checked = item.featured || false;
  renderPhotoPreview("prop");
  showCmsForm("propertyFormBox");
}

function resetPropertyForm() {
  document.getElementById("propertyForm").reset();
  document.getElementById("propEditId").value = "";
  document.getElementById("propActive").checked = true;
  document.getElementById("propUploadStatus").textContent = "";
  document.getElementById("propPhotoPreview").innerHTML = "";
  document.getElementById("propFeatured").checked = false;
  document.getElementById("propMapUrl").value = "";
  if (document.getElementById("propMainImage")) document.getElementById("propMainImage").value = "";
  if (document.getElementById("propLogo")) document.getElementById("propLogo").value = "";
  setCheckedPropertyFacilities([]);
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

