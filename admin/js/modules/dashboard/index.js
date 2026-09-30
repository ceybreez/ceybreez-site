import { loadDashboardData } from "./api.js";
import { calculateDashboard } from "./cards.js";
import { escapeHtml, formatDate, formatMoney, normalizeCurrency } from "./helpers.js";
import { stat } from "./lists.js";
import { renderTimeline } from "./timeline.js";
import { renderOperations } from "./operations.js";

let lastLoadedAt=null;
let isLoading=false;

function currentAdminName(){
  const user=window.CEYBREEZ_CURRENT_USER;
  return user?.displayName || user?.username || "Admin";
}

function dominantCurrency(bookings=[]){
  const counts=new Map();
  bookings.forEach(b=>{ const c=normalizeCurrency(b.currency||b.quoteCurrency||"USD"); counts.set(c,(counts.get(c)||0)+1); });
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || "USD";
}

function skeleton(box){
  box.innerHTML=`<div class="v63-dashboard"><div class="v63-skeleton hero"></div><div class="v63-skeleton-grid">${Array.from({length:8},()=>'<div class="v63-skeleton card"></div>').join('')}</div><div class="v63-skeleton panel"></div></div>`;
}

function errorState(box,error){
  box.innerHTML=`<div class="v63-dashboard"><div class="v63-error"><div class="v63-error-icon">!</div><h2>Dashboard could not load</h2><p>${escapeHtml(error?.message||"Please try again.")}</p><button type="button" id="v63RetryDashboard">Retry dashboard</button></div></div>`;
  document.getElementById("v63RetryDashboard")?.addEventListener("click",renderDashboard);
}

function bindActions(box){
  box.querySelectorAll("[data-dashboard-action]").forEach(el=>{
    const run=()=>{ const target=el.dataset.dashboardAction; if(target && typeof window.showTab==="function") window.showTab(target); };
    el.addEventListener("click",run);
    el.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); run(); } });
  });
  box.querySelector("#v63RefreshDashboard")?.addEventListener("click",renderDashboard);
}

export async function renderDashboard(){
  const box=document.getElementById("dashboardTab");
  if(!box || isLoading) return;
  isLoading=true;
  skeleton(box);
  try{
    const data=await loadDashboardData();
    const model=calculateDashboard(data);
    const currency=dominantCurrency(data.bookings);
    lastLoadedAt=new Date();
    const loadedLabel=lastLoadedAt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});

    box.innerHTML=`
      <div class="v63-dashboard">
        <section class="v63-hero">
          <div class="v63-hero-copy"><span class="v63-kicker">CeyBreez Operations</span><h2>Good day, ${escapeHtml(currentAdminName())}</h2><p>${escapeHtml(formatDate(model.today))} · Your bookings, arrivals, inquiries and content status in one view.</p><div class="v63-hero-meta"><span><i></i> Live admin data</span><span>Last refreshed ${escapeHtml(loadedLabel)}</span></div></div>
          <div class="v63-hero-actions"><button type="button" data-dashboard-action="inquiries">+ New inquiry</button><button type="button" data-dashboard-action="bookings">+ Booking</button><button type="button" class="secondary" id="v63RefreshDashboard">↻ Refresh</button></div>
        </section>

        <div class="v63-stat-grid">
          ${stat("Today check-ins",model.tIn.length,formatDate(model.today),{icon:"↘",tone:"good",action:"bookings"})}
          ${stat("Today check-outs",model.tOut.length,"Departures due today",{icon:"↗",tone:"info",action:"bookings"})}
          ${stat("In-house",model.house.length,`${model.occupancy}% occupancy estimate`,{icon:"⌂",tone:"brand",action:"availability"})}
          ${stat("Pending payments",model.pendingPayments.length,"Needs finance follow-up",{icon:"$",tone:model.pendingPayments.length?"warn":"good",action:"finance"})}
          ${stat("New inquiries",model.newInq.length,"Unanswered leads",{icon:"✉",tone:model.newInq.length?"warn":"good",action:"inquiries"})}
          ${stat("Follow-ups",model.followUps.length,"New / contacted / quoted",{icon:"✓",tone:"info",action:"inquiries"})}
          ${stat("Today booking value",formatMoney(model.todayRevenue,currency),"Active booking arrivals/departures",{icon:"+",tone:"brand",action:"finance"})}
          ${stat("This month value",formatMoney(model.thisMonthRevenue,currency),"Based on booking check-in month",{icon:"▥",tone:"brand",action:"reports"})}
        </div>

        ${renderTimeline(model)}
        ${renderOperations(model)}

        <section class="v63-quick-panel"><div><span>Quick access</span><h2>Jump to a workspace</h2><p>Open the module you need without going back to the sidebar.</p></div><div class="v63-quick-actions"><button data-dashboard-action="availability">🗓 Availability</button><button data-dashboard-action="properties">🏡 Properties</button><button data-dashboard-action="tours">🚌 Tours</button><button data-dashboard-action="services">☕ Services</button><button data-dashboard-action="reports">📈 Reports</button></div></section>
      </div>`;
    bindActions(box);
  }catch(error){
    errorState(box,error);
  }finally{
    isLoading=false;
  }
}

export function initDashboardModule(){ window.v14RenderDashboard = renderDashboard; }
