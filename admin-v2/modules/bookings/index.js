import { loadBookings } from "./api.js";
import { renderBookingList } from "./list.js";
import { renderBookingDetails } from "./details.js";
import { cancelBooking } from "./actions.js";

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

    this.filtered = [...this.items];

    renderBookingList(this);

    if (!this.selectedId && this.filtered.length) {
      this.selectedId = this.filtered[0].id;
    }

    if (this.selectedId) {
      renderBookingDetails(this, this.selectedId);
    }
  },

  bindEvents() {
    this.bindOnce("refreshBookingsBtn", "click", () => this.load());
  },

  bindOnce(id, event, handler) {
    const el = document.getElementById(id);

    if (!el) return;

    if (el.dataset.bound === "1") return;

    el.dataset.bound = "1";

    el.addEventListener(event, handler);
  },

  renderDetails(id) {
    renderBookingDetails(this, id);
  },

  async refresh() {
    await this.load();
  },

  async cancelBooking(id) {
    await cancelBooking(this, id);
  },

  search(keyword = "") {
    keyword = keyword.toLowerCase();

    this.filtered = this.items.filter(item => {

      const text = `
        ${item.reference || ""}
        ${item.guestName || ""}
        ${item.guestEmail || ""}
        ${item.guestMobile || ""}
        ${item.itemName || ""}
        ${item.serviceType || ""}
      `.toLowerCase();

      return text.includes(keyword);

    });

    renderBookingList(this);

    if (this.selectedId) {
      renderBookingDetails(this, this.selectedId);
    }
  },

  filterStatus(status = "") {

    if (!status) {

      this.filtered = [...this.items];

    } else {

      this.filtered = this.items.filter(item =>
        String(item.status || "").toLowerCase() ===
        status.toLowerCase()
      );

    }

    renderBookingList(this);

    if (this.selectedId) {
      renderBookingDetails(this, this.selectedId);
    }

  }

};

export default Bookings;
