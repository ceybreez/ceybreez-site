import { listHtml, smallMetric } from "./lists.js";

export function renderTimeline(model){
  return `
    <div class="v63-section-title"><div><span>Operations timeline</span><h2>Yesterday · Today · Tomorrow</h2></div></div>
    <div class="v63-timeline-grid">
      <section class="v63-day-card muted"><div class="v63-day-head"><span>Yesterday</span><strong>${model.yesterday}</strong></div><div class="v63-mini-grid">${smallMetric("Check-ins",model.yIn.length)}${smallMetric("Check-outs",model.yOut.length)}${smallMetric("Inquiries",model.yesterdayInquiries.length)}</div>${listHtml([...model.yIn,...model.yOut],"No operations yesterday")}</section>
      <section class="v63-day-card today"><div class="v63-day-head"><span>Today</span><strong>${model.today}</strong></div><div class="v63-mini-grid">${smallMetric("Check-ins",model.tIn.length,"good")}${smallMetric("Check-outs",model.tOut.length,"warn")}${smallMetric("In-house",model.house.length)}</div>${listHtml([...model.tIn,...model.tOut],"No check-ins or check-outs today")}</section>
      <section class="v63-day-card"><div class="v63-day-head"><span>Tomorrow</span><strong>${model.tomorrow}</strong></div><div class="v63-mini-grid">${smallMetric("Check-ins",model.tmIn.length)}${smallMetric("Check-outs",model.tmOut.length)}${smallMetric("Upcoming 7d",model.upcoming7.length)}</div>${listHtml([...model.tmIn,...model.tmOut],"No operations tomorrow")}</section>
    </div>`;
}
