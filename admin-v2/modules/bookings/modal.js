import {
  createManualBooking,
  createAvailabilityBlock,
  loadProperties
} from "./api.js";

export async function openManualBookingModal(ctx) {
  const root = document.getElementById("modalRoot");
  if (!root) return;

  const properties = await safeLoadProperties();

  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">New Manual Booking</h3>
          <button class="close-btn" id="closeBookingModal" type="button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Guest Name</label>
              <input id="manualGuestName" type="text" placeholder="Guest name">
            </div>

            <div class="form-group">
              <label>Mobile</label>
              <input id="manualGuestMobile" type="text" placeholder="+94...">
            </div>

            <div class="form-group">
              <label>Email</label>
              <input id="manualGuestEmail" type="email" placeholder="guest@email.com">
            </div>

            <div class="form-group">
              <label>Property</label>
              <select id="manualPropertySelect">
                <option value="">Select property</option>
                ${propertyOptions(properties)}
              </select>
            </div>

            <div class="form-group">
              <label>Check-in</label>
              <input id="manualDateFrom" type="date">
            </div>

            <div class="form-group">
              <label>Check-out</label>
              <input id="manualDateTo" type="date">
            </div>

            <div class="form-group">
              <label>Guests</label>
              <input id="manualGuests" type="number" min="1" placeholder="2">
            </div>

            <div class="form-group">
              <label>Source</label>
              <select id="manualSource">
                <option value="Manual">Manual</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Phone">Phone</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Airbnb">Airbnb</option>
                <option value="Agoda">Agoda</option>
              </select>
            </div>

            <div class="form-group full">
              <label>Notes</label>
              <textarea id="manualReason" placeholder="Booking notes..."></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="secondary-btn" id="cancelBookingModal" type="button">Cancel</button>
          <button class="primary-btn" id="saveManualBookingBtn" type="button">Save Booking</button>
        </div>
      </div>
    </div>
  `;

  bindClose(root);
  document.getElementById("saveManualBookingBtn")?.addEventListener("click", () => saveManualBooking(ctx, properties));
}

export async function openBlockDatesModal(ctx) {
  const root = document.getElementById("modalRoot");
  if (!root) return;

  const properties = await safeLoadProperties();

  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Block Dates</h3>
          <button class="close-btn" id="closeBookingModal" type="button">×</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Property</label>
              <select id="blockPropertySelect">
                <option value="">Select property</option>
                ${propertyOptions(properties)}
              </select>
            </div>

            <div class="form-group">
              <label>Block Type</label>
              <select id="blockType">
                <option value="Owner Stay">Owner Stay</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Private">Private</option>
                <option value="Hold">Hold</option>
                <option value="Cleaning">Cleaning</option>
              </select>
            </div>

            <div class="form-group">
              <label>Start Date</label>
              <input id="blockDateFrom" type="date">
            </div>

            <div class="form-group">
              <label>End Date</label>
              <input id="blockDateTo" type="date">
            </div>

            <div class="form-group full">
              <label>Reason</label>
              <textarea id="blockReason" placeholder="Reason for blocking these dates..."></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="secondary-btn" id="cancelBookingModal" type="button">Cancel</button>
          <button class="primary-btn" id="saveBlockDatesBtn" type="button">Block Dates</button>
        </div>
      </div>
    </div>
  `;

  bindClose(root);
  document.getElementById("saveBlockDatesBtn")?.addEventListener("click", () => saveBlockDates(ctx, properties));
}

async function safeLoadProperties() {
  try {
    const data = await loadProperties();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    alert("Failed to load properties. Please check admin token/API.");
    return [];
  }
}

function propertyOptions(properties) {
  return properties
    .filter(p => p.active !== false)
    .map(p => `
      <option value="${escapeHtml(p.id)}">
        ${escapeHtml(labelProperty(p))}
      </option>
    `)
    .join("");
}

function labelProperty(p) {
  const type = p.type ? String(p.type).toUpperCase() : "PROPERTY";
  const location = p.location ? ` · ${p.location}` : "";
  return `${type} - ${p.name || p.id}${location}`;
}

function selectedProperty(selectId, properties) {
  const id = value(selectId);
  const property = properties.find(p => String(p.id) === String(id));

  if (!property) {
    return null;
  }

  return {
    propertyId: property.id || "",
    propertyName: property.name || property.id || "",
    itemName: property.name || property.id || "",
    propertyType: property.type || "",
    location: property.location || ""
  };
}

function bindClose(root) {
  document.getElementById("closeBookingModal")?.addEventListener("click", () => closeModal());
  document.getElementById("cancelBookingModal")?.addEventListener("click", () => closeModal());

  root.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeModal();
  });
}

function closeModal() {
  const root = document.getElementById("modalRoot");
  if (root) root.innerHTML = "";
}

async function saveManualBooking(ctx, properties) {
  const property = selectedProperty("manualPropertySelect", properties);

  if (!property) {
    alert("Please select a property.");
    return;
  }

  const payload = {
    ...property,
    guestName: value("manualGuestName"),
    guestMobile: value("manualGuestMobile"),
    guestEmail: value("manualGuestEmail"),
    dateFrom: value("manualDateFrom"),
    dateTo: value("manualDateTo"),
    guests: value("manualGuests"),
    source: value("manualSource"),
    reason: value("manualReason")
  };

  if (!payload.guestName || !payload.dateFrom || !payload.dateTo) {
    alert("Guest name and dates are required.");
    return;
  }

  try {
    await createManualBooking(payload);
    closeModal();
    await ctx.load();
    alert("Manual booking created successfully.");
  } catch (error) {
    alert(error.message);
  }
}

async function saveBlockDates(ctx, properties) {
  const property = selectedProperty("blockPropertySelect", properties);

  if (!property) {
    alert("Please select a property.");
    return;
  }

  const payload = {
    ...property,
    type: value("blockType"),
    dateFrom: value("blockDateFrom"),
    dateTo: value("blockDateTo"),
    reason: value("blockReason"),
    source: "Admin"
  };

  if (!payload.dateFrom || !payload.dateTo) {
    alert("Dates are required.");
    return;
  }

  try {
    await createAvailabilityBlock(payload);
    closeModal();
    await ctx.load();
    alert("Dates blocked successfully.");
  } catch (error) {
    alert(error.message);
  }
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
