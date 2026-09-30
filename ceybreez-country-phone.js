(function () {
  "use strict";

  const CDN = "https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.6/build/js/intlTelInput.min.js";
  const TARGETS = [
    { countryId: "guestCountry", mobileId: "guestMobile" },
    { countryId: "inqCountry", mobileId: "inqMobile" }
  ];

  function loadCountryDataScript() {
    if (window.intlTelInputGlobals && typeof window.intlTelInputGlobals.getCountryData === "function") {
      return Promise.resolve();
    }

    const existing = document.querySelector('script[data-ceybreez-country-phone-lib="1"]');
    if (existing) {
      return new Promise((resolve, reject) => {
        if (window.intlTelInputGlobals) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CDN;
      script.async = true;
      script.dataset.ceybreezCountryPhoneLib = "1";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function replaceCountryInputWithSelect(countryField) {
    if (!countryField || countryField.tagName === "SELECT") return countryField;

    const select = document.createElement("select");
    for (const attr of Array.from(countryField.attributes || [])) {
      if (attr.name === "type" || attr.name === "placeholder" || attr.name === "value") continue;
      select.setAttribute(attr.name, attr.value);
    }
    select.id = countryField.id;
    select.name = countryField.name || countryField.id;
    if (countryField.required) select.required = true;
    select.dataset.originalCountryValue = countryField.value || "";
    countryField.replaceWith(select);
    return select;
  }

  function setMobileDialCode(mobile, dialCode) {
    if (!mobile || !dialCode) return;

    const current = String(mobile.value || "").trim();
    const previousCode = String(mobile.dataset.ceybreezDialCode || "").replace(/\D/g, "");
    let national = current;

    if (previousCode && national.startsWith("+" + previousCode)) {
      national = national.slice(previousCode.length + 1).trim();
    } else {
      national = national.replace(/^\+\d{1,4}[\s-]*/, "").trim();
    }

    mobile.dataset.ceybreezDialCode = String(dialCode);
    mobile.value = `+${dialCode}${national ? " " + national : " "}`;
    mobile.setAttribute("inputmode", "tel");
  }

  function setupTarget(countryField, mobile, countries) {
    const select = replaceCountryInputWithSelect(countryField);
    if (!select || !mobile || select.dataset.ceybreezCountryReady === "1") return;

    const originalValue = String(select.dataset.originalCountryValue || "").trim().toLowerCase();
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select country";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.name;
      option.textContent = country.name;
      option.dataset.iso2 = country.iso2;
      option.dataset.dialCode = country.dialCode;
      if (originalValue && (country.name.toLowerCase() === originalValue || country.iso2.toLowerCase() === originalValue)) {
        option.selected = true;
        placeholder.selected = false;
      }
      select.appendChild(option);
    });

    function syncDialCode() {
      const option = select.options[select.selectedIndex];
      const dialCode = option && option.dataset ? option.dataset.dialCode : "";
      if (dialCode) setMobileDialCode(mobile, dialCode);
    }

    select.addEventListener("change", syncDialCode);
    mobile.addEventListener("focus", () => {
      if (!String(mobile.value || "").trim()) syncDialCode();
    });

    select.dataset.ceybreezCountryReady = "1";
    if (select.value) syncDialCode();
  }

  async function init() {
    const activeTargets = TARGETS.map((target) => ({
      countryField: document.getElementById(target.countryId),
      mobile: document.getElementById(target.mobileId)
    })).filter((target) => target.countryField && target.mobile);

    if (!activeTargets.length) return;

    try {
      await loadCountryDataScript();
      const countries = window.intlTelInputGlobals.getCountryData();
      activeTargets.forEach((target) => setupTarget(target.countryField, target.mobile, countries));
    } catch (error) {
      console.error("CeyBreez country/mobile setup failed", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
