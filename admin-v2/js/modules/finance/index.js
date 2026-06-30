import { loadFinanceSummary, savePayment, saveRefund } from "./api.js";
import { renderFinance, applyFinanceFilters } from "./render.js";

let financeState = {
  bookings: [],
  history: [],
  totals: {}
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function bindFinanceEvents() {
  document.getElementById("financeSearch")?.addEventListener("input", () => applyFinanceFilters(financeState));
  document.getElementById("financeStatusFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));
  document.getElementById("financeMethodFilter")?.addEventListener("change", () => applyFinanceFilters(financeState));

  const form = document.getElementById("financeEntryForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const bookingId = document.getElementById("financeBookingId")?.value || "";
    const entryType = document.getElementById("financeEntryType")?.value || "Payment";
    const amount = Number(document.getElementById("financeAmount")?.value || 0);

    if (!bookingId) return alert("Please select a booking first.");
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a valid amount.");

    const payload = {
      bookingId,
      paymentDate: document.getElementById("financeDate")?.value || todayISO(),
      paymentType: document.getElementById("financePaymentType")?.value || "Payment",
      paymentMethod: document.getElementById("financePaymentMethod")?.value || "Cash",
      currency: document.getElementById("financeCurrency")?.value || "USD",
      amount,
      transactionNo: document.getElementById("financeTransactionNo")?.value || "",
      remarks: document.getElementById("financeRemarks")?.value || ""
    };

    try {
      if (entryType === "Refund") {
        await saveRefund({
          bookingId,
          refundDate: payload.paymentDate,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          currency: payload.currency,
          reason: payload.remarks || "Refund",
          remarks: payload.remarks
        });
      } else {
        await savePayment(payload);
      }
      alert("Finance entry saved.");
      window.closeFinanceEntry();
      await window.renderFinanceModule();
    } catch (error) {
      alert(error.message || "Finance entry save failed");
    }
  });
}

export function initFinanceModule() {
  window.renderFinanceModule = async function renderFinanceModule() {
    const root = document.getElementById("financeModuleRoot") || document.getElementById("financeTab");
    if (!root) return;
    root.innerHTML = `<div class="section-head"><div><h2>Finance</h2><p>Loading finance records...</p></div></div>`;
    try {
      financeState = await loadFinanceSummary();
      renderFinance(root, financeState);
      bindFinanceEvents();
    } catch (error) {
      root.innerHTML = `<div class="section-head"><div><h2>Finance</h2><p>${String(error.message || "Finance load failed")}</p></div><button class="v14-refresh" onclick="window.renderFinanceModule()">Retry</button></div>`;
    }
  };

  window.openFinanceEntry = function openFinanceEntry(bookingId) {
    const booking = (financeState.bookings || []).find((b) => String(b.id) === String(bookingId));
    document.getElementById("financeBookingId").value = bookingId;
    document.getElementById("financeDate").value = todayISO();
    document.getElementById("financeCurrency").value = booking?.currency || "USD";
    document.getElementById("financeEntryTitle").textContent = `Add Finance Entry - ${booking?.reference || bookingId}`;
    document.getElementById("financeEntryBox")?.classList.remove("hidden");
    document.getElementById("financeEntryBox")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.closeFinanceEntry = function closeFinanceEntry() {
    document.getElementById("financeEntryForm")?.reset();
    document.getElementById("financeEntryBox")?.classList.add("hidden");
  };

  const active = document.querySelector(".v14-nav button.active")?.dataset?.v14Tab;
  if (active === "finance") window.renderFinanceModule();
}
