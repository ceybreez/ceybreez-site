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
    ? `<span class="property-status-badge hidden-state">Hidden</span>`
    : `<span class="property-status-badge active-state">Active</span>`;
}

function featuredBadge(featured) {
  return featured === true || Number(featured) === 1
    ? `<span class="property-status-badge featured-state">Featured</span>`
    : `<span class="property-status-badge neutral-state">Standard</span>`;
}

function propertyImage(item = {}) {
  const photos = Array.isArray(item.photos) ? item.photos : [];
  return item.mainImage || photos[0] || "";
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

  tbody.innerHTML = data.map((item) => {
    const image = propertyImage(item);
    return `
      <tr class="clickable-row property-table-row" onclick="window.editEnterpriseProperty('${escapeHtml(item.id)}')">
        <td>
          <div class="property-table-name">
            <div class="property-table-thumb">${image ? `<img src="${escapeHtml(image)}" alt="">` : `<span>🏡</span>`}</div>
            <div><strong>${escapeHtml(item.name || "-")}</strong><small>${escapeHtml(item.slug || "No slug")}</small></div>
          </div>
        </td>
        <td><span class="property-type-pill">${escapeHtml(item.type || "-")}</span></td>
        <td>${escapeHtml(item.location || "-")}</td>
        <td><strong>${escapeHtml(item.price || item.basePrice || "Price on request")}</strong><small class="property-table-sub">Base: ${escapeHtml(item.basePrice || "-")}</small></td>
        <td>${escapeHtml(item.maxGuests || item.guests || "-")}</td>
        <td>${escapeHtml(item.bedrooms || "-")} / ${escapeHtml(item.bathrooms || "-")}<small class="property-table-sub">Beds: ${escapeHtml(item.beds || "-")}</small></td>
        <td>${statusBadge(item.active)}</td>
        <td>${featuredBadge(item.featured)}</td>
        <td onclick="event.stopPropagation();"><div class="property-row-actions"><button class="mini-btn" onclick="window.editEnterpriseProperty('${escapeHtml(item.id)}')">Edit</button><button class="delete-btn mini-btn" onclick="window.deleteEnterpriseProperty('${escapeHtml(item.id)}')">Delete</button></div></td>
      </tr>`;
  }).join("");
}

