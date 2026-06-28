import Dashboard from "./modules/dashboard.js";
import Inquiries from "./modules/inquiries/index.js";
import Bookings from "./modules/bookings/index.js";

const TOKEN_KEY = "CEYBREEZ_ADMIN_TOKEN";

const modules = {
  dashboard: Dashboard,
  inquiries: Inquiries,
  bookings: Bookings
};

const moduleTitles = {
  dashboard: ["Dashboard", "CeyBreez professional management overview"],
  inquiries: ["Inquiry Management", "Property, tour and service inquiry workflow"],
  bookings: ["Booking Management", "Bookings, calendar, availability and payments"],
  properties: ["Properties CMS", "Manage villas, apartments and homestays"],
  tours: ["Tours CMS", "Manage tours and destinations"],
  services: ["Services CMS", "Manage CeyBreez services"],
  reviews: ["Reviews", "Guest reviews and approval"],
  reports: ["Reports", "Revenue, occupancy and performance reports"],
  finance: ["Finance", "Invoices, receipts, expenses and cash flow"],
  settings: ["Settings", "Company, templates, users and system settings"]
};

const loginBox = document.getElementById("loginBox");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const tokenInput = document.getElementById("adminTokenInput");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const toastArea = document.getElementById("toastArea");

document.addEventListener("DOMContentLoaded", initAdmin);

function initAdmin() {
  localStorage.getItem(TOKEN_KEY) ? showAdmin() : showLogin();
  setupLogin();
  setupLogout();
  setupNavigation();
  setupMobileMenu();
  setupButtons();
}

function setupLogin() {
  if (!loginForm) return;
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const token = tokenInput.value.trim();
    if (!token) {
      loginError.textContent = "Please enter admin token.";
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
    loginError.textContent = "";
    showAdmin();
    showToast("Login successful", "success");
  });
}

function setupLogout() {
  if (!logoutBtn) return;
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
    showToast("Logged out", "info");
  });
}

function showLogin() {
  loginBox.classList.remove("hidden");
  adminApp.classList.add("hidden");
}

function showAdmin() {
  loginBox.classList.add("hidden");
  adminApp.classList.remove("hidden");
  switchModule("dashboard");
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const moduleName = btn.dataset.module;
      if (!moduleName) return;
      switchModule(moduleName);
      if (window.innerWidth <= 920) sidebar.classList.remove("open");
    });
  });
}

async function switchModule(moduleName) {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.module === moduleName);
  });

  document.querySelectorAll(".module").forEach((module) => {
    module.classList.remove("active-module");
  });

  const target = document.getElementById(`${moduleName}Module`);
  if (target) target.classList.add("active-module");

  const titleData = moduleTitles[moduleName] || ["CeyBreez", "Admin module"];
  pageTitle.textContent = titleData[0];
  pageSubtitle.textContent = titleData[1];

  const controller = modules[moduleName];
  if (controller && typeof controller.init === "function") {
    try {
      await controller.init();
    } catch (error) {
      console.error(error);
      showToast(`${titleData[0]} load failed`, "error");
    }
  }
}

function setupMobileMenu() {
  if (!menuToggle || !sidebar) return;
  menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", (event) => {
    const insideSidebar = sidebar.contains(event.target);
    const clickedMenu = menuToggle.contains(event.target);
    if (!insideSidebar && !clickedMenu && window.innerWidth <= 920) sidebar.classList.remove("open");
  });
}

function setupButtons() {
  bindButton("refreshBookingsBtn", () => showToast("Booking module connection coming next.", "info"));
  bindButton("addPropertyBtn", () => showToast("Property form will be connected in CMS module.", "info"));
  bindButton("addTourBtn", () => showToast("Tour form will be connected in Tours module.", "info"));
  bindButton("addServiceBtn", () => showToast("Service form will be connected in Services module.", "info"));

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
      btn.classList.add("active");
      showToast(`${capitalize(btn.dataset.bookingTab || "booking")} tab selected`, "info");
    });
  });
}

function bindButton(id, callback) {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener("click", callback);
}

export function showToast(message, type = "info") {
  if (!toastArea) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastArea.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function capitalize(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
