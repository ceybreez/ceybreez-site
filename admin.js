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

/* =========================
   LOAD INQUIRIES
========================= */

async function loadInquiries() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/inquiries`, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Failed to load inquiries");

    allInquiries = data || [];

    renderDashboardCards(allInquiries);
    renderInquiryTypeCards(allInquiries);
    renderMonthlyChart(allInquiries);
    renderInquiryStats(allInquiries);
    renderInquiryTable(allInquiries);
    renderInquiriesList(allInquiries);
    applyInquiryFilters();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

/* =========================
   DASHBOARD SUMMARY CARDS
========================= */

function renderDashboardCards(inquiries) {
  const box = document.getElementById("inquiryCards");
  if (!box) return;

  const total = inquiries.length;
  const newCount = inquiries.filter(i => (i.status || "new") === "new").length;
  const contacted = inquiries.filter(i => i.status === "contacted").length;
  const confirmed = inquiries.filter(i => i.status === "confirmed").length;

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
    const type = item.type || "Other";
    types[type] = (types[type] || 0) + 1;
  });

  box.innerHTML = Object.entries(types).map(([type, count]) => `
    <div class="dashboard-card type-card">
      <h3>${capitalize(type)}</h3>
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
    const date = new Date(item.created_at || item.date || Date.now());
    const key = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    months[key] = (months[key] || 0) + 1;
  });

  const maxValue = Math.max(...Object.values(months), 1);

  box.innerHTML = `
    <h2>Monthly Inquiries</h2>
    <div class="chart-bars">
      ${Object.entries(months).map(([month, count]) => `
        <div class="chart-row">
          <span>${month}</span>
          <div class="bar-bg">
            <div class="bar-fill" style="width:${(count / maxValue) * 100}%"></div>
          </div>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   INQUIRY STATS
========================= */

function renderInquiryStats(inquiries) {
  const box = document.getElementById("inquiryStats");
  if (!box) return;

  const today = new Date().toDateString();

  const todayCount = inquiries.filter(item => {
    const d = new Date(item.created_at || item.date);
    return d.toDateString() === today;
  }).length;

  box.innerHTML = `
    <div class="stat-item">
      <span>Today</span>
      <strong>${todayCount}</strong>
    </div>

    <div class="stat-item">
      <span>Total</span>
      <strong>${inquiries.length}</strong>
    </div>
  `;
}

/* =========================
   INQUIRY TABLE
========================= */

function renderInquiryTable(inquiries) {
  const tbody = document.getElementById("inquiryTableBody");
  if (!tbody) return;

  if (!inquiries || inquiries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-row">No inquiries found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = inquiries.map(item => {
    const status = item.status || "new";

    return `
      <tr>
        <td>${formatDate(item.created_at || item.date)}</td>

        <td>
          <strong>${item.name || "-"}</strong><br>
          <small>${item.email || ""}</small><br>
          <small>${item.phone || ""}</small>
        </td>

        <td>${capitalize(item.type || "-")}</td>

        <td>
          ${item.property_name || item.tour_name || item.title || item.experience || "-"}
        </td>

        <td>${item.check_in || item.checkin || item.date || "-"}</td>

        <td>${item.guests || item.guest_count || "-"}</td>

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
   OLD CARD LIST SUPPORT
========================= */

function renderInquiriesList(inquiries) {
  const list = document.getElementById("inquiriesList");
  if (!list) return;

  list.innerHTML = inquiries.map(item => `
    <div class="inquiry-card">
      <h3>${item.name || "Guest"}</h3>
      <p><b>Email:</b> ${item.email || "-"}</p>
      <p><b>Phone:</b> ${item.phone || "-"}</p>
      <p><b>Type:</b> ${item.type || "-"}</p>
      <p><b>Message:</b> ${item.message || "-"}</p>
    </div>
  `).join("");
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
      (item.name || "").toLowerCase().includes(search) ||
      (item.email || "").toLowerCase().includes(search) ||
      (item.phone || "").toLowerCase().includes(search) ||
      (item.property_name || "").toLowerCase().includes(search) ||
      (item.tour_name || "").toLowerCase().includes(search) ||
      (item.title || "").toLowerCase().includes(search) ||
      (item.type || "").toLowerCase().includes(search)
    );
  }

  if (status !== "all") {
    filtered = filtered.filter(item => (item.status || "new") === status);
  }

  renderInquiryTable(filtered);
  renderInquiriesList(filtered);
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

    const data = await res.json();

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
   EXPORT CSV
========================= */

function exportInquiriesCSV() {
  if (!allInquiries || allInquiries.length === 0) {
    alert("No inquiries to export");
    return;
  }

  const headers = [
    "Date",
    "Name",
    "Email",
    "Phone",
    "Type",
    "Property/Tour",
    "Check In",
    "Guests",
    "Status",
    "Message"
  ];

  const rows = allInquiries.map(item => [
    formatDate(item.created_at || item.date),
    item.name || "",
    item.email || "",
    item.phone || "",
    item.type || "",
    item.property_name || item.tour_name || item.title || "",
    item.check_in || item.checkin || item.date || "",
    item.guests || item.guest_count || "",
    item.status || "new",
    item.message || ""
  ]);

  const csvContent = [
    headers,
    ...rows
  ].map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

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
  if (!text) return "";
  return String(text).charAt(0).toUpperCase() + String(text).slice(1);
}

/* =========================
   EVENTS
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadInquiries();

  document.getElementById("inquirySearch")?.addEventListener("input", applyInquiryFilters);
  document.getElementById("inquiryStatusFilter")?.addEventListener("change", applyInquiryFilters);
});
function loginAdmin() {
  const token = document.getElementById("adminToken").value;

  if (!token) {
    alert("Enter Admin Token");
    return;
  }

  localStorage.setItem("adminToken", token);

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  loadInquiries();
}

function logoutAdmin() {
  localStorage.removeItem("adminToken");
  location.reload();
}
