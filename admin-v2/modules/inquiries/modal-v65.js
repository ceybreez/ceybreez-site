/* Add quote panel into inquiry modal after original modal opens */
const v65OriginalOpenInquiryModal = typeof openInquiryModal === "function" ? openInquiryModal : null;
if(v65OriginalOpenInquiryModal){
  openInquiryModal = function(id){
    v65OriginalOpenInquiryModal(id);

    setTimeout(() => {
      const item = allInquiries.find(x => String(x.id) === String(id));
      const body = document.getElementById("inquiryModalBody");
      if(!item || !body || body.querySelector(".v65-quote-panel")) return;

      body.insertAdjacentHTML("afterbegin", v65QuotePanelHtml(item));
    }, 80);
  };
}

