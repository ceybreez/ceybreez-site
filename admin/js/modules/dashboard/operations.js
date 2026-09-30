import { listHtml, panel, smallMetric } from "./lists.js";
import { percent } from "./helpers.js";

export function renderOperations(model){
  const todayPaymentAlerts=model.tIn.filter(b=>model.pendingPayments.includes(b));
  return `
    <div class="v63-section-title"><div><span>Action centre</span><h2>What needs attention</h2></div></div>
    <div class="v63-attention-grid">
      ${panel("Arrivals without full payment",listHtml(todayPaymentAlerts,"No payment alerts for today's arrivals"),{subtitle:"Today arrivals with pending or partial payment",action:"finance",actionLabel:"Finance"})}
      ${panel("Inquiry follow-ups",listHtml(model.followUps,"No pending inquiry follow-ups"),{subtitle:"New, contacted and quoted leads",action:"inquiries",actionLabel:"Inquiries"})}
      ${panel("Tomorrow arrivals",listHtml(model.tmIn,"No arrivals tomorrow"),{subtitle:"Prepare upcoming guest arrivals",action:"bookings",actionLabel:"Bookings"})}
    </div>

    <div class="v63-two-col">
      ${panel("Inquiry pipeline",`<div class="v63-mini-grid four">${smallMetric("New",model.newInq.length)}${smallMetric("Quoted",model.quoted.length)}${smallMetric("Booked",model.bookedInq.length,"good")}${smallMetric("Conversion",`${percent(model.bookedInq.length,model.newInq.length+model.quoted.length+model.bookedInq.length)}%`)}</div>${listHtml(model.latestInquiries,"No inquiries found",{showDate:true})}`,{action:"inquiries",actionLabel:"Open inquiries"})}
      ${panel("Property portfolio",`<div class="v63-mini-grid four">${smallMetric("Villas",model.props.villa)}${smallMetric("Apartments",model.props.apartment)}${smallMetric("Homestays",model.props.homestay)}${smallMetric("Featured",model.props.featured)}</div><div class="v63-progress-row"><span>Active properties</span><strong>${model.activePropertyCount}</strong></div><div class="v63-progress-track"><i style="width:${Math.min(100,Math.max(0,model.occupancy))}%"></i></div><small class="v63-muted">Current occupancy estimate: ${model.occupancy}%</small>`,{action:"properties",actionLabel:"Properties"})}
    </div>

    <div class="v63-two-col">
      ${panel("Latest bookings",listHtml(model.latestBookings,"No bookings found",{showDate:true}),{action:"bookings",actionLabel:"Open bookings"})}
      ${panel("Content snapshot",`<div class="v63-content-snapshot"><div><span>Tour packages</span><strong>${model.tourPackagesTotal}</strong><small>${model.tourPackagesLive} live · ${model.tourPackagesFeatured} featured</small></div><div><span>Destinations</span><strong>${model.destinationsTotal}</strong><small>${model.destinationsLive} live</small></div><div><span>Services</span><strong>${model.servicesTotal}</strong><small>${model.servicesLive} live</small></div><div><span>Reviews</span><strong>${model.reviewsTotal}</strong><small>Average ${model.averageRating} / 5</small></div></div>`,{action:"tours",actionLabel:"Tours CMS"})}
    </div>`;
}
