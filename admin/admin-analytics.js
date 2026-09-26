/* CEYBREEZ ADMIN CONVERSION ANALYTICS V5.6
   Sends conversion events only. Admin page views are deliberately disabled. */
(function(){
  "use strict";
  const MID = "G-3QG71CWHW2";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", MID, { send_page_view:false });
  if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${MID}"]`)) {
    const s=document.createElement("script");
    s.async=true; s.src=`https://www.googletagmanager.com/gtag/js?id=${MID}`;
    document.head.appendChild(s);
  }
  window.CeyBreezAdminAnalytics={
    track(name, params={}){
      window.gtag("event", name, {
        page_location:"https://ceybreez.com/conversions/booking-confirmed",
        page_title:"CeyBreez conversion",
        ...params
      });
    }
  };
})();
