/* Override booking table with confirmation/payment columns */
function renderBookingsTable(data) {
  const tbody = document.getElementById("bookingTableBody");
  if (!tbody) return;

  const thead = tbody.closest("table")?.querySelector("thead tr");
  if(thead && !thead.dataset.v65){
    thead.innerHTML = `
      <th>Reference</th>
      <th>Created</th>
      <th>Type</th>
      <th>Property / Tour</th>
      <th>Guest</th>
      <th>Dates</th>
      <th>Amount</th>
      <th>Guest</th>
      <th>Payment</th>
      <th>Status</th>
      <th>Action</th>
    `;
    thead.dataset.v65 = "1";
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-row">No bookings found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const status = item.status || "Booked";
    const statusClass = normalizeStatus(status);

    return `
      <tr onclick="openBookingDetails('${escapeJs(item.id)}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(classifyBookingItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType || "-")}</small></td>
        <td>${escapeHtml(item.itemName || "-")}</td>
        <td><strong>${escapeHtml(item.guestName || "-")}</strong><br><small>${escapeHtml(item.guestEmail || "")}</small><br><small>${escapeHtml(item.guestMobile || "")}</small></td>
        <td>${escapeHtml(item.dateFrom || "-")} → ${escapeHtml(item.dateTo || "-")}</td>
        <td>${escapeHtml(item.currency || item.quoteCurrency || "")} ${escapeHtml(item.totalAmount || item.quoteTotalAmount || "-")}</td>
        <td>${v65GuestBadge(item)}</td>
        <td>${v65PaymentBadge(item)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(status)}</span></td>
        <td onclick="event.stopPropagation();">
          <button class="mini-btn" onclick="openInquiryFromBooking('${escapeJs(item.id)}')">Manage</button>
        </td>
      </tr>
    `;
  }).join("");
}

