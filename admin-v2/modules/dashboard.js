import { apiGet } from "../utils/api.js";

const Dashboard = {
  async init() {
    await this.loadDashboard();
  },

  async loadDashboard() {
    const [inquiries, bookings] = await Promise.all([
      this.safeLoad("/api/admin/inquiries"),
      this.safeLoad("/api/admin/bookings")
    ]);

    this.renderStats(inquiries, bookings);
    this.renderRecentActivity(inquiries, bookings);
    this.renderRevenueChart(bookings);
  },

  async safeLoad(path) {
    try {
      const data = await apiGet(path);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`${path} failed`, error);
      return [];
    }
  },

  renderStats(inquiries, bookings) {
    const today = this.today();
    const bookedBookings = bookings.filter(b => this.status(b) === "booked");
    const todayArrivals = bookedBookings.filter(b => b.dateFrom === today).length;
    const pendingPayments = bookings.filter(b => !String(b.paymentStatus || "Pending").toLowerCase().includes("paid")).length;
    const monthlyRevenue = bookings.reduce((sum, b) => {
      if (!this.isThisMonth(b.createdAt || b.created_at || b.dateFrom)) return sum;
      return sum + this.moneyNumber(b.totalAmount || b.quoteTotalAmount);
    }, 0);
    const occupancy = this.calculateOccupancy(bookedBookings);

    this.setText("statRevenue", `OMR ${monthlyRevenue.toFixed(3)}`);
    this.setText("statOccupancy", `${occupancy}%`);
    this.setText("statArrivals", todayArrivals);
    this.setText("statPendingPayments", pendingPayments);

    const newInquiries = inquiries.filter(i => this.status(i) === "new").length;
    this.setText("notificationCount", newInquiries);
    this.setText("inquiryBadge", newInquiries);
  },

  renderRecentActivity(inquiries, bookings) {
    const box = document.getElementById("recentActivity");
    if (!box) return;

    const activity = [
      ...inquiries.map(i => ({
        type: "Inquiry", reference: i.reference || i.id || "-", guest: i.guestName || i.name || "Guest",
        item: i.itemName || i.serviceType || "CeyBreez Inquiry", status: i.status || "New",
        date: i.createdAt || i.created_at || i.dateFrom || ""
      })),
      ...bookings.map(b => ({
        type: "Booking", reference: b.reference || b.id || "-", guest: b.guestName || "Guest",
        item: b.itemName || b.serviceType || "CeyBreez Booking", status: b.status || "Booked",
        date: b.createdAt || b.created_at || b.dateFrom || ""
      }))
    ].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);

    if (!activity.length) {
      box.innerHTML = `<p class="empty-text">No recent activity found.</p>`;
      return;
    }

    box.innerHTML = activity.map(item => `
      <div class="activity-item">
        <div>
          <strong>${this.escape(item.reference)}</strong>
          <div class="text-soft">${this.escape(item.guest)} · ${this.escape(item.item)}</div>
          <small class="text-soft">${this.escape(item.type)} · ${this.formatDate(item.date)}</small>
        </div>
        <span class="badge ${this.badgeClass(item.status)}">${this.escape(item.status)}</span>
      </div>
    `).join("");
  },

  renderRevenueChart(bookings) {
    const box = document.getElementById("revenueChart");
    if (!box) return;
    const months = {};
    bookings.forEach(b => {
      const date = String(b.createdAt || b.created_at || b.dateFrom || "").slice(0, 7);
      if (!date) return;
      months[date] = (months[date] || 0) + this.moneyNumber(b.totalAmount || b.quoteTotalAmount);
    });
    const rows = Object.entries(months).sort().slice(-6);
    if (!rows.length) { box.innerHTML = "No revenue data yet"; return; }
    const max = Math.max(...rows.map(x => x[1]), 1);
    box.innerHTML = `<div class="chart-bars">${rows.map(([month, amount]) => `
      <div class="chart-row"><span>${this.escape(month)}</span><div class="bar-wrap"><div class="bar" style="width:${(amount / max) * 100}%"></div></div><strong>OMR ${amount.toFixed(3)}</strong></div>
    `).join("")}</div>`;
  },

  calculateOccupancy(bookings) {
    const today = this.today();
    const active = bookings.filter(b => b.dateFrom && b.dateTo && b.dateFrom <= today && b.dateTo > today).length;
    const uniqueItems = new Set(bookings.map(b => String(b.itemName || "").trim()).filter(Boolean)).size;
    if (!uniqueItems) return 0;
    return Math.round((active / uniqueItems) * 100);
  },

  status(item) { return String(item.status || "New").toLowerCase(); },
  today() { return new Date().toISOString().slice(0, 10); },
  isThisMonth(value) { return !!value && String(value).slice(0, 7) === new Date().toISOString().slice(0, 7); },
  moneyNumber(value) { return Number(String(value || "0").replace(/[^\d.]/g, "")) || 0; },
  formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  },
  badgeClass(status) {
    const s = String(status || "").toLowerCase();
    if (s.includes("booked") || s.includes("paid") || s.includes("confirmed")) return "badge-booked";
    if (s.includes("quoted")) return "badge-quoted";
    if (s.includes("cancel") || s.includes("closed")) return "badge-cancelled";
    return "badge-new";
  },
  setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; },
  escape(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
};

export default Dashboard;