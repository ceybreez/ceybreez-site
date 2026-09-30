(function(){
  "use strict";

  const MODULE_QUERY_KEY = "module";
  let deferredInstallPrompt = null;
  let bottomNav = null;
  let previousShowTab = null;

  function isStandalone(){
    return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
  }

  function currentLogicalModule(value){
    const map = {
      dashboardTab:"dashboard", inquiriesTab:"inquiries", bookingsTab:"bookings",
      availabilityTab:"availability", propertiesTab:"properties", destinationsTab:"tours",
      servicesTab:"services", reviewsTab:"reviews", financeTab:"finance", reportsTab:"reports",
      pageControlTab:"pageBuilder", usersTab:"users", approvalsTab:"approvals", backupTab:"backup", settingsTab:"settings",
      destinations:"tours", properties:"properties", services:"services", pageControl:"pageBuilder"
    };
    return map[value] || value || "dashboard";
  }

  function syncBottomNav(logical){
    if(!bottomNav) return;
    const active = currentLogicalModule(logical);
    bottomNav.querySelectorAll("[data-cb-pwa-tab]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.cbPwaTab === active);
    });
  }

  function openMoreMenu(){
    const menuButton = document.querySelector(".v14-mobile-menu");
    if(menuButton){ menuButton.click(); return; }
    document.querySelector(".v14-sidebar")?.classList.add("open");
  }

  function buildBottomNav(){
    if(bottomNav || !document.body.classList.contains("v14-shell-ready")) return;
    bottomNav = document.createElement("nav");
    bottomNav.className = "cb-pwa-bottom-nav";
    bottomNav.setAttribute("aria-label", "Admin app navigation");
    bottomNav.innerHTML = `
      <button type="button" data-cb-pwa-tab="dashboard"><span class="cb-pwa-icon">⌂</span><span>Dashboard</span></button>
      <button type="button" data-cb-pwa-tab="inquiries"><span class="cb-pwa-icon">✉</span><span>Inquiries</span></button>
      <button type="button" data-cb-pwa-tab="bookings"><span class="cb-pwa-icon">▣</span><span>Bookings</span></button>
      <button type="button" data-cb-pwa-tab="properties"><span class="cb-pwa-icon">⌂</span><span>Properties</span></button>
      <button type="button" data-cb-pwa-more="1"><span class="cb-pwa-icon">☰</span><span>More</span></button>`;
    document.body.appendChild(bottomNav);

    bottomNav.querySelectorAll("[data-cb-pwa-tab]").forEach(btn => {
      btn.addEventListener("click", () => {
        if(typeof window.showTab === "function") window.showTab(btn.dataset.cbPwaTab);
      });
    });
    bottomNav.querySelector("[data-cb-pwa-more]")?.addEventListener("click", openMoreMenu);
    const active = document.querySelector(".v14-nav button.active")?.dataset.v14Tab || "dashboard";
    syncBottomNav(active);
  }

  function decorateTopbar(){
    const actions = document.querySelector(".v14-topbar-actions");
    if(!actions || actions.querySelector(".cb-pwa-install")) return;

    const badge = document.createElement("span");
    badge.className = "cb-pwa-standalone-badge";
    badge.textContent = "App mode";
    actions.prepend(badge);

    const install = document.createElement("button");
    install.type = "button";
    install.className = "cb-pwa-install";
    install.innerHTML = "＋ Install App";
    install.addEventListener("click", async () => {
      if(!deferredInstallPrompt) return;
      install.disabled = true;
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch(_) {}
      deferredInstallPrompt = null;
      install.classList.remove("is-visible");
      install.disabled = false;
    });
    actions.appendChild(install);

    if(deferredInstallPrompt && !isStandalone()) install.classList.add("is-visible");
    if(isStandalone()) install.classList.add("is-installed");
  }

  function installShowTabHook(){
    if(typeof window.showTab !== "function" || window.showTab.__cbPwaWrapped) return;
    previousShowTab = window.showTab;
    const wrapped = function(tab){
      const result = previousShowTab.apply(this, arguments);
      const logical = currentLogicalModule(tab);
      syncBottomNav(logical);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set(MODULE_QUERY_KEY, logical);
        history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch(_) {}
      return result;
    };
    wrapped.__cbPwaWrapped = true;
    window.showTab = wrapped;
  }

  function applyLaunchModule(){
    const requested = new URLSearchParams(location.search).get(MODULE_QUERY_KEY);
    if(!requested || requested === "dashboard") return;
    const allowed = new Set(["inquiries","bookings","availability","properties","tours","services","reviews","finance","reports","pageBuilder","users","approvals","backup","settings"]);
    if(allowed.has(requested) && typeof window.showTab === "function") {
      setTimeout(() => window.showTab(requested), 120);
    }
  }

  function ensureShellEnhancements(){
    if(!document.body.classList.contains("v14-shell-ready")) return false;
    buildBottomNav();
    decorateTopbar();
    installShowTabHook();
    return true;
  }

  function networkBanner(){
    let banner = document.querySelector(".cb-pwa-network");
    if(!banner){
      banner = document.createElement("div");
      banner.className = "cb-pwa-network";
      banner.setAttribute("role","status");
      document.body.appendChild(banner);
    }
    return banner;
  }

  function updateNetworkState(initial=false){
    const banner = networkBanner();
    if(navigator.onLine){
      document.body.classList.remove("cb-pwa-offline");
      if(!initial){
        banner.textContent = "Back online";
        banner.className = "cb-pwa-network online show";
        setTimeout(() => banner.classList.remove("show"), 1800);
      }
    } else {
      document.body.classList.add("cb-pwa-offline");
      banner.textContent = "Offline — live admin data needs internet";
      banner.className = "cb-pwa-network show";
    }
  }

  async function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register("./sw.js?v=6.4.0", { scope:"./", updateViaCache:"none" });
      registration.update().catch(()=>{});
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if(worker.state === "installed" && navigator.serviceWorker.controller){
            worker.postMessage("SKIP_WAITING");
          }
        });
      });
    } catch(error){
      console.warn("CeyBreez Admin PWA registration failed", error);
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    document.querySelector(".cb-pwa-install")?.classList.add("is-visible");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    document.body.classList.add("cb-pwa-standalone");
    document.querySelector(".cb-pwa-install")?.classList.add("is-installed");
  });
  window.addEventListener("online", () => updateNetworkState(false));
  window.addEventListener("offline", () => updateNetworkState(false));

  document.addEventListener("DOMContentLoaded", () => {
    if(isStandalone()) document.body.classList.add("cb-pwa-standalone");
    updateNetworkState(true);
    registerServiceWorker();

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if(ensureShellEnhancements() || tries > 80){
        clearInterval(timer);
        installShowTabHook();
        applyLaunchModule();
      }
    }, 100);

    const observer = new MutationObserver(() => ensureShellEnhancements());
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:["class"] });
    setTimeout(() => observer.disconnect(), 20000);
  });
})();
