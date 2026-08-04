function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(active) {
  return active === false || Number(active) === 0
    ? `<span class="status-badge status-cancelled">Hidden</span>`
    : `<span class="status-badge status-booked">Active</span>`;
}

function featuredBadge(featured) {
  return featured === true || Number(featured) === 1
    ? `<span class="status-badge status-quoted">Featured</span>`
    : `<span class="status-badge">No</span>`;
}

export function renderPropertiesTable(rows = []) {
  const tbody = document.getElementById("propertiesTableBody");
  if (!tbody) return;

  const search = String(document.getElementById("propertySearch")?.value || "").toLowerCase();
  const type = document.getElementById("propertyTypeFilter")?.value || "all";
  const status = document.getElementById("propertyStatusFilter")?.value || "all";

  let data = rows.filter((item) => {
    const hay = `${item.name || ""} ${item.type || ""} ${item.location || ""} ${item.price || ""} ${item.slug || ""}`.toLowerCase();
    const typeOk = type === "all" || String(item.type || "") === type;
    const statusOk =
      status === "all" ||
      (status === "active" && !(item.active === false || Number(item.active) === 0)) ||
      (status === "hidden" && (item.active === false || Number(item.active) === 0)) ||
      (status === "featured" && (item.featured === true || Number(item.featured) === 1));
    return typeOk && statusOk && (!search || hay.includes(search));
  });

  data = data.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.name || "").localeCompare(String(b.name || "")));

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No properties found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((item) => `
    <tr class="clickable-row" onclick="window.editEnterpriseProperty('${escapeHtml(item.id)}')">
      <td><strong>${escapeHtml(item.name || "-")}</strong><br><small>${escapeHtml(item.slug || item.mapUrl || "")}</small></td>
      <td>${escapeHtml(item.type || "-")}</td>
      <td>${escapeHtml(item.location || "-")}</td>
      <td>${escapeHtml(item.basePrice || item.price || "-")}<br><small>Weekend: ${escapeHtml(item.weekendPrice || "-")}</small></td>
      <td>${escapeHtml(item.maxGuests || item.guests || "-")}</td>
      <td>${escapeHtml(item.bedrooms || "-")} / ${escapeHtml(item.bathrooms || "-")}<br><small>Beds: ${escapeHtml(item.beds || "-")}</small></td>
      <td>${statusBadge(item.active)}</td>
      <td>${featuredBadge(item.featured)}</td>
      <td onclick="event.stopPropagation();">
        <button class="mini-btn" onclick="window.editEnterpriseProperty('${escapeHtml(item.id)}')">Edit</button>
        <button class="delete-btn mini-btn" onclick="window.deleteEnterpriseProperty('${escapeHtml(item.id)}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

export function extendPropertyForm() {
  const form = document.getElementById("propertyForm");
  if (!form || form.dataset.enterpriseExtended === "1") return;

  const enterpriseBox = document.createElement("div");
  enterpriseBox.className = "property-enterprise-box";
  enterpriseBox.innerHTML = `
    <h3>Enterprise Property Details</h3>

    <label>Slug</label>
    <input id="propSlug" placeholder="hilltop-villa-hikkaduwa" />

    <label>Beds</label>
    <input id="propBeds" placeholder="Beds" />

    <label>Max Guests</label>
    <input id="propMaxGuests" placeholder="Max Guests" />

    <label>Check-in Time</label>
    <input id="propCheckInTime" placeholder="14:00" />

    <label>Check-out Time</label>
    <input id="propCheckOutTime" placeholder="11:00" />

    <h3>Pricing</h3>

    <label>Base Price</label>
    <input id="propBasePrice" placeholder="Base price" />

    <label>Weekend Price</label>
    <input id="propWeekendPrice" placeholder="Weekend price" />

    <label>Seasonal Price</label>
    <input id="propSeasonalPrice" placeholder="Seasonal price" />

    <label>Cleaning Fee</label>
    <input id="propCleaningFee" placeholder="Cleaning fee" />

    <label>Extra Guest Fee</label>
    <input id="propExtraGuestFee" placeholder="Extra guest fee" />

    <label>Child Price</label>
    <input id="propChildPrice" placeholder="Child price" />

    <label>Security Deposit</label>
    <input id="propSecurityDeposit" placeholder="Security deposit" />

    <h3>SEO</h3>

    <label>SEO Title</label>
    <input id="propSeoTitle" placeholder="SEO title" />

    <label>SEO Description</label>
    <textarea id="propSeoDescription" placeholder="SEO description"></textarea>

    <label>Sort Order</label>
    <input id="propSortOrder" type="number" step="1" placeholder="0" />
  `;

  const statusLabel = document.getElementById("propActive")?.closest("label");
  if (statusLabel) form.insertBefore(enterpriseBox, statusLabel);
  else form.appendChild(enterpriseBox);

  form.dataset.enterpriseExtended = "1";
}

export function fillPropertyForm(item = {}) {
  extendPropertyForm();
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };

  set("propEditId", item.id);
  set("propType", item.type || "villa");
  set("propName", item.name);
  set("propLocation", item.location);
  set("propLat", item.lat);
  set("propLng", item.lng);
  set("propMapUrl", item.mapUrl);
  set("propMainImage", item.mainImage);
  set("propLogo", item.logoImage);
  set("propPrice", item.price);
  set("propGuests", item.guests);
  set("propBedrooms", item.bedrooms);
  set("propBathrooms", item.bathrooms);
  set("propDescription", item.description);
  set("propPhotos", Array.isArray(item.photos) ? item.photos.join("\n") : item.photos);

  set("propSlug", item.slug);
  set("propBeds", item.beds);
  set("propMaxGuests", item.maxGuests);
  set("propCheckInTime", item.checkInTime);
  set("propCheckOutTime", item.checkOutTime);
  set("propBasePrice", item.basePrice);
  set("propWeekendPrice", item.weekendPrice);
  set("propSeasonalPrice", item.seasonalPrice);
  set("propCleaningFee", item.cleaningFee);
  set("propExtraGuestFee", item.extraGuestFee);
  set("propChildPrice", item.childPrice);
  set("propSecurityDeposit", item.securityDeposit);
  set("propSeoTitle", item.seoTitle);
  set("propSeoDescription", item.seoDescription);
  set("propSortOrder", item.sortOrder);

  const active = document.getElementById("propActive");
  if (active) active.checked = !(item.active === false || Number(item.active) === 0);
  const featured = document.getElementById("propFeatured");
  if (featured) featured.checked = item.featured === true || Number(item.featured) === 1;

  if (typeof window.renderPhotoPreview === "function") window.renderPhotoPreview("prop");
}

export function collectPropertyPayload() {
  const val = (id) => document.getElementById(id)?.value?.trim() || "";
  const checked = (id) => !!document.getElementById(id)?.checked;
  const lines = (id) => val(id).split("\n").map(x => x.trim()).filter(Boolean);
  const facilities = typeof window.getCheckedPropertyFacilities === "function"
    ? window.getCheckedPropertyFacilities()
    : lines("propFacilities");

  return {
    id: val("propEditId"),
    type: val("propType") || "villa",
    name: val("propName"),
    location: val("propLocation"),
    lat: val("propLat"),
    lng: val("propLng"),
    mapUrl: val("propMapUrl"),
    mainImage: val("propMainImage"),
    logoImage: val("propLogo"),
    price: val("propPrice"),
    guests: val("propGuests"),
    bedrooms: val("propBedrooms"),
    bathrooms: val("propBathrooms"),
    facilities,
    description: val("propDescription"),
    photos: lines("propPhotos"),
    active: checked("propActive"),
    featured: checked("propFeatured"),
    slug: val("propSlug"),
    beds: val("propBeds"),
    maxGuests: val("propMaxGuests"),
    checkInTime: val("propCheckInTime"),
    checkOutTime: val("propCheckOutTime"),
    basePrice: val("propBasePrice"),
    weekendPrice: val("propWeekendPrice"),
    seasonalPrice: val("propSeasonalPrice"),
    cleaningFee: val("propCleaningFee"),
    extraGuestFee: val("propExtraGuestFee"),
    childPrice: val("propChildPrice"),
    securityDeposit: val("propSecurityDeposit"),
    seoTitle: val("propSeoTitle"),
    seoDescription: val("propSeoDescription"),
    sortOrder: val("propSortOrder") || "0"
  };
}
