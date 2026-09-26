/* ================================================================
   CEYBREEZ ANALYTICS V5.6
   PURPOSE: Public conversion/event tracking for GA4.
   IMPORTANT: This file is loaded only on public pages, never /admin/.
   No guest name, email, phone, message or inquiry reference is sent.
   ================================================================ */
(function(){
  "use strict";

  const MEASUREMENT_ID = "G-3QG71CWHW2";
  if (location.pathname.startsWith("/admin")) return;

  function ensureGtag(){
    if (typeof window.gtag === "function") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);
    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"]`)) {
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      document.head.appendChild(s);
    }
  }

  function cleanText(v, max=100){
    return String(v || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function pageType(){
    const p = location.pathname.toLowerCase();
    if (p.includes("tour-details")) return "tour_details";
    if (p.includes("tours")) return "tours";
    if (p.includes("villas")) return "villas";
    if (p.includes("apartments")) return "apartments";
    if (p.includes("homestays")) return "homestays";
    if (p.includes("services")) return "services";
    if (p.includes("contact")) return "contact";
    if (p === "/" || p.endsWith("/index.html")) return "home";
    return "other";
  }

  function inquiryType(){
    const p = pageType();
    if (p === "tour_details" || p === "tours") return "tour";
    if (["villas","apartments","homestays"].includes(p)) return p.replace(/s$/, "");
    if (p === "contact") return "contact";
    return "general";
  }

  function track(name, params={}){
    ensureGtag();
    const safe = {
      page_type: pageType(),
      page_path: location.pathname,
      ...params
    };
    window.gtag("event", name, safe);
  }

  const sentInquiryKeys = new Set();
  function trackInquirySuccess(reference, type){
    const key = cleanText(reference || `${type || inquiryType()}-${Date.now()}`, 80);
    if (key && sentInquiryKeys.has(key)) return;
    if (key) sentInquiryKeys.add(key);
    const params = { inquiry_type: cleanText(type || inquiryType(), 40) };
    track("inquiry_submit", params);
    track("generate_lead", params);
  }

  function bindClicks(){
    document.addEventListener("click", (event) => {
      const a = event.target.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const text = cleanText(a.textContent || a.getAttribute("aria-label") || "", 80);

      if (/api\.whatsapp\.com|wa\.me/i.test(href)) {
        track("whatsapp_click", { link_text: text || "WhatsApp" });
        return;
      }
      if (/^mailto:/i.test(href)) {
        track("contact_click", { contact_method: "email", link_text: text || "Email" });
        return;
      }
      if (/^tel:/i.test(href)) {
        track("contact_click", { contact_method: "phone", link_text: text || "Phone" });
      }
    }, {capture:true});

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.id === "tripForm" || form.id === "tourInquiryForm") {
        track("tour_inquiry_click", { form_id: form.id });
      }
    }, {capture:true});
  }

  ensureGtag();
  bindClicks();

  window.CeyBreezAnalytics = {
    track,
    trackInquirySuccess,
    inquiryType
  };
})();