export function renderPropertyEditorForm() {
  const form = document.getElementById("propertyForm");
  if (!form || form.dataset.enterpriseExtended === "1") return;

  form.className = "property-editor-form";
  form.innerHTML = `
    <input type="hidden" id="propEditId">
    <input type="hidden" id="propGuests">
    <textarea id="propFacilities" class="hidden" aria-hidden="true"></textarea>
    <div id="propPhotoPreview" class="hidden" aria-hidden="true"></div>

    <div class="property-editor-tabs" role="tablist" aria-label="Property editor sections">
      <button type="button" class="property-editor-tab active" data-property-form-tab="basic">1. Basics</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="stay">2. Stay Setup</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="pricing">3. Pricing</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="facilities">4. Facilities</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="gallery">5. Gallery</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="settings">6. Publish</button>
      <button type="button" class="property-editor-tab" data-property-form-tab="seo">7. SEO</button>
    </div>

    <div class="property-editor-layout">
      <div class="property-editor-main">
        <section class="property-form-pane active" data-property-form-pane="basic">
          <div class="property-pane-title"><div><span>Property identity</span><h4>Basics</h4><p>Core information shown across the public stay cards.</p></div><span class="property-section-chip">Required first</span></div>
          <div class="property-form-grid two-col">
            <label class="property-field"><span>Property Type *</span><select id="propType"><option value="villa">Villa</option><option value="homestay">Homestay</option><option value="apartment">Apartment</option></select></label>
            <label class="property-field"><span>Property Name *</span><input id="propName" placeholder="Palm Grove Villa" required></label>
            <label class="property-field"><span>Slug</span><input id="propSlug" placeholder="palm-grove-villa"><small>Used as the clean property identifier and future detail-page URL.</small></label>
            <label class="property-field"><span>Location</span><input id="propLocation" placeholder="Hikkaduwa, Sri Lanka"></label>
            <label class="property-field full"><span>Website Price Label</span><input id="propPrice" placeholder="From USD 120 / night"><small>This exact text is currently shown on Villas / Apartments / Homestays public cards.</small></label>
            <label class="property-field full"><span>Description</span><textarea id="propDescription" rows="7" maxlength="1800" placeholder="Describe the stay, setting and guest experience..."></textarea><small><b id="propDescriptionCount">0</b> / 1800 characters</small></label>
          </div>
          <div class="property-map-card">
            <div class="property-map-head"><div><strong>Map & directions</strong><span>Optional, but useful for guest directions and admin reference.</span></div><span id="propMapStatus" class="property-mini-status">Not set</span></div>
            <div class="property-form-grid three-col">
              <label class="property-field"><span>Latitude</span><input id="propLat" inputmode="decimal" placeholder="6.1390"></label>
              <label class="property-field"><span>Longitude</span><input id="propLng" inputmode="decimal" placeholder="80.1063"></label>
              <label class="property-field"><span>Official Map Link</span><input id="propMapUrl" placeholder="https://maps.google.com/..."></label>
            </div>
          </div>
        </section>

        <section class="property-form-pane" data-property-form-pane="stay">
          <div class="property-pane-title"><div><span>Guest capacity</span><h4>Stay Setup</h4><p>Room counts, capacity and operational check-in details.</p></div></div>
          <div class="property-form-grid three-col">
            <label class="property-field"><span>Max Guests</span><input id="propMaxGuests" type="number" min="0" step="1" placeholder="6"></label>
            <label class="property-field"><span>Bedrooms</span><input id="propBedrooms" type="number" min="0" step="1" placeholder="3"></label>
            <label class="property-field"><span>Bathrooms</span><input id="propBathrooms" type="number" min="0" step="1" placeholder="2"></label>
            <label class="property-field"><span>Beds</span><input id="propBeds" type="number" min="0" step="1" placeholder="4"></label>
            <label class="property-field"><span>Check-in Time</span><input id="propCheckInTime" type="time" value="14:00"></label>
            <label class="property-field"><span>Check-out Time</span><input id="propCheckOutTime" type="time" value="11:00"></label>
          </div>
          <div class="property-setup-summary" id="propertySetupSummary">Add capacity details to preview the stay setup.</div>
        </section>

        <section class="property-form-pane" data-property-form-pane="pricing">
          <div class="property-pane-title"><div><span>Rate structure</span><h4>Pricing</h4><p>Store operational rates separately from the public-facing price label.</p></div><span class="property-section-chip">No currency conversion</span></div>
          <div class="property-pricing-note">The current property database stores these amounts as values without a separate currency field. Keep all property rates in the same currency convention you already use.</div>
          <div class="property-form-grid two-col property-pricing-grid">
            <label class="property-field"><span>Base Price</span><input id="propBasePrice" type="number" min="0" step="0.01" placeholder="120"></label>
            <label class="property-field"><span>Weekend Price</span><input id="propWeekendPrice" type="number" min="0" step="0.01" placeholder="145"></label>
            <label class="property-field"><span>Seasonal Price</span><input id="propSeasonalPrice" type="number" min="0" step="0.01" placeholder="160"></label>
            <label class="property-field"><span>Cleaning Fee</span><input id="propCleaningFee" type="number" min="0" step="0.01" placeholder="20"></label>
            <label class="property-field"><span>Extra Guest Fee</span><input id="propExtraGuestFee" type="number" min="0" step="0.01" placeholder="15"></label>
            <label class="property-field"><span>Child Price</span><input id="propChildPrice" type="number" min="0" step="0.01" placeholder="10"></label>
            <label class="property-field full"><span>Security Deposit</span><input id="propSecurityDeposit" type="number" min="0" step="0.01" placeholder="100"></label>
          </div>
          <div class="property-rate-preview" id="propertyRatePreview"><span>Base</span><strong>—</strong><span>Weekend</span><strong>—</strong><span>Seasonal</span><strong>—</strong></div>
        </section>

        <section class="property-form-pane" data-property-form-pane="facilities">
          <div class="property-pane-title"><div><span>Amenities</span><h4>Facilities</h4><p>Select guest-facing facilities using the existing CeyBreez checklist.</p></div><span class="property-section-chip"><b id="propertyFacilityCount">0</b> selected</span></div>
          <div class="facility-checklist-box property-facility-box"><div id="propertyFacilityChecklist" class="facility-checklist"></div></div>
        </section>

        <section class="property-form-pane" data-property-form-pane="gallery">
          <div class="property-pane-title"><div><span>Visual content</span><h4>Gallery</h4><p>Cover image, optional badge/logo and ordered property photos.</p></div><span class="property-section-chip"><b id="propertyGalleryCount">0</b> gallery</span></div>
          <div class="property-upload-grid">
            <div class="property-upload-card">
              <div class="property-upload-card-head"><div><h5>Main Cover Image</h5><p>Automatically kept as the first public gallery image when saved.</p></div><span id="propMainImageStatus" class="property-upload-status"></span></div>
              <div id="propMainImagePreview" class="property-main-image-preview"><div class="property-empty-media">🖼️<span>No cover image</span></div></div>
              <input id="propMainImage" placeholder="Image URL or uploaded image URL">
              <input id="propMainImageFile" type="file" accept="image/*" class="property-file-input">
              <div class="property-upload-actions"><button type="button" id="propMainImagePickBtn" class="property-upload-btn">Choose Image</button><button type="button" id="propMainImageRemoveBtn" class="property-remove-btn">Remove</button></div>
            </div>
            <div class="property-upload-card">
              <div class="property-upload-card-head"><div><h5>Property Logo / Badge</h5><p>Optional brand mark or approval badge for internal/future use.</p></div><span id="propLogoStatus" class="property-upload-status"></span></div>
              <div id="propLogoPreview" class="property-logo-preview"><div class="property-empty-media">🏷️<span>No badge image</span></div></div>
              <input id="propLogo" placeholder="Logo / badge URL">
              <input id="propLogoFile" type="file" accept="image/*" class="property-file-input">
              <div class="property-upload-actions"><button type="button" id="propLogoPickBtn" class="property-upload-btn">Choose Logo</button><button type="button" id="propLogoRemoveBtn" class="property-remove-btn">Remove</button></div>
            </div>
          </div>
          <div class="property-gallery-card">
            <div class="property-gallery-head"><div><h5>Property Gallery</h5><p>Drag images to reorder, or use arrow controls. First photo is the public card/modal cover.</p></div><span id="propGalleryStatus" class="property-upload-status"></span></div>
            <input id="propGalleryFiles" type="file" multiple accept="image/*" class="property-file-input">
            <div class="property-upload-actions"><button type="button" id="propGalleryPickBtn" class="property-upload-btn">Add Gallery Photos</button></div>
            <div id="propGalleryPreview" class="property-gallery-preview"><p>No gallery images selected</p></div>
            <details class="property-url-details"><summary>Advanced: edit image URLs directly</summary><textarea id="propPhotos" placeholder="One image URL per line"></textarea></details>
          </div>
        </section>

        <section class="property-form-pane" data-property-form-pane="settings">
          <div class="property-pane-title"><div><span>Visibility</span><h4>Publish</h4><p>Control website visibility, featured status and admin ordering.</p></div></div>
          <div class="property-switch-grid">
            <label class="property-switch-card"><input type="checkbox" id="propActive" checked><span class="property-switch-ui"></span><span><strong>Display on website</strong><small>OFF keeps the property hidden from public API listings.</small></span></label>
            <label class="property-switch-card"><input type="checkbox" id="propFeatured"><span class="property-switch-ui"></span><span><strong>Featured property</strong><small>Marks this stay for featured/home placement where supported.</small></span></label>
          </div>
          <div class="property-form-grid two-col property-settings-grid"><label class="property-field"><span>Sort Order</span><input id="propSortOrder" type="number" step="1" value="0"><small>Stored in CMS; current public property lists still use their existing page ordering.</small></label><div id="propertyPublishSummary" class="property-publish-summary">Property will be visible on the website.</div></div>
        </section>

        <section class="property-form-pane" data-property-form-pane="seo">
          <div class="property-pane-title"><div><span>Search metadata</span><h4>SEO</h4><p>These values are saved by the existing Properties API for future/detail-page metadata use.</p></div></div>
          <div class="property-form-grid one-col">
            <label class="property-field"><span>SEO Title</span><input id="propSeoTitle" maxlength="90" placeholder="Palm Grove Villa in Hikkaduwa | CeyBreez"><small><b id="propSeoTitleCount">0</b> characters · recommended about 50–60.</small></label>
            <label class="property-field"><span>SEO Description</span><textarea id="propSeoDescription" maxlength="220" rows="4" placeholder="Private villa in Hikkaduwa for up to 6 guests..."></textarea><small><b id="propSeoDescriptionCount">0</b> characters · recommended about 140–160.</small></label>
          </div>
          <div class="property-seo-card"><span id="propertySeoUrl" class="property-seo-url">https://ceybreez.com/</span><h5 id="propertySeoTitlePreview">Property | CeyBreez</h5><p id="propertySeoDescriptionPreview">Add a property description to preview search metadata.</p></div>
          <div id="propertySeoChecklist" class="property-seo-checklist"></div>
        </section>
      </div>

      <aside class="property-live-rail">
        <div class="property-live-rail-head"><div><span>LIVE CMS PREVIEW</span><strong>Public stay card</strong></div><span id="propertyDirtyBadge" class="property-dirty-badge">Saved</span></div>
        <div class="property-preview-card">
          <div id="propertyLivePreviewImage" class="property-preview-image"><div class="property-empty-media">🏡</div></div>
          <div class="property-preview-body">
            <div class="property-preview-badges"><span id="propertyLiveType">Villa</span><span id="propertyLiveFeatured" class="hidden">Featured</span></div>
            <h4 id="propertyLiveTitle">New Property</h4><p id="propertyLiveDescription">Add a description to preview the public stay card.</p>
            <div class="property-preview-meta"><span id="propertyLiveLocation">📍 Sri Lanka</span><span id="propertyLiveGuests">👥 Guests</span><span id="propertyLiveRooms">🛏 Rooms</span></div>
            <div class="property-preview-price"><span>Displayed price</span><strong id="propertyLivePrice">Price on request</strong></div>
          </div>
        </div>
        <div class="property-completeness"><div class="property-completeness-head"><span>Package completeness</span><strong id="propertyCompletenessPercent">0%</strong></div><div class="property-progress"><i id="propertyCompletenessBar"></i></div><div id="propertyCompletenessList" class="property-completeness-list"></div></div>
      </aside>
    </div>

    <div class="property-modal-footer">
      <div class="property-footer-left">Changes are saved only when you press <strong>Save Property</strong>.</div>
      <div class="property-footer-actions"><button type="button" id="propertyFormPrevBtn" class="property-secondary-btn">← Previous</button><button type="button" id="propertyFormNextBtn" class="property-secondary-btn">Next →</button><button type="submit" class="property-primary-btn">Save Property</button></div>
    </div>`;

  form.dataset.enterpriseExtended = "1";
}

