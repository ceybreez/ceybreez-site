import { loadReports, reportsCsvUrl } from "./api.js";
import { renderReports, renderReportsError, readReportFilters } from "./render.js";

let reportState = null;

function byId(id) {
  return document.getElementById(id);
}

function bindReportsEvents() {
  byId("reportTypeFilter")?.addEventListener("change", () => window.renderReportsModule());
  byId("reportStatusFilter")?.addEventListener("change", () => window.renderReportsModule());
  byId("reportDateFrom")?.addEventListener("change", () => window.renderReportsModule());
  byId("reportDateTo")?.addEventListener("change", () => window.renderReportsModule());
}

export function initReportsModule() {
  window.renderReportsModule = async function renderReportsModule() {
    const root = byId("reportsModuleRoot") || byId("reportsTab");
    if (!root) return;

    const filters = readReportFilters();
    root.innerHTML = `<div class="section-head"><div><h2>Reports</h2><p>Loading revenue, occupancy and performance reports...</p></div></div>`;

    try {
      reportState = await loadReports(filters);
      renderReports(root, reportState, filters);
      bindReportsEvents();
    } catch (error) {
      renderReportsError(root, error.message || "Reports load failed");
    }
  };

  window.renderReports = window.renderReportsModule;

  window.exportReportsCSV = function exportReportsCSV() {
    window.open(reportsCsvUrl(readReportFilters()), "_blank");
  };

  window.exportReportCSV = window.exportReportsCSV;

  const active = document.querySelector(".v14-nav button.active")?.dataset?.v14Tab;
  if (active === "reports") window.renderReportsModule();
}
