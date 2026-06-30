import {
  activePropertiesByType,
  availabilityShort,
  availabilityTypeClass,
  blockCovers,
  bookingCovers,
  escapeHtml,
  formatDate
} from "./helpers.js";

import { availabilityBlocks } from "./blocks.js";

export function renderMatrix({
  box,
  bookings,
  properties,
  selectedType,
  dates
}) {
  const blocks = availabilityBlocks();
  const props = activePropertiesByType(properties, selectedType);

  let bookedCount = 0;
  let ownerCount = 0;
  let maintenanceCount = 0;
  let privateCount = 0;
  let holdCount = 0;
  let freeCount = 0;

  const matrixRows = props.map(property => {
    const cells = dates.map(date => {
      const booking = bookings.find(item =>
        bookingCovers(item, property.name, date)
      );

      if (booking) {
        bookedCount++;

        return `
          <td class="v19-cell booked"
              title="${escapeHtml(booking.reference || "Booking")} - ${escapeHtml(booking.guestName || "")}">
            <button type="button"
                    onclick="openBookingDetails && openBookingDetails('${escapeHtml(booking.id || "")}')">
              B
            </button>
          </td>
        `;
      }

      const block = blocks.find(item =>
        blockCovers(item, property.name, date)
      );

      if (block) {
        const cls = availabilityTypeClass(block.type);
        const short = availabilityShort(block.type);

        if (cls === "owner") ownerCount++;
        else if (cls === "maintenance") maintenanceCount++;
        else if (cls === "private") privateCount++;
        else if (cls === "hold") holdCount++;

        return `
          <td class="v19-cell ${cls}"
              title="${escapeHtml(block.type || "Blocked")} - ${escapeHtml(block.reason || "")}">
            <button type="button"
                    onclick="v18DeleteBlock('${escapeHtml(block.id)}')">
              ${short}
            </button>
          </td>
        `;
      }

      freeCount++;
      return `<td class="v19-cell free"><span>A</span></td>`;
    }).join("");

    return `
      <tr>
        <td class="v19-property">
          <strong>${escapeHtml(property.name || "-")}</strong>
          <small>${escapeHtml(property.type || "")}</small>
        </td>
        ${cells}
      </tr>
    `;
  }).join("");

  box.innerHTML = `
    <section class="v19-card v19-matrix-card">
      <div class="v19-card-head">
        <div>
          <h3>Availability Matrix</h3>
          <p>Click B to open booking details. Click O/M/P/H to delete the block.</p>
        </div>
      </div>

      <div class="v19-matrix-scroll">
        <table class="v19-matrix">
          <thead>
            <tr>
              <th class="v19-property-head">Property</th>
              ${dates.map(date => `
                <th><strong>${formatDate(date).replace(" 2026", "")}</strong></th>
              `).join("")}
            </tr>
          </thead>

          <tbody>
            ${
              matrixRows ||
              `<tr><td colspan="${dates.length + 1}" class="empty-row">No active properties found.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  return {
    bookedCount,
    ownerCount,
    maintenanceCount,
    privateCount,
    holdCount,
    freeCount
  };
}
