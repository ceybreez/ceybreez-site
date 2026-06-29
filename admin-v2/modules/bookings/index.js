import { loadBookings } from "./api.js";
import { renderBookingList } from "./list.js";
import { renderBookingDetails } from "./details.js";
import { cancelBooking } from "./actions.js";
import { bookingType } from "./utils.js";

const Bookings = {
  items: [],
  filtered: [],
  selectedId: null,

  async init() {
    await this.load();
    this.bindEvents();
  },

  async load() {
    try {
      this.items = await loadBookings();
    } catch (error) {
      console.error(error);
      this.items = [];
    }

    this.applyFilters();
  },

  bindEvents() {
    this.bindOnce("refreshBookingsBtn", "click", () => this.load());

    this.bindOnce("bookingSearch", "input", () => this.applyFilters());
    this.bindOnce("bookingStatusFilter", "change", () => this.applyFilters());
    this.bindOnce("bookingTypeFilter", "change", () => this.applyFilters());

    this.bindOnce("bookingResetFilter", "click", () => {
      this.setValue("bookingSearch", "");
      this.setValue("bookingStatusFilter", "");
      this.setValue("bookingTypeFilter", "");
      this.applyFilters();
    });
  },

  bindOnce(id, event, handler) {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === "1") return;

    el.dataset.bound = "1";
    el.addEventListener(event, handler);
  },

  applyFilters() {
    const search = this.getValue("bookingSearch").toLowerCase();
    const status = this.getValue("bookingStatusFilter").toLowerCase();
    const type = this.getValue("bookingTypeFilter");

    this.filtered = this.items.filter(item => {
      const text = `
        ${item.reference || ""}
        ${item.guestName || ""}
        ${item.guestEmail || ""}
        ${item.guestMobile || ""}
        ${item.itemName || ""}
        ${item.serviceType || ""}
        ${item.paymentStatus || ""}
        ${item.dateFrom || ""}
        ${item.dateTo || ""}
      `.toLowerCase();

      const searchOk = !search || text.includes(search);
      const statusOk =
        !status ||
        String(item.status || "Booked").toLowerCase() === status;

      const typeOk =
        !type ||
        bookingType(item) === type;

      return searchOk && statusOk && typeOk;
    });

    if (
      this.selectedId &&
      !this.filtered.some(item => String(item.id) === String(this.selectedId))
    ) {
      this.selectedId = null;
    }

    if (!this.selectedId && this.filtered.length) {
      this.selectedId = this.filtered[0].id;
    }

    renderBookingList(this);

    if (this.selectedId) {
      renderBookingDetails(this, this.selectedId);
    }
  },

  renderDetails(id) {
    this.selectedId = id;
    renderBookingDetails(this, id);
  },

  async refresh() {
    await this.load();
  },

  async cancelBooking(id) {
    await cancelBooking(this, id);
  },

  getValue(id) {
    return document.getElementById(id)?.value || "";
  },

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }
};

export default Bookings;
