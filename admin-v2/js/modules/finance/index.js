import { fetchFinanceBookings, saveBookingFinance } from "./api.js";
import { renderFinanceDetails, renderFinanceStats, renderFinanceTable, normalizeFinanceNumber, getBookingFinanceModel } from "./render.js";

let financeBookings = [];
let selectedFinanceBookingId = null;
let financeReady = false;

function getFinanceElements() {
  return {
    tab: document.getElementById("financeTab"),
    stats: document.getElementById("financeStats"),
    tbody: document.getElementById("financeTableBody"),
    details: document.getElementById("financeDetailsBox"),
    search: document.getElementById("financeSearch"),
    status: document.getElementById("financeStatusFilter"),
    method: document.getElementById("financeMethodFilter"),
    refresh: document.getElementById("financeRefreshBtn"),
    exportBtn: document.getElementById("financeExportBtn")
  };
}

function filterFinanceBookings() {
  const els = getFinanceElements();
  const search = String(els.search?.value || "").trim().toLowerCase();
  const status = String(els.status?.value || "all");
  const method = String(els.method?.value || "all");

  return financeBookings.filter(booking => {
    const model = getBookingFinanceModel(booking);
    const searchText = `${model.reference} ${model.itemName} ${model.serviceType} ${model.guestName} ${model.guestEmail} ${model.guestMobile}`.toLowerCase();
    const statusMatch = status === "all" || model.paymentStatus === status;
    const methodMatch = method === "all" || model.paymentMethod === method;
    return statusMatch && methodMatch && (!search || searchText.includes(search));
  });
}

function renderFinance() {
  const els = getFinanceElements();
  const filtered = filterFinanceBookings();

  renderFinanceStats(filtered, els.stats);
  renderFinanceTable(filtered, els.tbody);

  const selected = financeBookings.find(item => String(item.id) === String(selectedFinanceBookingId));
  renderFinanceDetails(selected || null, els.details);
  attachFinanceRowEvents();
  attachFinanceFormEvents();
}

function attachFinanceRowEvents() {
  document.querySelectorAll("[data-finance-booking-id]").forEach(row => {
    row.addEventListener("click", event => {
      const id = event.currentTarget.getAttribute("data-finance-booking-id");
      selectedFinanceBookingId = id;
      renderFinance();
      document.getElementById("financeDetailsBox")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  document.querySelectorAll("[data-finance-edit-id]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      selectedFinanceBookingId = event.currentTarget.getAttribute("data-finance-edit-id");
      renderFinance();
      document.getElementById("financeDetailsBox")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function attachFinanceFormEvents() {
  const form = document.getElementById("financeForm");
  if (!form || form.dataset.financeReady === "1") return;
  form.dataset.financeReady = "1";

  ["financeTotalAmount", "financeAdvanceAmount"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateFinanceBalance);
  });

  form.addEventListener("submit", saveFinanceForm);
}

function updateFinanceBalance() {
  const total = normalizeFinanceNumber(document.getElementById("financeTotalAmount")?.value);
  const advance = normalizeFinanceNumber(document.getElementById("financeAdvanceAmount")?.value);
  const balance = document.getElementById("financeBalanceAmount");
  if (balance) balance.value = Math.max(total - advance, 0).toFixed(2);
}

async function loadFinance() {
  const els = getFinanceElements();
  if (!els.tab) return;

  if (els.tbody) {
    els.tbody.innerHTML = `<tr><td colspan="10" class="empty-row">Loading finance records...</td></tr>`;
  }

  try {
    financeBookings = await fetchFinanceBookings();
    renderFinance();
  } catch (error) {
    if (els.tbody) {
      els.tbody.innerHTML = `<tr><td colspan="10" class="empty-row">${String(error.message || error)}</td></tr>`;
    }
  }
}

async function saveFinanceForm(event) {
  event.preventDefault();

  const bookingId = document.getElementById("financeBookingId")?.value;
  if (!bookingId) {
    alert("Please select a booking first.");
    return;
  }

  const payload = {
    currency: document.getElementById("financeCurrency")?.value || "USD",
    totalAmount: document.getElementById("financeTotalAmount")?.value || "",
    advanceAmount: document.getElementById("financeAdvanceAmount")?.value || "",
    balanceAmount: document.getElementById("financeBalanceAmount")?.value || "",
    refundAmount: document.getElementById("financeRefundAmount")?.value || "",
    paymentStatus: document.getElementById("financePaymentStatus")?.value || "Pending",
    paymentMethod: document.getElementById("financePaymentMethod")?.value || "",
    paidDate: document.getElementById("financePaidDate")?.value || "",
    financeNotes: document.getElementById("financeNotes")?.value || ""
  };

  try {
    await saveBookingFinance(bookingId, payload);
    alert("Finance details saved");
    await loadFinance();

    if (typeof window.loadBookings === "function") {
      window.loadBookings().catch(console.error);
    }
  } catch (error) {
    alert(error.message || "Finance save failed");
  }
}

function exportFinanceCsv() {
  const rows = filterFinanceBookings().map(booking => {
    const item = getBookingFinanceModel(booking);
    return {
      Reference: item.reference,
      BookingDate: String(item.createdAt).slice(0, 10),
      Type: item.serviceType,
      Item: item.itemName,
      Guest: item.guestName,
      Email: item.guestEmail,
      Mobile: item.guestMobile,
      Currency: item.currency,
      TotalAmount: item.totalAmount,
      AdvanceReceived: item.advanceAmount,
      Balance: item.balanceAmount,
      RefundAmount: item.refundAmount,
      PaymentStatus: item.paymentStatus,
      PaymentMethod: item.paymentMethod,
      PaidDate: item.paidDate,
      FinanceNotes: item.financeNotes
    };
  });

  if (!rows.length) {
    alert("No finance records to export");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(header => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ceybreez-finance-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function attachFinanceTabRouter() {
  const originalShowTab = window.showTab;
  if (typeof originalShowTab !== "function" || originalShowTab.dataset?.financeWrapped === "1") return;

  const wrapped = function(tab) {
    document.getElementById("financeTab")?.classList.add("hidden");

    if (tab === "financeTab" || tab === "finance") {
      originalShowTab("financeTab");
      document.getElementById("financeTab")?.classList.remove("hidden");
      loadFinance();
      return;
    }

    originalShowTab(tab);
  };

  wrapped.dataset = { financeWrapped: "1" };
  window.showTab = wrapped;
}

export function initFinanceModule() {
  if (financeReady) return;
  financeReady = true;

  const els = getFinanceElements();
  if (!els.tab) return;

  attachFinanceTabRouter();

  els.search?.addEventListener("input", renderFinance);
  els.status?.addEventListener("change", renderFinance);
  els.method?.addEventListener("change", renderFinance);
  els.refresh?.addEventListener("click", loadFinance);
  els.exportBtn?.addEventListener("click", exportFinanceCsv);

  renderFinanceDetails(null, els.details);
}

document.addEventListener("DOMContentLoaded", () => {
  initFinanceModule();
});
