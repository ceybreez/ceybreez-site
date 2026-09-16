export function bindConvertAction(item){
  const btn=document.getElementById('ceyConvertInquiryBooking');
  if(!btn) return;
  btn.onclick=()=>{
    if(typeof window.openInquiryModal==='function'){
      window.openInquiryModal(item.id);
      setTimeout(()=>{
        if(typeof window.confirmBooking==='function') window.confirmBooking(true);
      },300);
      return;
    }
    alert('Legacy booking confirmation function not found.');
  };
}
