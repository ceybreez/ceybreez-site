import { apiGet, apiPut, apiDelete, apiPost } from "../utils/api.js";

const Inquiries = {
  items: [],
  filtered: [],
  selectedId: null,

  async init() {
    await this.load();
    this.bindEvents();
  },

  async load() {
    this.items = await this.safeLoad("/api/admin/inquiries");
    this.filtered = [...this.items];

    this.renderStats();
    this.applyFilters();
  },

  async safeLoad(path) {
    try {
      const data = await apiGet(path);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  bindEvents() {
    this.bind("refreshInquiriesBtn", "click", () => this.load());
    this.bind("inquirySearch", "input", () => this.applyFilters());
    this.bind("inquiryStatusFilter", "change", () => this.applyFilters());
    this.bind("inquiryTypeFilter", "change", () => this.applyFilters());
    this.bind("exportInquiriesBtn", "click", () => this.exportCSV());
  },

  bind(id, event, handler) {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === "1") return;
    el.addEventListener(event, handler);
    el.dataset.bound = "1";
  },

  renderStats() {
    const box = document.getElementById("inquiryStats");
    if (!box) return;

    const count = status =>
      this.items.filter(x => this.status(x) === status.toLowerCase()).length;

    box.innerHTML = `
      <div class="mini-card"><span>Total</span><strong>${this.items.length}</strong></div>
      <div class="mini-card"><span>New</span><strong>${count("New")}</strong></div>
      <div class="mini-card"><span>Quoted</span><strong>${count("Quoted")}</strong></div>
      <div class="mini-card"><span>Booked</span><strong>${count("Booked")}</strong></div>
      <div class="mini-card"><span>Cancelled</span><strong>${count("Cancelled")}</strong></div>
    `;
  },

  applyFilters() {
    const search = (document.getElementById("inquirySearch")?.value || "").toLowerCase();
    const status = document.getElementById("inquiryStatusFilter")?.value || "";
    const type = document.getElementById("inquiryTypeFilter")?.value || "";

    this.filtered = this.items.filter(item => {
      const text = `
        ${item.reference || ""}
        ${item.guestName || ""}
        ${item.guestEmail || ""}
        ${item.guestMobile || ""}
        ${item.serviceType || ""}
        ${item.itemName || ""}
        ${item.message || ""}
      `.toLowerCase();

      const statusOk = !status || String(item.status || "New") === status;
      const typeOk = !type || this.type(item) === type;

      return statusOk && typeOk && (!search || text.includes(search));
    });

    this.renderList();
  },

  renderList() {
    const box = document.getElementById("inquiriesList");
    if (!box) return;

    if (!this.filtered.length) {
      box.innerHTML = `<div class="empty-state">No inquiries found.</div>`;
      return;
    }

    box.innerHTML = `
      <div class="inquiry-pro-layout">
        <div class="inquiry-list-panel">
          ${this.filtered.map(item => this.listItemHtml(item)).join("")}
        </div>

        <div id="inquiryDetailPanel" class="inquiry-detail-panel">
          <div class="empty-state">Select an inquiry to view details.</div>
        </div>
      </div>
    `;

    box.querySelectorAll("[data-inquiry-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedId = btn.dataset.inquiryId;
        this.renderDetails(this.selectedId);
      });
    });

    if (this.selectedId) {
      this.renderDetails(this.selectedId);
    }
  },

  listItemHtml(item) {
    return `
      <button class="inquiry-list-item" data-inquiry-id="${this.escape(item.id)}">
        <div>
          <strong>${this.escape(item.reference || item.id || "-")}</strong>
          <span>${this.escape(item.guestName || "Guest")}</span>
          <small>${this.escape(item.itemName || item.serviceType || "-")}</small>
        </div>

        <div class="inquiry-list-side">
          <span class="badge ${this.badgeClass(item.status)}">
            ${this.escape(item.status || "New")}
          </span>
          <small>${this.formatDate(item.createdAt || item.created_at || item.dateFrom)}</small>
        </div>
      </button>
    `;
  },

  renderDetails(id) {
    const item = this.items.find(x => String(x.id) === String(id));
    const box = document.getElementById("inquiryDetailPanel");
    if (!item || !box) return;

    box.innerHTML = `
      <div class="detail-head">
        <div>
          <h3>${this.escape(item.reference || item.id || "-")}</h3>
          <p>${this.escape(this.type(item).toUpperCase())} Inquiry</p>
        </div>
        <span class="badge ${this.badgeClass(item.status)}">
          ${this.escape(item.status || "New")}
        </span>
      </div>

      <div class="detail-section">
        <h4>Guest Details</h4>
        <p><b>Name:</b> ${this.escape(item.guestName || "-")}</p>
        <p><b>Email:</b> ${this.escape(item.guestEmail || "-")}</p>
        <p><b>Mobile:</b> ${this.escape(item.guestMobile || "-")}</p>
        <p><b>Country:</b> ${this.escape(item.guestCountry || "-")}</p>
      </div>

      <div class="detail-section">
        <h4>Inquiry Details</h4>
        <p><b>Service:</b> ${this.escape(item.serviceType || "-")}</p>
        <p><b>Selected:</b> ${this.escape(item.itemName || "-")}</p>
        <p><b>Guests:</b> ${this.escape(item.guests || "-")}</p>
        <p><b>Dates:</b> ${this.escape(item.dateFrom || "-")} → ${this.escape(item.dateTo || "-")}</p>
      </div>

      <div class="detail-section">
        <h4>Message</h4>
        <div class="message-box">${this.escape(item.message || "No message")}</div>
      </div>

      <div class="detail-section">
        <h4>Status</h4>
        <select id="detailStatusSelect">
          ${["New", "Contacted", "Quoted", "Guest Confirmed", "Admin Confirmed", "Booked", "Cancelled", "Closed"]
            .map(s => `<option value="${s}" ${String(item.status || "New") === s ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>

        <button class="primary-btn mt-2" id="updateDetailStatusBtn">Update Status</button>
      </div>

      <div class="detail-actions">
        <button class="secondary-btn" id="detailWhatsappBtn">WhatsApp</button>
        <button class="secondary-btn" id="detailEmailBtn">Email</button>
        <button class="primary-btn" id="detailConfirmBookingBtn">Confirm Booking</button>
        <button class="secondary-btn" id="detailCopyBtn">Copy</button>
        <button class="small-btn danger" id="detailDeleteBtn">Delete</button>
      </div>
    `;

    document.getElementById("updateDetailStatusBtn")?.addEventListener("click", () => {
      const status = document.getElementById("detailStatusSelect")?.value || "New";
      this.updateStatus(item.id, status);
    });

    document.getElementById("detailWhatsappBtn")?.addEventListener("click", () => this.openWhatsApp(item));
    document.getElementById("detailEmailBtn")?.addEventListener("click", () => this.emailGuest(item));
    document.getElementById("detailCopyBtn")?.addEventListener("click", () => this.copyItem(item));
    document.getElementById("detailDeleteBtn")?.addEventListener("click", () => this.deleteItem(item.id));
    document.getElementById("detailConfirmBookingBtn")?.addEventListener("click", () => this.confirmBooking(item));
  },

  async updateStatus(id, status) {
    try {
      await apiPut(`/api/admin/inquiries/${id}/status`, {
        status,
        sendEmail: false
      });

      await this.load();
      this.selectedId = id;
      this.renderDetails(id);
      alert("Inquiry status updated");
    } catch (error) {
      alert(error.message);
    }
  },

  async confirmBooking(item) {
    if (!confirm("Confirm this inquiry as booking?")) return;

    try {
      await apiPost("/api/admin/bookings", {
        inquiryId: item.id,
        reference: item.reference || item.id,
        itemName: item.itemName || item.serviceType || "CeyBreez Booking",
        serviceType: item.serviceType || "Property Inquiry",
        guestName: item.guestName || "",
        guestEmail: item.guestEmail || "",
        guestMobile: item.guestMobile || "",
        dateFrom: item.dateFrom || "",
        dateTo: item.dateTo || item.dateFrom || "",
        guests: item.guests || "",
        sendEmail: true
      });

      await this.load();
      alert("Booking confirmed");
    } catch (error) {
      alert(error.message);
    }
  },

  async deleteItem(id) {
    if (!confirm("Delete this inquiry?")) return;

    try {
      await apiDelete(`/api/admin/inquiries/${id}`);
      this.selectedId = null;
      await this.load();
      alert("Inquiry deleted");
    } catch (error) {
      alert(error.message);
    }
  },

  openWhatsApp(item) {
    const phone = String(item.guestMobile || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(
`Hello ${item.guestName || ""},

Thank you for contacting CeyBreez.

Reference: ${item.reference || item.id || ""}

We will contact you shortly.

Best Regards,
CeyBreez`
    );

    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  },

  emailGuest(item) {
    if (!item.guestEmail) {
      alert("Guest email not available");
      return;
    }

    window.location.href = `mailto:${item.guestEmail}?subject=CeyBreez Inquiry ${item.reference || ""}`;
  },

  copyItem(item) {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
    alert("Inquiry copied");
  },

  exportCSV() {
    if (!this.items.length) {
      alert("No inquiries to export");
      return;
    }

    const rows = this.items.map(x => ({
      Reference: x.reference || "",
      Status: x.status || "",
      Type: this.type(x),
      Service: x.serviceType || "",
      Item: x.itemName || "",
      Guest: x.guestName || "",
      Email: x.guestEmail || "",
      Mobile: x.guestMobile || "",
      Country: x.guestCountry || "",
      Guests: x.guests || "",
      DateFrom: x.dateFrom || "",
      DateTo: x.dateTo || "",
      CreatedAt: x.createdAt || x.created_at || ""
    }));

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map(row => headers.map(h => `"${String(row[h]).replaceAll('"', '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ceybreez-inquiries.csv";
    a.click();
  },

  type(item) {
    const text = `${item.serviceType || ""} ${item.itemName || ""} ${item.message || ""}`.toLowerCase();

    if (text.includes("tour") || text.includes("trip") || text.includes("safari")) return "tour";
    if (text.includes("service") || text.includes("cafe") || text.includes("restaurant") || text.includes("contact")) return "service";

    return "property";
  },

  status(item) {
    return String(item.status || "New").toLowerCase();
  },

  badgeClass(status) {
    const s = String(status || "").toLowerCase();

    if (s.includes("booked") || s.includes("confirmed")) return "badge-booked";
    if (s.includes("quoted")) return "badge-quoted";
    if (s.includes("cancel") || s.includes("closed")) return "badge-cancelled";

    return "badge-new";
  },

  formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },

  escape(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
};

export default Inquiries;
