import { formatDate } from "./helpers.js";
import { listHtml, smallMetric } from "./lists.js";

export function renderTimeline(model){
  return `
    <div class="v17-timeline-grid">
      <div class="v17-day-card yesterday"><h3>Yesterday</h3><div class="v17-mini-grid">${smallMetric("Check-ins",model.yIn.length)}${smallMetric("Check-outs",model.yOut.length)}</div>${listHtml([...model.yIn,...model.yOut],"No operations yesterday")}</div>
      <div class="v17-day-card today"><h3>Today</h3><div class="v17-mini-grid">${smallMetric("Check-ins",model.tIn.length,"good")}${smallMetric("Check-outs",model.tOut.length,"warn")}${smallMetric("In-house",model.house.length)}</div>${listHtml([...model.tIn,...model.tOut],"No operations today")}</div>
      <div class="v17-day-card tomorrow"><h3>Tomorrow</h3><div class="v17-mini-grid">${smallMetric("Check-ins",model.tmIn.length)}${smallMetric("Check-outs",model.tmOut.length)}</div>${listHtml([...model.tmIn,...model.tmOut],"No operations tomorrow")}</div>
    </div>`;
}
