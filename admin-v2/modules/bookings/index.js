import { loadBookings, syncBookingsToAvailability } from "./api.js";
import { renderBookingList } from "./list.js";
import { renderBookingDetails } from "./details.js";
import { renderBookingCalendar } from "./calendar.js";
import { cancelBooking } from "./actions.js";
import { bookingType } from "./utils.js";
import {
  openManualBookingModal,
  openBlockDatesModal
} from "./modal.js";

const Bookings = {
  items: [],
  filtered: [],
  selectedId: null,
  activeTab: "property",

  async init() {
    await this.load();
    this.bindEvents();
  },

  async load() {
    try {
      this.items = await loadBookings();
    } catch (err) {
      console.error(err);
      this.items = [];
    }

    this.applyFilters();
  },

  bindEvents() {
    this.bindOnce("refreshBookingsBtn", "click", () => this.load());

    this.bindOnce("newManualBookingBtn", "click", () => {
      openManualBookingModal(this);
    });

    this.bindOnce("blockDatesBtn", "click", () => {
      openBlockDatesModal(this);
    });

    this.bindOnce("syncAvailabilityBtn", "click", async () => {
      await this.syncAvailability();
    });

    this.bindOnce("bookingSearch", "input", () => this.applyFilters());
    this.bindOnce("bookingStatusFilter", "change", () => this.applyFilters());
    this.bindOnce("bookingTypeFilter", "change", () => this.applyFilters());

    this.bindOnce("bookingResetFilter", "click", () => {
      this.setValue("bookingSearch", "");
      this.setValue("bookingStatusFilter", "");
      this.setValue("bookingTypeFilter", "");
      this.activeTab = "property";
      this.setActiveTabButton("property");
      this.applyFilters();
    });

    document.querySelectorAll("[data-booking-tab]").forEach(btn => {
      if (btn.dataset.bookingBound === "1") return;

      btn.dataset.bookingBound = "1";

      btn.addEventListener("click", () => {
        this.activeTab = btn.dataset.bookingTab;
        this.setActiveTabButton(this.activeTab);
        this.applyFilters();
      });
    });
  },

  applyFilters() {
    const search = this.getValue("bookingSearch").toLowerCase();
    const status = this.getValue("bookingStatusFilter").toLowerCase();
    const type = this.getValue("bookingTypeFilter");

    const effectiveType =
      this.activeTab === "calendar"
        ? type
        : type || this.activeTab;

    this.filtered = this.items.filter(item => {
      const text = `
        ${item.reference || ""}
        ${item.guestName || ""}
        ${item.guestEmail || ""}
        ${item.guestMobile || ""}
        ${item.itemName || ""}
        ${item.serviceType || ""}
      `.toLowerCase();

      const searchOk = !search || text.includes(search);

      const statusOk =
        !status ||
        String(item.status || "Booked").toLowerCase() === status;

      const typeOk =
        !effectiveType ||
        bookingType(item) === effectiveType;

      return searchOk && statusOk && typeOk;
    });

    if (this.activeTab === "calendar") {
      renderBookingCalendar(this);
      return;
    }

    if (
      this.selectedId &&
      !this.filtered.find(x => String(x.id) === String(this.selectedId))
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

  async syncAvailability() {
    if (!confirm("Sync all existing booked records to availability calendar?")) return;

    try {
      const result = await syncBookingsToAvailability();
      await this.load();

      alert(
        `Availability sync completed.\n\nInserted: ${result.inserted || 0}\nSkipped: ${result.skipped || 0}`
      );
    } catch (error) {
      alert(error.message);
    }
  },

  renderDetails(id) {
    this.selectedId = id;
    renderBookingDetails(this, id);
  },

  setActiveTabButton(tab) {
    document.querySelectorAll("[data-booking-tab]").forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.bookingTab === tab
      );
    });
  },

  bindOnce(id, event, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.dataset.bound === "1") return;

    el.dataset.bound = "1";
    el.addEventListener(event, handler);
  },

  getValue(id) {
    return document.getElementById(id)?.value || "";
  },

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  async refresh() {
    await this.load();
  },

  async cancelBooking(id) {
    await cancelBooking(this, id);
  }
};

export default Bookings;
