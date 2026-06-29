/* Override inquiry table with confirmation columns */
function renderInquiryTable(data) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  const thead = tbody.closest("table")?.querySelector("thead tr");
  if(thead && !thead.dataset.v65){
    thead.innerHTML = `
      <th>Reference</th>
      <th>Date</th>
      <th>Type</th>
      <th>Property / Tour</th>
      <th>Guest</th>
      <th>Dates</th>
      <th>Guest Confirm</th>
      <th>Admin Confirm</th>
      <th>Status</th>
    `;
    thead.dataset.v65 = "1";
  }

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No inquiries found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    return `
      <tr onclick="openInquiryModal('${escapeJs(item.id)}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(classifyInquiryItem(item).toUpperCase())}<br><small>${escapeHtml(item.serviceType || "-")}</small></td>
        <td>${escapeHtml(item.itemName || getItemNameForBooking(item) || "-")}</td>
        <td><strong>${escapeHtml(item.guestName || "-")}</strong><br><small>${escapeHtml(item.guestEmail || "")}</small></td>
        <td>${escapeHtml(item.dateFrom || "-")} → ${escapeHtml(item.dateTo || (classifyInquiryItem(item)==="tour" ? item.dateFrom : "-"))}</td>
        <td>${v65GuestBadge(item)}</td>
        <td>${v65AdminBadge(item)}</td>
        <td><span class="status-badge status-${statusClass}">${escapeHtml(displayStatus)}</span></td>
      </tr>
    `;
  }).join("");
}

