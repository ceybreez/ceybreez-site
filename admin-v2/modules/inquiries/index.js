/* =========================
   INQUIRIES
========================= */

async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load inquiries");

    allInquiries = data || [];

    const visibleInquiries = allInquiries.filter(x => getInquiryCategory(x) === currentInquiryView);
    renderInquiryStats(visibleInquiries);
    renderDashboardCards(visibleInquiries);
    renderInquiryTypeCards(visibleInquiries);
    renderMonthlyInquiryChart(visibleInquiries);
    applyInquiryFilters();
    renderReports();

  } catch (err) {
    alert(err.message);
  }
}

async function updateInquiryStatus(id, status, sendEmail = false) {

  const inquiry = allInquiries.find(
    x => String(x.id) === String(id)
  );

  if (
    String(status).toLowerCase() === "booked" &&
    inquiry
  ) {
    currentInquiry = inquiry;
    await confirmBooking(sendEmail);
    return;
  }

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({
      status,
      sendEmail,
      adminMessage: document.getElementById("bookingConfirmAdminMessage")?.value || ""
    })
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Status update failed");
    return;
  }

  alert(sendEmail ? "Inquiry updated and email sent" : "Inquiry updated");

  await loadInquiries();
  await loadBookings();

  if (currentInquiry && String(currentInquiry.id) === String(id)) {
    closeInquiryModal();
  }
}

async function deleteInquiry(id) {
  if (!confirm("Delete this inquiry?")) return;

  const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  const result = await res.json();

  if (!res.ok) {
    alert(result.error || "Delete failed");
    return;
  }

  alert("Inquiry deleted");
  loadInquiries();
}

function applyInquiryFilters() {
  const searchInputs = document.querySelectorAll("#inquirySearch");
  let search = "";

  searchInputs.forEach(input => {
    if (input.value.trim()) search = input.value.toLowerCase();
  });

  const oldStatus = document.getElementById("inquiryFilter")?.value || "";
  const newStatus = document.getElementById("inquiryStatusFilter")?.value || "all";

  let status = "";
  if (newStatus && newStatus !== "all") status = newStatus.toLowerCase();
  if (oldStatus) status = oldStatus.toLowerCase();

  const filtered = allInquiries.filter(item => {
    if (getInquiryCategory(item) !== currentInquiryView) return false;
    const text = `
      ${item.reference || ""}
      ${item.guestName || ""}
      ${item.guestEmail || ""}
      ${item.guestMobile || ""}
      ${item.serviceType || ""}
      ${item.itemName || ""}
      ${item.message || ""}
    `.toLowerCase();

    const itemStatus = normalizeStatus(item.status);

    const mode = v6InquiryMode || document.getElementById("v6InquiryMode")?.value || "all";
    const modeMatch = mode === "all" || classifyInquiryItem(item) === mode;

    return modeMatch &&
           (!status || itemStatus === status) &&
           (!search || text.includes(search));
  });

  renderInquiryTable(filtered);

  const inquiryCardsBox = document.getElementById("inquiriesList");
  if (inquiryCardsBox) inquiryCardsBox.innerHTML = "";
}

function renderInquiryCards(data) {
  const box = document.getElementById("inquiriesList");
  if (!box) return;

  box.innerHTML = "";

  if (!data.length) {
    box.innerHTML = "<p>No inquiries found.</p>";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card inquiry-card";

    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    card.innerHTML = `
      <span class="status status-${statusClass}">
        ${escapeHtml(displayStatus)}
      </span>

      <h3>${escapeHtml(item.reference || "Inquiry")}</h3>

      <p><strong>Service:</strong> ${escapeHtml(item.serviceType || "")}</p>
      <p><strong>Item:</strong> ${escapeHtml(item.itemName || "")}</p>
      <p><strong>Name:</strong> ${escapeHtml(item.guestName || "")}</p>
      <p><strong>Email:</strong> ${escapeHtml(item.guestEmail || "")}</p>
      <p><strong>Mobile:</strong> ${escapeHtml(item.guestMobile || "")}</p>
      <p><strong>Country:</strong> ${escapeHtml(item.guestCountry || "")}</p>
      <p><strong>Guests:</strong> ${escapeHtml(item.guests || "")}</p>
      <p><strong>Dates:</strong> ${escapeHtml(item.dateFrom || "")} → ${escapeHtml(item.dateTo || "")}</p>

      <details>
        <summary>View Message</summary>
        <pre>${escapeHtml(item.message || "")}</pre>
      </details>

      <select class="inquiry-status">
        <option value="New">New</option>
        <option value="Contacted">Contacted</option>
        <option value="Quoted">Quoted</option>
        <option value="Booked">Booked</option>
        <option value="Closed">Closed</option>
        <option value="Cancelled">Cancelled</option>
      </select>

      <button class="edit-btn">Update Status</button>
      <button class="delete-btn">Delete</button>
    `;

    card.querySelector(".inquiry-status").value = item.status || "New";

    card.querySelector(".edit-btn").onclick = () => {
      updateInquiryStatus(item.id, card.querySelector(".inquiry-status").value);
    };

    card.querySelector(".delete-btn").onclick = () => {
      deleteInquiry(item.id);
    };

    box.appendChild(card);
  });
}

