import { apiGet } from "../../utils/api.js";
import { renderStats } from "./stats.js";
import { renderList } from "./list.js";
import { renderDetails } from "./details.js";
import { applyFilters } from "./filters.js";
import { exportCSV } from "./export.js";

const Inquiries = {
  items: [],
  filtered: [],
  selectedId: null,
  notes: [],

  async init() {
    await this.load();
    this.bindEvents();
  },

  async load() {
    this.items = await this.safeLoad("/api/admin/inquiries");
    this.filtered = [...this.items];

    renderStats(this);
    applyFilters(this);

    if (!this.selectedId && this.filtered.length) this.selectedId = this.filtered[0].id;
    if (this.selectedId) await renderDetails(this, this.selectedId);
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
    this.bind("inquirySearch", "input", () => applyFilters(this));
    this.bind("inquiryStatusFilter", "change", () => applyFilters(this));
    this.bind("inquiryTypeFilter", "change", () => applyFilters(this));
    this.bind("exportInquiriesBtn", "click", () => exportCSV(this));
  },

  bind(id, event, handler) {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === "1") return;
    el.addEventListener(event, handler);
    el.dataset.bound = "1";
  },

  async select(id) {
    this.selectedId = id;
    renderList(this);
    await renderDetails(this, id);
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
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  },

  datePlusOne(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (isNaN(date.getTime())) return value;
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  },

  escape(value) {
    return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
};

export default Inquiries;