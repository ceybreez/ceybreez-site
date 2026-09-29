export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function linesToArray(value) {
  return String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
}

export function arrayToLines(value) {
  return Array.isArray(value) ? value.join("\n") : String(value || "");
}

function boolValue(value) {
  return value === true || Number(value) === 1;
}

export function renderToursModuleShell(container) {
  if (!container || container.dataset.toursModuleRendered === "1") return;

  const oldContent = container.innerHTML;
  container.dataset.toursModuleRendered = "1";

  container.innerHTML = `
    <div class="tours-module">
      <div class="tours-module-head">
        <div>
          <span class="tour-admin-kicker">CEYBREEZ ADMIN</span>
          <h2>Tours CMS</h2>
          <p>Manage destinations and sellable tour packages with a clean, guided editor.</p>
        </div>
        <div class="tour-head-summary" aria-label="Tour package summary">
          <div><strong id="tourStatTotal">0</strong><span>Packages</span></div>
          <div><strong id="tourStatActive">0</strong><span>Live</span></div>
          <div><strong id="tourStatFeatured">0</strong><span>Featured</span></div>
        </div>
      </div>

      <div class="tours-tabs">
        <button type="button" class="tours-tab-btn active" data-tour-tab="destinations">📍 Destinations</button>
        <button type="button" class="tours-tab-btn" data-tour-tab="packages">🧭 Tour Packages</button>
      </div>

      <div id="tourDestinationsPane" class="tours-pane active">${oldContent}</div>

      <div id="tourPackagesPane" class="tours-pane">
        <section class="tour-packages-box">
          <div class="tour-section-heading">
            <div><h3>Tour Packages</h3><p>Create, edit and publish the packages shown on the public tours pages.</p></div>
            <button type="button" id="addTourPackageBtn" class="tour-add-package-btn">＋ Add Tour Package</button>
          </div>

          <div class="cms-toolbar tours-toolbar">
            <label class="tour-toolbar-field tour-search-field"><span>Search</span><input id="tourPackageSearch" placeholder="Search title, category, destination..." /></label>
            <label class="tour-toolbar-field"><span>Category</span><select id="tourPackageCategoryFilter"><option value="all">All Categories</option></select></label>
            <label class="tour-toolbar-field"><span>Status</span><select id="tourPackageStatusFilter"><option value="all">All Status</option><option value="active">Active</option><option value="hidden">Hidden</option><option value="featured">Featured</option></select></label>
          </div>

          <div class="table-wrap cms-table-wrap tours-table-wrap">
            <table class="admin-table cms-table tours-table">
              <thead><tr><th>Tour</th><th>Category</th><th>Destination</th><th>Duration</th><th>Price</th><th>Status</th><th>Featured</th><th>Action</th></tr></thead>
              <tbody id="tourPackagesTableBody"><tr><td colspan="8" class="empty-row">No tour packages loaded</td></tr></tbody>
            </table>
          </div>

          <div id="tourPackageFormBox" class="tour-modal-overlay hidden" aria-hidden="true">
            <div class="tour-modal-card" role="dialog" aria-modal="true" aria-labelledby="tourPackageFormTitle">
              <div class="tour-modal-head">
                <div>
                  <span class="tour-modal-kicker" id="tourPackageModeLabel">NEW PACKAGE</span>
                  <h3 id="tourPackageFormTitle">Add Tour Package</h3>
                  <p id="tourPackageFormSubtitle">Build the package step by step. Required and recommended fields are highlighted.</p>
                </div>
                <div class="tour-modal-head-actions">
                  <button type="button" id="tourPublicPreviewBtn" class="tour-preview-link" disabled>↗ Public Page</button>
                  <button type="button" id="tourPackageCloseBtn" class="tour-modal-close" aria-label="Close tour editor">×</button>
                </div>
              </div>

              <form id="tourPackageForm" class="tour-package-form" novalidate>
                <input type="hidden" id="tourEditId" />

                <div class="tour-editor-tabs" aria-label="Tour editor sections">
                  <button type="button" class="tour-editor-tab active" data-tour-form-tab="basic"><span>1</span> Basics <em id="tourTabStateBasic"></em></button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="pricing"><span>2</span> Pricing <em id="tourTabStatePricing"></em></button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="content"><span>3</span> Content <em id="tourTabStateContent"></em></button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="gallery"><span>4</span> Gallery <em id="tourTabStateGallery"></em></button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="settings"><span>5</span> Publish <em id="tourTabStateSettings"></em></button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="seo"><span>6</span> SEO <em id="tourTabStateSeo"></em></button>
                </div>

                <div class="tour-modal-body">
                  <div class="tour-editor-layout">
                    <div class="tour-editor-main">
                      <div class="tour-form-pane active" data-tour-form-pane="basic">
                        <div class="tour-pane-title"><div><span>STEP 1</span><h4>Basic Information</h4><p>Tour identity, category, destination and duration.</p></div><div class="tour-pane-status" id="tourBasicStatus">Start here</div></div>
                        <div class="tour-form-grid two-col">
                          <label class="tour-field required">Tour Title <span class="field-help">Public package name</span><input id="tourTitle" required maxlength="100" placeholder="Sigiriya & Dambulla Day Tour" /><small class="field-error" id="tourTitleError"></small></label>
                          <label class="tour-field">Slug <span class="field-help">Auto-created from title</span><div class="tour-input-with-action"><input id="tourSlug" maxlength="120" placeholder="sigiriya-dambulla-day-tour" /><button type="button" id="tourRegenerateSlugBtn">Auto</button></div><small class="field-error" id="tourSlugError"></small></label>
                          <label class="tour-field">Category <span class="field-help">Used for filters</span><input id="tourCategory" list="tourCategorySuggestions" placeholder="Day Tour" /><datalist id="tourCategorySuggestions"><option value="Day Tour"><option value="Round Tour"><option value="Safari"><option value="Adventure"><option value="Cultural"><option value="Beach"><option value="Transfer"><option value="Custom Tour"></datalist></label>
                          <label class="tour-field">Destination <span class="field-help">Main area</span><select id="tourLocation"><option value="">Select destination</option></select></label>
                          <label class="tour-field">Duration <span class="field-help">e.g. Full Day / 3 Days</span><input id="tourDuration" maxlength="80" placeholder="Full Day" /></label>
                          <label class="tour-field">Sort Order <span class="field-help">Lower appears first</span><input id="tourSortOrder" type="number" value="0" step="1" /></label>
                        </div>
                        <label class="full-row tour-field">Short Description <span class="field-help">Card text + current SEO description source</span><textarea id="tourShortDescription" maxlength="220" placeholder="A concise overview of the tour experience..."></textarea><span class="tour-char-count"><b id="tourShortCount">0</b>/220</span></label>
                      </div>

                      <div class="tour-form-pane" data-tour-form-pane="pricing">
                        <div class="tour-pane-title"><div><span>STEP 2</span><h4>Pricing</h4><p>Set the selling currency and starting prices.</p></div><div class="tour-pane-status" id="tourPricingStatus">Optional</div></div>
                        <div class="tour-price-panel">
                          <div class="tour-form-grid three-col">
                            <label class="tour-field">Currency<select id="tourCurrency"><option>USD</option><option>LKR</option><option>OMR</option><option>EUR</option><option>GBP</option><option>AED</option></select></label>
                            <label class="tour-field">Adult / Base Price<input id="tourBasePrice" inputmode="decimal" placeholder="120" /><small class="field-error" id="tourBasePriceError"></small></label>
                            <label class="tour-field">Child Price<input id="tourChildPrice" inputmode="decimal" placeholder="60" /><small class="field-error" id="tourChildPriceError"></small></label>
                          </div>
                          <div class="tour-price-note"><strong>Tip:</strong> Leave the base price empty if the package should display “Price on request”.</div>
                        </div>
                      </div>

                      <div class="tour-form-pane" data-tour-form-pane="content">
                        <div class="tour-pane-title"><div><span>STEP 3</span><h4>Tour Content</h4><p>Detailed description, itinerary and what is included.</p></div><div class="tour-pane-status"><b id="tourContentItemCount">0</b> list items</div></div>
                        <label class="full-row tour-field">Full Description <span class="field-help">Shown on the package details page</span><textarea id="tourFullDescription" class="tour-long-text" placeholder="Describe the route, experience, highlights and what guests should expect..."></textarea><span class="tour-char-count"><b id="tourFullCount">0</b> characters</span></label>
                        <div class="tour-content-grid">
                          <label class="tour-field tour-list-field">Itinerary <span class="field-help">One step per line</span><textarea id="tourItinerary" placeholder="08:00 — Hotel pickup&#10;10:00 — Sigiriya Rock Fortress&#10;13:00 — Lunch&#10;15:00 — Dambulla Cave Temple"></textarea><span class="tour-list-count"><b id="tourItineraryCount">0</b> stops</span></label>
                          <div class="tour-stack-fields">
                            <label class="tour-field tour-list-field positive">Inclusions <span class="field-help">One item per line</span><textarea id="tourInclusions" placeholder="Private transport&#10;English-speaking driver&#10;Bottled water"></textarea><span class="tour-list-count"><b id="tourInclusionsCount">0</b> items</span></label>
                            <label class="tour-field tour-list-field negative">Exclusions <span class="field-help">One item per line</span><textarea id="tourExclusions" placeholder="Entrance tickets&#10;Meals&#10;Personal expenses"></textarea><span class="tour-list-count"><b id="tourExclusionsCount">0</b> items</span></label>
                          </div>
                        </div>
                      </div>

                      <div class="tour-form-pane" data-tour-form-pane="gallery">
                        <div class="tour-pane-title"><div><span>STEP 4</span><h4>Images & Gallery</h4><p>Upload the cover and arrange gallery images in display order.</p></div><div class="tour-pane-status"><b id="tourGalleryCount">0</b> gallery photos</div></div>
                        <div class="tour-upload-grid">
                          <section class="tour-upload-card">
                            <div class="tour-upload-card-head"><div><h5>Main Image</h5><p>Card image and tour page cover.</p></div><span id="tourMainImageStatus" class="tour-upload-status"></span></div>
                            <div id="tourMainImagePreview" class="tour-main-image-preview"><div class="tour-empty-media">🖼️<span>No main image selected</span></div></div>
                            <div class="tour-upload-actions"><input id="tourMainImageFile" type="file" accept="image/*" hidden /><button type="button" id="tourMainImageUploadBtn" class="tour-upload-btn">Upload Main Image</button><button type="button" id="tourMainImageRemoveBtn" class="tour-remove-btn">Remove</button></div>
                            <label class="tour-field">Main Image URL<input id="tourMainImage" placeholder="https://... or images/..." /><small class="field-error" id="tourMainImageError"></small></label>
                          </section>

                          <section class="tour-upload-card">
                            <div class="tour-upload-card-head"><div><h5>Gallery Images</h5><p>Drag thumbnails or use arrows to reorder.</p></div><span id="tourGalleryStatus" class="tour-upload-status"></span></div>
                            <div class="tour-upload-actions"><input id="tourGalleryFiles" type="file" accept="image/*" multiple hidden /><button type="button" id="tourGalleryUploadBtn" class="tour-upload-btn">Upload Gallery Photos</button><button type="button" id="tourGalleryClearBtn" class="tour-remove-btn">Clear Gallery</button></div>
                            <div id="tourGalleryPreview" class="tour-gallery-preview"><p>No gallery images selected</p></div>
                            <details class="tour-url-details"><summary>Advanced: edit gallery URLs</summary><label class="tour-field">Gallery Photo URLs <span class="field-help">One per line</span><textarea id="tourPhotos" placeholder="https://...&#10;https://..."></textarea></label></details>
                          </section>
                        </div>
                      </div>

                      <div class="tour-form-pane" data-tour-form-pane="settings">
                        <div class="tour-pane-title"><div><span>STEP 5</span><h4>Booking & Publishing</h4><p>Control pickup, visibility and homepage highlighting.</p></div><div class="tour-pane-status" id="tourPublishStatus">Draft ready</div></div>
                        <div class="tour-switch-grid">
                          <label class="tour-switch-card"><input type="checkbox" id="tourPickupAvailable" checked /><span class="tour-switch-ui"></span><span><strong>Pickup Available</strong><small>Show that transport pickup can be arranged.</small></span></label>
                          <label class="tour-switch-card"><input type="checkbox" id="tourActive" checked /><span class="tour-switch-ui"></span><span><strong>Active / Show on Website</strong><small>Turn off to hide this package from public pages.</small></span></label>
                          <label class="tour-switch-card"><input type="checkbox" id="tourFeatured" /><span class="tour-switch-ui"></span><span><strong>Featured Package</strong><small>Eligible for featured tour placements.</small></span></label>
                        </div>
                        <div id="tourPublishWarning" class="tour-publish-warning hidden"></div>
                      </div>

                      <div class="tour-form-pane" data-tour-form-pane="seo">
                        <div class="tour-pane-title"><div><span>STEP 6</span><h4>SEO Preview</h4><p>Current site SEO is generated automatically from the package title and descriptions.</p></div><div class="tour-pane-status">Auto SEO</div></div>
                        <div class="tour-seo-notice"><strong>No Worker change required.</strong><span>The public tour-details page currently uses Tour Title for the page title and Short Description (or Full Description fallback) for the meta description.</span></div>
                        <div class="tour-seo-card">
                          <span class="tour-seo-url" id="tourSeoUrl">https://ceybreez.com/tour-details.html?slug=...</span>
                          <h5 id="tourSeoTitlePreview">Tour Package | CeyBreez</h5>
                          <p id="tourSeoDescriptionPreview">Add a short description to improve the search result preview.</p>
                          <div class="tour-seo-meters"><span>Title: <b id="tourSeoTitleCount">0</b> chars</span><span>Description: <b id="tourSeoDescriptionCount">0</b> chars</span></div>
                        </div>
                        <div class="tour-seo-checklist" id="tourSeoChecklist"></div>
                      </div>
                    </div>

                    <aside class="tour-live-rail">
                      <div class="tour-live-rail-head"><div><span>LIVE PREVIEW</span><strong>Tour Card</strong></div><span id="tourDirtyBadge" class="tour-dirty-badge">Saved</span></div>
                      <div class="tour-preview-card">
                        <div class="tour-preview-image" id="tourLivePreviewImage"><div class="tour-empty-media">🖼️</div></div>
                        <div class="tour-preview-body">
                          <div class="tour-preview-badges"><span id="tourLiveCategory">Tour Package</span><span id="tourLiveFeatured" class="hidden">Featured</span></div>
                          <h4 id="tourLiveTitle">New Tour Package</h4>
                          <p id="tourLiveDescription">Add a short description to preview the package card.</p>
                          <div class="tour-preview-meta"><span id="tourLiveLocation">📍 Sri Lanka</span><span id="tourLiveDuration">🕒 Flexible</span></div>
                          <div class="tour-preview-price"><span>From</span><strong id="tourLivePrice">Price on request</strong></div>
                        </div>
                      </div>
                      <div class="tour-completeness">
                        <div class="tour-completeness-head"><strong>Package completeness</strong><span id="tourCompletenessPercent">0%</span></div>
                        <div class="tour-progress"><i id="tourCompletenessBar"></i></div>
                        <div id="tourCompletenessList" class="tour-completeness-list"></div>
                      </div>
                    </aside>
                  </div>
                </div>

                <div class="tour-modal-footer">
                  <div class="tour-footer-left"><span id="tourSaveHint">Changes are saved only when you press Save Tour Package.</span></div>
                  <div class="tour-footer-actions"><button type="button" id="tourFormPrevBtn" class="tour-secondary-btn">← Previous</button><button type="button" id="tourFormNextBtn" class="tour-secondary-btn">Next →</button><button type="button" id="tourPackageClearBtn" class="tour-dark-btn">Reset</button><button type="submit" id="tourPackageSaveBtn" class="tour-primary-btn">Save Tour Package</button></div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>`;
}

