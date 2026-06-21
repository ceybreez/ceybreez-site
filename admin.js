const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";

let allInquiries = [];

/* =========================
   AUTH
========================= */

function getToken() {
  return localStorage.getItem("adminToken") || "";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function loginAdmin() {
  const token = document.getElementById("adminToken").value;

  if (!token) {
    alert("Enter Admin Token");
    return;
  }

  localStorage.setItem("adminToken", token);

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  showTab("destinations");
}

function logoutAdmin() {
  localStorage.removeItem("adminToken");
  location.reload();
}

/* =========================
   TABS
========================= */

function showTab(tab) {
  const sections = [
    "destinationsTab",
    "propertiesTab",
    "servicesTab",
    "inquiriesTab",
    "pageControlTab"
  ];

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  let targetId = "";

  if (tab === "destinations") targetId = "destinationsTab";
  if (tab === "properties") targetId = "propertiesTab";
  if (tab === "services") targetId = "servicesTab";
  if (tab === "inquiriesTab") targetId = "inquiriesTab";
  if (tab === "pageControl") targetId = "pageControlTab";

  const target = document.getElementById(targetId);
  if (target) target.classList.remove("hidden");

  if (tab === "inquiriesTab") {
    loadInquiries();
  }
}

/* =========================
   LOAD INQUIRIES
========================= */

async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries`, {
      method: "GET",
      headers: authHeaders()
    });

    const text = await res.text();

    let data = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      throw new Error(text || "Invalid API response");
    }

    if (!res.ok) {
      throw new Error(data.error || "Failed to load inquiries");
    }

    allInquiries = Array.isArray(data) ? data : [];

    renderDashboardCards(allInquiries);
    renderInquiryTypeCards(allInquiries);
    renderMonthlyChart(allInquiries);
    renderInquiryStats(allInquiries);
    applyInquiryFilters();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

/* =========================
   DASHBOARD CARDS
========================= */

function renderDashboardCards(inquiries) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const total = inquiries.length;
  const newCount = inquiries.filter(i => normalizeStatus(i.status) === "new").length;
  const contacted = inquiries.filter(i => normalizeStatus(i.status) === "contacted").length;
  const confirmed = inquiries.filter(i => normalizeStatus(i.status) === "confirmed").length;
  const closed = inquiries.filter(i => normalizeStatus(i.status) === "closed").length;

  box.innerHTML = `
    <div class="dashboard-card">
      <h3>Total Inquiries</h3>
      <strong>${total}</strong>
    </div>
    <div class="dashboard-card">
      <h3>New</h3>
      <strong>${newCount}</strong>
    </div>
    <div class="dashboard-card">
      <h3>Contacted</h3>
      <strong>${contacted}</strong>
    </div>
    <div class="dashboard-card">
      <h3>Confirmed</h3>
      <strong>${confirmed}</strong>
    </div>
    <div class="dashboard-card">
      <h3>Closed</h3>
      <strong>${closed}</strong>
    </div>
  `;
}

/* =========================
   TYPE CARDS
========================= */

function renderInquiryTypeCards(inquiries) {
  const box = document.getElementById("inquiryTypeCards");
  if (!box) return;

  const types = {};

  inquiries.forEach(item => {
    const type = item.serviceType || item.type || "Travel Inquiry";
    types[type] = (types[type] || 0) + 1;
  });

  box.innerHTML = Object.entries(types).map(([type, count]) => `
    <div class="dashboard-card type-card">
      <h3>${escapeHtml(type)}</h3>
      <strong>${count}</strong>
    </div>
  `).join("");
}

/* =========================
   MONTHLY CHART
========================= */

function renderMonthlyChart(inquiries) {
  const box = document.getElementById("monthlyInquiryChart");
  if (!box) return;

  const months = {};

  inquiries.forEach(item => {
    const date = new Date(item.createdAt || item.created_at || Date.now());
    const key = date.toLocaleString("en-US", {
      month: "short",
      year: "numeric"
    });
    months[key] = (months[key] || 0) + 1;
  });

  const values = Object.values(months);
  const maxValue = Math.max(...values, 1);

  box.innerHTML = `
    <h2>Monthly Inquiries</h2>
    <div class="chart-bars">
      ${Object.entries(months).map(([month, count]) => `
        <div class="chart-row">
          <span>${month}</span>
          <div class="bar-wrap">
            <div class="bar" style="width:${(count / maxValue) * 100}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   STATS
========================= */

function renderInquiryStats(inquiries) {
  const box = document.getElementById("inquiryStats");
  if (!box) return;

  const today = new Date().toDateString();

  const todayCount = inquiries.filter(item => {
    const d = new Date(item.createdAt || item.created_at);
    return d.toDateString() === today;
  }).length;

  box.innerHTML = `
    <div class="stat">
      Today: <strong>${todayCount}</strong>
    </div>
    <div class="stat">
      Total: <strong>${inquiries.length}</strong>
    </div>
  `;
}

/* =========================
   FILTERS
========================= */

function applyInquiryFilters() {
  const search = document.getElementById("inquirySearch")?.value.toLowerCase() || "";
  const status = document.getElementById("inquiryStatusFilter")?.value || "all";

  let filtered = [...allInquiries];

  if (search) {
    filtered = filtered.filter(item =>
      (item.reference || "").toLowerCase().includes(search) ||
      (item.guestName || "").toLowerCase().includes(search) ||
      (item.guestEmail || "").toLowerCase().includes(search) ||
      (item.guestMobile || "").toLowerCase().includes(search) ||
      (item.serviceType || "").toLowerCase().includes(search) ||
      (item.itemName || "").toLowerCase().includes(search) ||
      (item.message || "").toLowerCase().includes(search)
    );
  }

  if (status !== "all") {
    filtered = filtered.filter(item => normalizeStatus(item.status) === status);
  }

  renderInquiryTable(filtered);
  renderInquiriesList(filtered);
}

/* =========================
   TABLE
========================= */

function renderInquiryTable(inquiries) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  if (!inquiries.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">No inquiries found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inquiries.map(item => {
    const status = normalizeStatus(item.status);

    return `
      <tr>
        <td>${formatDate(item.createdAt)}</td>

        <td>
          <strong>${escapeHtml(item.guestName || "-")}</strong><br>
          <small>${escapeHtml(item.guestEmail || "")}</small><br>
          <small>${escapeHtml(item.guestMobile || "")}</small>
        </td>

        <td>${escapeHtml(item.serviceType || "-")}</td>

        <td>${escapeHtml(item.itemName || item.reference || "-")}</td>

        <td>
          ${escapeHtml(item.dateFrom || "-")}
          ${item.dateTo ? " to " + escapeHtml(item.dateTo) : ""}
        </td>

        <td>${escapeHtml(item.guests || "-")}</td>

        <td>
          <span class="status-badge status-${status}">
            ${capitalize(status)}
          </span>
        </td>

        <td>
          <select class="action-select" onchange="updateInquiryStatus('${item.id}', this.value)">
            <option value="new" ${status === "new" ? "selected" : ""}>New</option>
            <option value="contacted" ${status === "contacted" ? "selected" : ""}>Contacted</option>
            <option value="confirmed" ${status === "confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="closed" ${status === "closed" ? "selected" : ""}>Closed</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

/* =========================
   CARD LIST
========================= */

function renderInquiriesList(inquiries) {
  const list = document.getElementById("inquiriesList");
  if (!list) return;

  if (!inquiries.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = inquiries.map(item => {
    const status = normalizeStatus(item.status);

    return `
      <div class="inquiry-card">
        <span class="status status-${status}">${capitalize(status)}</span>
        <h3>${escapeHtml(item.reference || "Inquiry")}</h3>

        <p><b>Name:</b> ${escapeHtml(item.guestName || "-")}</p>
        <p><b>Email:</b> ${escapeHtml(item.guestEmail || "-")}</p>
        <p><b>Mobile:</b> ${escapeHtml(item.guestMobile || "-")}</p>
        <p><b>Country:</b> ${escapeHtml(item.guestCountry || "-")}</p>
        <p><b>Type:</b> ${escapeHtml(item.serviceType || "-")}</p>
        <p><b>Item:</b> ${escapeHtml(item.itemName || "-")}</p>
        <p><b>Dates:</b> ${escapeHtml(item.dateFrom || "-")} to ${escapeHtml(item.dateTo || "-")}</p>
        <p><b>Guests:</b> ${escapeHtml(item.guests || "-")}</p>

        <details>
          <summary>Message</summary>
          <pre>${escapeHtml(item.message || "-")}</pre>
        </details>
      </div>
    `;
  }).join("");
}

/* =========================
   STATUS UPDATE
========================= */

async function updateInquiryStatus(id, status) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries/${id}/status`, {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    const text = await res.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(text || "Invalid API response");
    }

    if (!res.ok) {
      throw new Error(data.error || "Failed to update status");
    }

    allInquiries = allInquiries.map(item =>
      String(item.id) === String(id) ? { ...item, status } : item
    );

    renderDashboardCards(allInquiries);
    renderInquiryTypeCards(allInquiries);
    renderMonthlyChart(allInquiries);
    renderInquiryStats(allInquiries);
    applyInquiryFilters();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

/* =========================
   CSV
========================= */

function exportInquiriesCSV() {
  if (!allInquiries.length) {
    alert("No inquiries to export");
    return;
  }

  const headers = [
    "Date",
    "Reference",
    "Name",
    "Email",
    "Mobile",
    "Country",
    "Type",
    "Item",
    "Date From",
    "Date To",
    "Guests",
    "Status",
    "Message"
  ];

  const rows = allInquiries.map(item => [
    formatDate(item.createdAt),
    item.reference || "",
    item.guestName || "",
    item.guestEmail || "",
    item.guestMobile || "",
    item.guestCountry || "",
    item.serviceType || "",
    item.itemName || "",
    item.dateFrom || "",
    item.dateTo || "",
    item.guests || "",
    item.status || "",
    item.message || ""
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "ceybreez-inquiries.csv";
  link.click();

  URL.revokeObjectURL(url);
}

/* =========================
   HELPERS
========================= */

function normalizeStatus(status) {
  return String(status || "new").toLowerCase();
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

function capitalize(text) {
  text = String(text || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   SAFE EMPTY FUNCTIONS
   old buttons error stop karanna
========================= */

function resetDestinationForm() {}
function resetPropertyForm() {}
function resetServiceForm() {}
function resetSectionForm() {}
function handleDragOver(e) { e.preventDefault(); }
function handleDragLeave(e) { e.preventDefault(); }
function handleDrop(e) { e.preventDefault(); }
function uploadPhotos() {}
function uploadServiceImage() {}
function uploadServicePhotos() {}
function handleServiceImageDrop(e) { e.preventDefault(); }
function handleServicePhotosDrop(e) { e.preventDefault(); }
function toggleGlobalSettings() {
  document.getElementById("siteContentForm")?.classList.toggle("hidden");
}
function toggleSectionBuilder() {
  document.getElementById("sectionBuilderBox")?.classList.toggle("hidden");
}
function addCardItem() {}
function uploadPageMedia() {}
function handlePageMediaDrop(e) { e.preventDefault(); }
function uploadSectionImage() {}
function handleSectionImageDrop(e) { e.preventDefault(); }
function uploadSectionVideo() {}
function handleSectionVideoDrop(e) { e.preventDefault(); }
function uploadSectionBackground() {}
function handleSectionBackgroundDrop(e) { e.preventDefault(); }
function loadPageSections() {}
function closeImagePreview() {
  document.getElementById("imagePreviewModal").style.display = "none";
}

/* =========================
   EVENTS
========================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inquirySearch")?.addEventListener("input", applyInquiryFilters);
  document.getElementById("inquiryStatusFilter")?.addEventListener("change", applyInquiryFilters);
});
