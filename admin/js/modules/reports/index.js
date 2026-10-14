import { loadReports, loadTourCostings, loadReportProperties } from "./api.js";
import { renderReports, renderReportsError, readReportFilters, normalizeReportState, buildReportsCsv } from "./render.js";

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

function downloadCsv(text, fileName) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function initReportsModule() {
  window.renderReportsModule = async function renderReportsModule() {
    const root = byId("reportsModuleRoot") || byId("reportsTab");
    if (!root) return;

    const filters = readReportFilters();
    root.innerHTML = `<div class="section-head"><div><h2>Reports</h2><p>Loading revenue, occupancy and performance reports...</p></div></div>`;

    try {
      const [baseResult, costingResult, propertiesResult] = await Promise.allSettled([
        loadReports(filters),
        loadTourCostings(),
        loadReportProperties()
      ]);

      if (baseResult.status !== "fulfilled") throw baseResult.reason;

      const warnings = [];
      const costings = costingResult.status === "fulfilled" && Array.isArray(costingResult.value)
        ? costingResult.value
        : [];
      const properties = propertiesResult.status === "fulfilled" && Array.isArray(propertiesResult.value)
        ? propertiesResult.value
        : [];

      if (costingResult.status !== "fulfilled") {
        warnings.push("Tour costing duration data could not be loaded; tour accommodation nights are shown as unavailable where no safe value exists.");
      }
      if (propertiesResult.status !== "fulfilled") {
        warnings.push("Property catalogue could not be loaded; property occupancy uses the report API active-property count as a fallback.");
      }

      reportState = normalizeReportState(baseResult.value, filters, costings, properties, warnings);
      renderReports(root, reportState, filters);
      bindReportsEvents();
    } catch (error) {
      renderReportsError(root, error.message || "Reports load failed");
    }
  };

  window.renderReports = window.renderReportsModule;

  window.exportReportsCSV = function exportReportsCSV() {
    try {
      if (!reportState) throw new Error("Run the report before exporting CSV.");
      const csv = buildReportsCsv(reportState);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `ceybreez-reports-${date}.csv`);
    } catch (error) {
      alert(error.message || "Report export failed");
    }
  };

  window.exportReportCSV = window.exportReportsCSV;

  const active = document.querySelector(".v14-nav button.active")?.dataset?.v14Tab;
  if (active === "reports") window.renderReportsModule();
}
