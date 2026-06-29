/* V9.1 DUPLICATE UI CLEANUP */
function v91Text(x){ return String(x || "").replace(/\s+/g," ").trim().toLowerCase(); }

function v91DedupeButtons(root=document){
  const labels = new Set(["save payment status","send payment / invoice email","send quote / invoice","mark guest confirmed","admin confirm booking","clean orphans","sync bookings"]);
  const seen = new Set();
  root.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(!labels.has(t)) return;
    if(seen.has(t)) btn.remove();
    else seen.add(t);
  });
}

function v91CleanModal(){
  const modal = document.getElementById("inquiryModal") || document.querySelector(".modal, .admin-modal") || document;

  const panels = [...modal.querySelectorAll(".v65-quote-panel, .booking-confirm-panel")];
  if(panels.length > 1){
    const keep = panels.find(p => v91Text(p.textContent).includes("payment status")) || panels[0];
    panels.forEach(p => { if(p !== keep) p.remove(); });
  }

  const modern = modal.querySelector(".v65-quote-panel, .booking-confirm-panel");
  if(modern){
    modal.querySelectorAll("h3,h4,strong,legend").forEach(h=>{
      const t = v91Text(h.textContent);
      if(t.includes("property quote / booking details") || t.includes("tour quote / booking details")){
        const box = h.closest(".modal-section,.form-section,.card,section,div");
        if(box && box !== modern && !modern.contains(box)) box.remove();
      }
    });
  }

  modal.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(t === "confirm booking" && !btn.closest(".v65-quote-panel,.booking-confirm-panel")) btn.remove();
    if(t === "property bookings" || t === "tour bookings") btn.remove();
  });

  v91DedupeButtons(modal);
}

function v91CleanPage(){
  document.querySelectorAll(".v6-mode-tabs").forEach(x=>x.remove());
  document.querySelectorAll("button").forEach(btn=>{
    const t = v91Text(btn.textContent);
    if(t === "property bookings" || t === "tour bookings") btn.remove();
  });
  v91DedupeButtons(document);
}

const v91OldOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v91OldOpenInquiryModal){
  openInquiryModal = function(id){
    v91OldOpenInquiryModal(id);
    setTimeout(v91CleanModal, 80);
    setTimeout(v91CleanModal, 250);
    setTimeout(v91CleanModal, 700);
  };
}

document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(v91CleanPage, 600);
  setInterval(()=>{ v91CleanPage(); v91CleanModal(); }, 1500);
});