export function extendPropertyForm() {
  renderPropertyEditorForm();
}

export function fillPropertyForm(item = {}) {
  renderPropertyEditorForm();
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value ?? ""; };

  set("propEditId", item.id);
  set("propType", item.type || "villa");
  set("propName", item.name);
  set("propLocation", item.location);
  set("propLat", item.lat);
  set("propLng", item.lng);
  set("propMapUrl", item.mapUrl);
  set("propMainImage", item.mainImage || (Array.isArray(item.photos) ? item.photos[0] : ""));
  set("propLogo", item.logoImage);
  set("propPrice", item.price);
  set("propGuests", item.guests || item.maxGuests);
  set("propBedrooms", item.bedrooms);
  set("propBathrooms", item.bathrooms);
  set("propDescription", item.description);
  set("propPhotos", Array.isArray(item.photos) ? item.photos.join("\n") : item.photos);
  set("propSlug", item.slug);
  set("propBeds", item.beds);
  set("propMaxGuests", item.maxGuests || item.guests);
  set("propCheckInTime", item.checkInTime || "14:00");
  set("propCheckOutTime", item.checkOutTime || "11:00");
  set("propBasePrice", item.basePrice);
  set("propWeekendPrice", item.weekendPrice);
  set("propSeasonalPrice", item.seasonalPrice);
  set("propCleaningFee", item.cleaningFee);
  set("propExtraGuestFee", item.extraGuestFee);
  set("propChildPrice", item.childPrice);
  set("propSecurityDeposit", item.securityDeposit);
  set("propSeoTitle", item.seoTitle);
  set("propSeoDescription", item.seoDescription);
  set("propSortOrder", item.sortOrder ?? 0);

  const active = document.getElementById("propActive");
  if (active) active.checked = !(item.active === false || Number(item.active) === 0);
  const featured = document.getElementById("propFeatured");
  if (featured) featured.checked = item.featured === true || Number(item.featured) === 1;
  if (typeof window.setCheckedPropertyFacilities === "function") window.setCheckedPropertyFacilities(item.facilities || []);
}