export function renderDestinationOptions(destinations = []) {
  const box = document.getElementById("tourLocation");
  if (!box) return;
  const current = box.value;
  box.innerHTML = `<option value="">Select destination</option>` + destinations.map(d => {
    const value = d.name || d.location || "";
    const suffix = d.area && d.area !== value ? ` — ${d.area}` : "";
    return `<option value="${escapeHtml(value)}">${escapeHtml(value + suffix)}</option>`;
  }).join("");
  if ([...box.options].some(o => o.value === current)) box.value = current;
}

export function renderCategoryOptions(tours = []) {
  const box = document.getElementById("tourPackageCategoryFilter");
  if (!box) return;
  const current = box.value || "all";
  const categories = [...new Set(tours.map(t => t.category).filter(Boolean))].sort();
  box.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if ([...box.options].some(o => o.value === current)) box.value = current;
}

export function renderTourStats(tours = []) {
  const total = tours.length;
  const active = tours.filter(t => boolValue(t.active)).length;
  const featured = tours.filter(t => boolValue(t.featured)).length;
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  set("tourStatTotal", total); set("tourStatActive", active); set("tourStatFeatured", featured);
}

export function renderTourPackagesTable(tours = []) {
  const tbody = document.getElementById("tourPackagesTableBody");
  if (!tbody) return;
  const search = (document.getElementById("tourPackageSearch")?.value || "").toLowerCase();
  const category = document.getElementById("tourPackageCategoryFilter")?.value || "all";
  const status = document.getElementById("tourPackageStatusFilter")?.value || "all";
  const filtered = tours.filter(t => {
    const text = `${t.title || ""} ${t.category || ""} ${t.location || ""} ${t.duration || ""}`.toLowerCase();
    const categoryOk = category === "all" || String(t.category || "") === category;
    const active = boolValue(t.active); const featured = boolValue(t.featured);
    const statusOk = status === "all" || (status === "active" && active) || (status === "hidden" && !active) || (status === "featured" && featured);
    return categoryOk && statusOk && (!search || text.includes(search));
  });
  if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No tour packages found</td></tr>`; return; }

  tbody.innerHTML = filtered.map(t => {
    const active = boolValue(t.active); const featured = boolValue(t.featured);
    const image = String(t.mainImage || (Array.isArray(t.photos) ? t.photos[0] : "") || "");
    return `<tr class="clickable-row" data-tour-row="${escapeHtml(t.id)}">
      <td><div class="tour-table-name">${image ? `<img src="${escapeHtml(image)}" alt="">` : `<span class="tour-table-placeholder">🧭</span>`}<div><strong>${escapeHtml(t.title || "-")}</strong><small>${escapeHtml(t.slug || "")}</small></div></div></td>
      <td>${escapeHtml(t.category || "-")}</td><td>${escapeHtml(t.location || "-")}</td><td>${escapeHtml(t.duration || "-")}</td>
      <td><strong>${t.basePrice ? `${escapeHtml(t.currency || "USD")} ${escapeHtml(t.basePrice)}` : "On request"}</strong>${t.childPrice ? `<br><small>Child: ${escapeHtml(t.currency || "USD")} ${escapeHtml(t.childPrice)}</small>` : ""}</td>
      <td>${active ? `<span class="tour-state-chip live">● Live</span>` : `<span class="tour-state-chip hidden-state">○ Hidden</span>`}</td>
      <td>${featured ? `<span class="tour-state-chip featured">★ Featured</span>` : `<span class="tour-state-chip neutral">—</span>`}</td>
      <td><div class="tour-row-actions"><button type="button" class="mini-btn" data-tour-edit="${escapeHtml(t.id)}">Edit</button><button type="button" class="delete-btn mini-btn" data-tour-delete="${escapeHtml(t.id)}">Delete</button></div></td>
    </tr>`;
  }).join("");
}