function renderInquiryTable(data) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">No inquiries found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const statusClass = normalizeStatus(item.status);
    const displayStatus = item.status || "New";

    return `
      <tr onclick="openInquiryModal('${item.id}')" class="clickable-row">
        <td>${escapeHtml(item.reference || item.id || "-")}</td>
        <td>${formatDate(item.createdAt || item.created_at)}</td>
        <td>${escapeHtml(item.serviceType || "-")}</td>
        <td>${escapeHtml(item.itemName || getItemNameFromService(item.serviceType) || "-")}</td>
        <td>${escapeHtml(item.guestName || "-")}</td>
        <td>${escapeHtml(item.dateFrom || "-")}</td>
        <td>${escapeHtml(item.dateTo || "-")}</td>
        <td>
          <span class="status-badge status-${statusClass}">
            ${escapeHtml(displayStatus)}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function renderInquiryStats(data) {
  const box = document.getElementById("inquiryStats");
  if (!box) return;

  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;

  box.innerHTML = `
    <div class="stat">New (${count("New")})</div>
    <div class="stat">Contacted (${count("Contacted")})</div>
    <div class="stat">Quoted (${count("Quoted")})</div>
    <div class="stat">Booked (${count("Booked")})</div>
    <div class="stat">Closed (${count("Closed")})</div>
    <div class="stat">Cancelled (${count("Cancelled")})</div>
  `;
}

function renderDashboardCards(data) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const total = data.length;
  const count = status => data.filter(x => normalizeStatus(x.status) === status.toLowerCase()).length;

  box.innerHTML = `
    <div class="dashboard-card">
      <h3>Total Inquiries</h3>
      <div class="value">${total}</div>
    </div>

    <div class="dashboard-card card-new">
      <h3>New</h3>
      <div class="value">${count("New")}</div>
    </div>

    <div class="dashboard-card card-contacted">
      <h3>Contacted</h3>
      <div class="value">${count("Contacted")}</div>
    </div>

    <div class="dashboard-card card-booked">
      <h3>Booked</h3>
      <div class="value">${count("Booked")}</div>
    </div>

    <div class="dashboard-card card-closed">
      <h3>Closed</h3>
      <div class="value">${count("Closed")}</div>
    </div>
  `;
}

function renderInquiryTypeCards(data) {
  const box = document.getElementById("inquiryTypeCards");
  if (!box) return;

  const countType = keyword =>
    data.filter(x =>
      (x.serviceType || "").toLowerCase().includes(keyword) ||
      (x.itemName || "").toLowerCase().includes(keyword)
    ).length;

  box.innerHTML = `
    <div class="dashboard-card">
      <h3>🏡 Villas</h3>
      <div class="value">${countType("villa")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🏢 Apartments</h3>
      <div class="value">${countType("apartment")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🏠 Homestays</h3>
      <div class="value">${countType("homestay")}</div>
    </div>

    <div class="dashboard-card">
      <h3>🧭 Tours</h3>
      <div class="value">${countType("tour")}</div>
    </div>

    <div class="dashboard-card">
      <h3>📞 Contact</h3>
      <div class="value">${countType("contact")}</div>
    </div>
  `;
}

function renderMonthlyInquiryChart(data) {
  const box = document.getElementById("monthlyInquiryChart");
  if (!box) return;

  const months = {};

  data.forEach(item => {
    const date =
      item.createdAt ||
      item.created_at ||
      item.created ||
      item.dateFrom ||
      "";

    if (!date) return;

    const monthKey = String(date).slice(0, 7);
    if (!monthKey || monthKey.length < 7) return;

    months[monthKey] = (months[monthKey] || 0) + 1;
  });

  const entries = Object.entries(months).sort();

  if (!entries.length) {
    box.innerHTML = "";
    return;
  }

  const max = Math.max(...entries.map(x => x[1]));

  box.innerHTML = `
    <h3>Monthly Inquiry Trend</h3>
    <div class="chart-bars">
      ${entries.map(([month, count]) => `
        <div class="chart-row">
          <span>${month}</span>
          <div class="bar-wrap">
            <div class="bar" style="width:${max ? (count / max) * 100 : 0}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function exportInquiriesCSV() {
  if (!allInquiries.length) {
    alert("No inquiries to export");
    return;
  }

  const rows = allInquiries.map(x => ({
    Reference: x.reference || "",
    Status: x.status || "",
    Service: x.serviceType || "",
    Item: x.itemName || "",
    Name: x.guestName || "",
    Email: x.guestEmail || "",
    Mobile: x.guestMobile || "",
    Country: x.guestCountry || "",
    Guests: x.guests || "",
    DateFrom: x.dateFrom || "",
    DateTo: x.dateTo || "",
    CreatedAt: x.createdAt || "",
    Message: x.message || ""
  }));

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => `"${String(row[h]).replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "ceybreez-inquiries.csv";
  a.click();
}

function normalizeStatus(status) {
  return String(status || "New").toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