export function collectPropertyPayload() {
  const val = (id) => document.getElementById(id)?.value?.trim() || "";
  const checked = (id) => !!document.getElementById(id)?.checked;
  const lines = (id) => val(id).split("\n").map(x => x.trim()).filter(Boolean);
  const facilities = typeof window.getCheckedPropertyFacilities === "function" ? window.getCheckedPropertyFacilities() : lines("propFacilities");
  const mainImage = val("propMainImage");
  const photos = [...new Set([mainImage, ...lines("propPhotos")].filter(Boolean))];
  const maxGuests = val("propMaxGuests") || val("propGuests");

  return {
    id: val("propEditId"),
    type: val("propType") || "villa",
    name: val("propName"),
    location: val("propLocation"),
    lat: val("propLat"),
    lng: val("propLng"),
    mapUrl: val("propMapUrl"),
    mainImage,
    logoImage: val("propLogo"),
    price: val("propPrice"),
    guests: maxGuests,
    bedrooms: val("propBedrooms"),
    bathrooms: val("propBathrooms"),
    facilities,
    description: val("propDescription"),
    photos,
    active: checked("propActive"),
    featured: checked("propFeatured"),
    slug: val("propSlug"),
    beds: val("propBeds"),
    maxGuests,
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

export function linesToArray(value) {
  return String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
}

export function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}
