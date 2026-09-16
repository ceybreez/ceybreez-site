import { loadDashboardData } from "./api.js";
import { calculateDashboard } from "./cards.js";
import { escapeHtml, formatDate } from "./helpers.js";
import { stat } from "./lists.js";
import { renderTimeline } from "./timeline.js";
import { renderOperations } from "./operations.js";

function skeleton(box){ box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>Loading CeyBreez live operations summary...</p></div><button class="v14-refresh" type="button" onclick="v14RenderDashboard()">Refresh Dashboard</button></div>`; }

export async function renderDashboard(){
  const box=document.getElementById("dashboardTab");
  if(!box) return;
  skeleton(box);
  try{
    const data=await loadDashboardData();
    const model=calculateDashboard(data);
    box.innerHTML=`
      <div class="v17-hero">
        <div><span class="v17-kicker">CeyBreez Enterprise PMS</span><h2>Good day, Admin</h2><p>Today is ${escapeHtml(formatDate(model.today))}. Here is your live check-in, check-out, inquiry and booking overview.</p></div>
        <div class="v17-hero-actions"><button type="button" onclick="showTab('inquiries')">+ Inquiry</button><button type="button" onclick="showTab('bookings')">+ Booking</button><button type="button" onclick="v14RenderDashboard()">Refresh</button></div>
      </div>
      <div class="v14-dashboard-grid v17-main-stats">
        ${stat("Today Check-in",model.tIn.length,formatDate(model.today))}
        ${stat("Today Check-out",model.tOut.length,formatDate(model.today))}
        ${stat("In-house Guests",model.house.length,`${model.occupancy}% occupancy`)}
        ${stat("Pending Payments",model.pendingPayments.length,"Need follow-up")}
        ${stat("New Inquiries",model.newInq.length,"Unanswered leads")}
        ${stat("Pending Follow-ups",model.followUps.length,"New / contacted / quoted")}
        ${stat("Revenue Today",model.todayRevenue ? model.todayRevenue.toFixed(2) : "0","From active bookings")}
        ${stat("Revenue This Month",model.thisMonthRevenue ? model.thisMonthRevenue.toFixed(2) : "0","Based on check-in month")}
      </div>
      ${renderTimeline(model)}
      ${renderOperations(model)}
    `;
  }catch(error){
    box.innerHTML=`<div class="v14-section-head"><div><h2>Dashboard</h2><p>${escapeHtml(error.message)}</p></div><button class="v14-refresh" onclick="v14RenderDashboard()">Retry</button></div>`;
  }
}

export function initDashboardModule(){ window.v14RenderDashboard = renderDashboard; }
