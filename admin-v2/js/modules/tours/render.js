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

export function renderToursModuleShell(container) {
  if (!container) return;

  const oldContent = container.innerHTML;

  container.innerHTML = `
    <div class="tours-module">
      <div class="tours-module-head">
        <div>
          <h2>Tours CMS</h2>
          <p>Manage tour destinations and tour packages from one place.</p>
        </div>
      </div>

      <div class="tours-tabs">
        <button type="button" class="tours-tab-btn active" data-tour-tab="destinations">📍 Destinations</button>
        <button type="button" class="tours-tab-btn" data-tour-tab="packages">🧭 Tour Packages</button>
      </div>

      <div id="tourDestinationsPane" class="tours-pane active">
        ${oldContent}
      </div>

      <div id="tourPackagesPane" class="tours-pane">
        <section class="tour-packages-box">
          <div class="cms-toolbar tours-toolbar">
            <input id="tourPackageSearch" placeholder="Search tour package..." />
            <select id="tourPackageCategoryFilter"><option value="all">All Categories</option></select>
            <select id="tourPackageStatusFilter">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="featured">Featured</option>
            </select>
            <button type="button" id="addTourPackageBtn">+ Add Tour Package</button>
          </div>

          <div class="table-wrap cms-table-wrap tours-table-wrap">
            <table class="admin-table cms-table tours-table">
              <thead>
                <tr>
                  <th>Tour</th>
                  <th>Category</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="tourPackagesTableBody">
                <tr><td colspan="8" class="empty-row">No tour packages loaded</td></tr>
              </tbody>
            </table>
          </div>

          <div id="tourPackageFormBox" class="tour-modal-overlay hidden">
            <div class="tour-modal-card">
              <div class="tour-modal-head">
                <div>
                  <h3 id="tourPackageFormTitle">Add Tour Package</h3>
                  <p>Complete each tab and save the tour package.</p>
                </div>
                <button type="button" id="tourPackageCloseBtn" class="tour-modal-close">×</button>
              </div>

              <form id="tourPackageForm" class="tour-package-form">
                <input type="hidden" id="tourEditId" />

                <div class="tour-editor-tabs">
                  <button type="button" class="tour-editor-tab active" data-tour-form-tab="basic">Basic</button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="pricing">Pricing</button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="content">Description</button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="gallery">Gallery</button>
                  <button type="button" class="tour-editor-tab" data-tour-form-tab="settings">Settings</button>
                </div>

                <div class="tour-modal-body">
                  <div class="tour-form-pane active" data-tour-form-pane="basic">
                    <div class="tour-pane-title">
                      <h4>Basic Information</h4>
                      <p>Tour identity, destination and duration.</p>
                    </div>
                    <div class="tour-form-grid two-col">
                      <label>Tour Title<input id="tourTitle" required placeholder="Sigiriya Day Tour" /></label>
                      <label>Slug<input id="tourSlug" placeholder="sigiriya-day-tour" /></label>
                      <label>Category<input id="tourCategory" placeholder="Day Tour / Safari / Transfer" /></label>
                      <label>Destination<select id="tourLocation"><option value="">Select destination</option></select></label>
                      <label>Duration<input id="tourDuration" placeholder="Full Day / 3 Hours" /></label>
                      <label>Sort Order<input id="tourSortOrder" type="number" value="0" /></label>
                    </div>
                    <label class="full-row">Short Description<textarea id="tourShortDescription" placeholder="Short card description shown on tour list..."></textarea></label>
                  </div>

                  <div class="tour-form-pane" data-tour-form-pane="pricing">
                    <div class="tour-pane-title">
                      <h4>Pricing</h4>
                      <p>Set base price, child price and currency.</p>
                    </div>
                    <div class="tour-form-grid three-col">
                      <label>Currency<select id="tourCurrency"><option>USD</option><option>LKR</option><option>OMR</option><option>EUR</option></select></label>
                      <label>Adult / Base Price<input id="tourBasePrice" placeholder="120" /></label>
                      <label>Child Price<input id="tourChildPrice" placeholder="60" /></label>
                    </div>
                  </div>

                  <div class="tour-form-pane" data-tour-form-pane="content">
                    <div class="tour-pane-title">
                      <h4>Description, Itinerary & Includes</h4>
                      <p>Add full details for the public tour page.</p>
                    </div>
                    <div class="tour-form-grid two-col content-grid">
                      <label>Full Description<textarea id="tourFullDescription" placeholder="Full tour description..."></textarea></label>
                      <label>Itinerary <small>one line per stop</small><textarea id="tourItinerary" placeholder="08:00 Pickup&#10;10:00 Sigiriya Rock&#10;13:00 Lunch"></textarea></label>
                      <label>Inclusions <small>one per line</small><textarea id="tourInclusions" placeholder="Transport&#10;Driver&#10;Water"></textarea></label>
                      <label>Exclusions <small>one per line</small><textarea id="tourExclusions" placeholder="Entrance tickets&#10;Personal expenses"></textarea></label>
                    </div>
                  </div>

                  <div class="tour-form-pane" data-tour-form-pane="gallery">
                    <div class="tour-pane-title">
                      <h4>Images & Gallery</h4>
                      <p>Paste uploaded image URLs. Upload can be connected later.</p>
                    </div>
                    <div class="tour-form-grid two-col">
                      <label>Main Image URL<input id="tourMainImage" placeholder="https://..." /></label>
                      <label>Gallery Photo URLs <small>one per line</small><textarea id="tourPhotos" placeholder="https://...&#10;https://..."></textarea></label>
                    </div>
                  </div>

                  <div class="tour-form-pane" data-tour-form-pane="settings">
                    <div class="tour-pane-title">
                      <h4>Booking Rules & Status</h4>
                      <p>Control availability and visibility.</p>
                    </div>
                    <div class="tour-check-row pro-checks">
                      <label><input type="checkbox" id="tourPickupAvailable" checked /> <span>Pickup Available</span></label>
                      <label><input type="checkbox" id="tourActive" checked /> <span>Active / Show on website</span></label>
                      <label><input type="checkbox" id="tourFeatured" /> <span>Featured on website</span></label>
                    </div>
                  </div>
                </div>

                <div class="tour-modal-footer">
                  <button type="button" id="tourFormPrevBtn" class="tour-secondary-btn">← Previous</button>
                  <button type="button" id="tourFormNextBtn" class="tour-secondary-btn">Next →</button>
                  <button type="button" id="tourPackageClearBtn" class="tour-dark-btn">Clear</button>
                  <button type="submit" class="tour-primary-btn">Save Tour Package</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}

export function renderDestinationOptions(destinations = []) {
  const box = document.getElementById("tourLocation");
  if (!box) return;
  const current = box.value;
  box.innerHTML = `<option value="">Select destination</option>` + destinations.map(d => `
    <option value="${escapeHtml(d.name || d.location || "")}">${escapeHtml(d.name || d.location || "")}</option>
  `).join("");
  if ([...box.options].some(o => o.value === current)) box.value = current;
}

export function renderCategoryOptions(tours = []) {
  const box = document.getElementById("tourPackageCategoryFilter");
  if (!box) return;
  const current = box.value || "all";
  const categories = [...new Set(tours.map(t => t.category).filter(Boolean))].sort();
  box.innerHTML = `<option value="all">All Categories</option>` + categories.map(c => `
    <option value="${escapeHtml(c)}">${escapeHtml(c)}</option>
  `).join("");
  if ([...box.options].some(o => o.value === current)) box.value = current;
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
    const statusOk = status === "all" ||
      (status === "active" && t.active) ||
      (status === "hidden" && !t.active) ||
      (status === "featured" && t.featured);
    return categoryOk && statusOk && (!search || text.includes(search));
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No tour packages found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t => `
    <tr class="clickable-row" data-tour-edit="${escapeHtml(t.id)}">
      <td><strong>${escapeHtml(t.title || "-")}</strong><br><small>${escapeHtml(t.slug || "")}</small></td>
      <td>${escapeHtml(t.category || "-")}</td>
      <td>${escapeHtml(t.location || "-")}</td>
      <td>${escapeHtml(t.duration || "-")}</td>
      <td><strong>${escapeHtml(t.currency || "USD")} ${escapeHtml(t.basePrice || "0")}</strong><br><small>Child: ${escapeHtml(t.childPrice || "0")}</small></td>
      <td>${t.active ? `<span class="status-badge status-booked">Active</span>` : `<span class="status-badge status-cancelled">Hidden</span>`}</td>
      <td>${t.featured ? `<span class="status-badge status-quoted">Featured</span>` : `<span class="status-badge">No</span>`}</td>
      <td onclick="event.stopPropagation();">
        <button class="mini-btn" data-tour-edit="${escapeHtml(t.id)}">Edit</button>
        <button class="delete-btn mini-btn" data-tour-delete="${escapeHtml(t.id)}">Delete</button>
      </td>
    </tr>
  `).join("");
}
