import { listHtml, smallMetric } from "./lists.js";

export function renderOperations(model){
  return `
    <div class="v17-ops-board">
      <div class="v14-panel"><h3>Today Check-ins</h3>${listHtml(model.tIn,"No arrivals today")}</div>
      <div class="v14-panel"><h3>Today Check-outs</h3>${listHtml(model.tOut,"No departures today")}</div>
      <div class="v14-panel"><h3>Arrivals Without Full Payment</h3>${listHtml(model.tIn.filter(b=>model.pendingPayments.includes(b)),"No payment alerts")}</div>
      <div class="v14-panel"><h3>Tomorrow Arrivals</h3>${listHtml(model.tmIn,"No arrivals tomorrow")}</div>
    </div>
    <div class="v17-ops-grid-wide">
      <div class="v14-panel"><h3>Inquiry Pipeline</h3><div class="v17-mini-grid four">${smallMetric("New",model.newInq.length)}${smallMetric("Quoted",model.quoted.length)}${smallMetric("Booked",model.bookedInq.length,"good")}</div>${listHtml(model.followUps,"No pending inquiries")}</div>
      <div class="v14-panel"><h3>Property Summary</h3><div class="v17-mini-grid four">${smallMetric("Villas",model.props.villa)}${smallMetric("Apartments",model.props.apartment)}${smallMetric("Homestays",model.props.homestay)}${smallMetric("Featured",model.props.featured)}</div></div>
    </div>
    <div class="v17-ops-grid-wide">
      <div class="v14-panel"><h3>Latest Bookings</h3>${listHtml(model.latestBookings,"No bookings found")}</div>
      <div class="v14-panel"><h3>Latest Inquiries</h3>${listHtml(model.latestInquiries.map(i=>({guestName:i.guestName,itemName:i.itemName||i.serviceType,reference:i.status||i.reference})),"No inquiries found")}</div>
    </div>`;
}
