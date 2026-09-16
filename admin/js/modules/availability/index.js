import { apiGet } from "../../core/api.js";
import {
  activePropertiesByType,
  addDays,
  escapeHtml,
  formatDate,
  safeArray,
  toISO
} from "./helpers.js";

import { availabilityBlocks, attachBlockForm, deleteBlock } from "./blocks.js";
import { initBlockDatePickers } from "./calendar.js";
import { renderMatrix } from "./matrix.js";

function stat(label, value, sub) {
  return `
    <div class="v14-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      <small>${escapeHtml(sub || "")}</small>
    </div>
  `;
}

function buildDates(start, daysCount) {
  const dates = [];
  const startDate = new Date(`${start}T00:00:00`);

  for (let i = 0; i < daysCount; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(toISO(date));
  }

  return dates;
}

function renderBlocksTable() {
  const blocks = availabilityBlocks();

  if (!blocks.length) {
    return `<tr><td colspan="5" class="empty-row">No owner / maintenance / private blocks saved yet.</td></tr>`;
  }

  return blocks.slice().reverse().map(block => `
    <tr>
      <td><strong>${escapeHtml(block.propertyName)}</strong></td>
      <td><span class="v19-chip">${escapeHtml(block.type)}</span></td>
      <td>${escapeHtml(block.dateFrom)} → ${escapeHtml(block.dateTo)}</td>
      <td>${escapeHtml(block.reason || "-")}</td>
      <td>
        <button class="delete-btn mini-btn"
                onclick="v18DeleteBlock('${escapeHtml(block.id)}')">
          Delete
        </button>
      </td>
    </tr>
  `).join("");
}

function renderSkeleton(box) {
  box.innerHTML = `
    <div class="v19-page-head">
      <div>
        <h2>Availability Manager</h2>
        <p>Loading property calendar and blocks...</p>
      </div>
    </div>
  `;
}

export async function renderAvailabilityManager() {
  const box = document.getElementById("availabilityTab");
  if (!box) return;

  renderSkeleton(box);

  try {
    const [bookingsRaw, propertiesRaw] = await Promise.all([
      apiGet("/api/admin/bookings").catch(() => []),
      apiGet("/api/admin/properties").catch(() => [])
    ]);

    const bookings = safeArray(bookingsRaw);
    const properties = safeArray(propertiesRaw);

    const selectedType = document.getElementById("v18AvailType")?.value || "all";
    const daysCount = Number(document.getElementById("v18AvailDays")?.value || 30);
    const start = document.getElementById("v18AvailStart")?.value || addDays(0);

    const props = activePropertiesByType(properties, selectedType);
    const dates = buildDates(start, daysCount);

    const propOptions = props.map(property => `
      <option value="${escapeHtml(property.name || "")}">
        ${escapeHtml(property.name || "")} (${escapeHtml(property.type || "")})
      </option>
    `).join("");

    box.innerHTML = `
      <div class="v19-page-head">
        <div>
          <h2>Availability Manager</h2>
          <p>Booking calendar, matrix, owner stay, maintenance, private and hold blocks.</p>
        </div>

        <div class="v19-head-actions">
          <input id="v18AvailStart" type="date" value="${escapeHtml(start)}">

          <select id="v18AvailType">
            <option value="all">All Types</option>
            <option value="villa">Villas</option>
            <option value="apartment">Apartments</option>
            <option value="homestay">Homestays</option>
          </select>

          <select id="v18AvailDays">
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
            <option value="45">45 Days</option>
            <option value="60">60 Days</option>
          </select>

          <button class="v14-refresh" type="button" onclick="v18RenderAvailability()">Refresh</button>
        </div>
      </div>

      <div class="v19-availability-shell">
        <div id="v19StatsStrip" class="v19-stat-strip"></div>

        <div class="v19-grid-two">
          <section class="v19-card v19-block-card">
            <div class="v19-card-head">
              <div>
                <h3>Quick Block</h3>
                <p>Block selected dates for owner, maintenance, private or hold.</p>
              </div>
            </div>

            <form id="v18BlockForm" class="v19-block-form">
              <label>
                <span>Property</span>
                <select id="v18BlockProperty" required>
                  <option value="">Select Property</option>
                  ${propOptions}
                </select>
              </label>

              <label>
                <span>Type</span>
                <select id="v18BlockType" required>
                  <option value="Owner Stay">Owner Stay</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Private">Private</option>
                  <option value="Hold">Hold</option>
                </select>
              </label>

              <label>
                <span>From</span>
                <input id="v18BlockFrom" type="date" required>
              </label>

              <label>
                <span>To</span>
                <input id="v18BlockTo" type="date" required>
              </label>

              <label class="wide">
                <span>Reason / note</span>
                <input id="v18BlockReason" placeholder="Example: Owner family stay / painting / repair">
              </label>

              <button type="submit">Save Block</button>
            </form>
          </section>

          <section class="v19-card v19-legend-card">
            <div class="v19-card-head">
              <div>
                <h3>Legend</h3>
                <p>Matrix color codes.</p>
              </div>
            </div>

            <div class="v19-legend-list">
              <span class="free">A <b>Available</b></span>
              <span class="booked">B <b>Booked</b></span>
              <span class="owner">O <b>Owner stay</b></span>
              <span class="maintenance">M <b>Maintenance</b></span>
              <span class="private">P <b>Private</b></span>
              <span class="hold">H <b>Hold</b></span>
            </div>
          </section>
        </div>

        <div id="v19MatrixBox"></div>

        <section class="v19-card">
          <div class="v19-card-head">
            <div>
              <h3>Saved Blocks</h3>
              <p>Owner, maintenance, private and hold blocks saved in this admin.</p>
            </div>
          </div>

          <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>${renderBlocksTable()}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;

    document.getElementById("v18AvailType").value = selectedType;
    document.getElementById("v18AvailDays").value = String(daysCount);

    const matrixBox = document.getElementById("v19MatrixBox");
    const stats = renderMatrix({
      box: matrixBox,
      bookings,
      properties,
      selectedType,
      dates
    });

    document.getElementById("v19StatsStrip").innerHTML = `
      ${stat("Available", stats.freeCount, "Open nights")}
      ${stat("Booked", stats.bookedCount, "Confirmed bookings")}
      ${stat("Owner Stay", stats.ownerCount, "Owner blocks")}
      ${stat("Maintenance", stats.maintenanceCount, "Repair / cleaning")}
      ${stat("Private / Hold", stats.privateCount + stats.holdCount, "Private and holds")}
    `;

    initBlockDatePickers(bookings);
    attachBlockForm(bookings, renderAvailabilityManager);

    ["v18AvailStart", "v18AvailType", "v18AvailDays"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", renderAvailabilityManager);
    });

  } catch (error) {
    box.innerHTML = `
      <div class="v19-page-head">
        <div>
          <h2>Availability Manager</h2>
          <p>${escapeHtml(error.message)}</p>
        </div>
        <button class="v14-refresh" onclick="v18RenderAvailability()">Retry</button>
      </div>
    `;
  }
}

export function initAvailabilityModule() {
  window.v18RenderAvailability = renderAvailabilityManager;

  window.v18DeleteBlock = function (id) {
    deleteBlock(id, renderAvailabilityManager);
  };
}
