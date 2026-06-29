import { loadAvailability } from "./api.js";
import { escapeHtml, formatDate } from "./utils.js";

let availabilityCache = [];

export async function renderBookingCalendar(ctx) {
  const container = document.getElementById("bookingsList");
  if (!container) return;

  try {
    availabilityCache = await loadAvailability();
  } catch (e) {
    console.error(e);
    availabilityCache = [];
  }

  const properties = uniqueProperties(ctx.items, availabilityCache);
  const days = nextDays(14);

  container.innerHTML = `
    <div class="calendar-pro-panel">

      <div class="calendar-head">

        <div>
          <h3>Availability Calendar</h3>
          <p>Live availability from Availability Engine</p>
        </div>

        <div class="calendar-legend">

          <span class="legend green">Available</span>

          <span class="legend red">Booked</span>

          <span class="legend blue">Owner</span>

          <span class="legend grey">Maintenance</span>

          <span class="legend orange">Hold</span>

          <span class="legend purple">Private</span>

        </div>

      </div>

      <div class="availability-table">

        <div class="availability-row availability-header">

          <div class="availability-item">

            Property

          </div>

          ${days.map(day=>`

            <div class="availability-day">

                <strong>${day.label}</strong>

                <small>${day.display}</small>

            </div>

          `).join("")}

        </div>

        ${properties.map(property=>propertyRow(property,days)).join("")}

      </div>

    </div>
  `;
}

function propertyRow(property,days){

return`

<div class="availability-row">

<div class="availability-item">

<strong>${escapeHtml(property)}</strong>

</div>

${days.map(day=>{

const state=getAvailability(property,day.date);

return`

<div
class="availability-cell ${state.className}"
title="${escapeHtml(state.title)}"
>

${state.short}

</div>

`;

}).join("")}

</div>

`;

}

function getAvailability(property,date){

const row=availabilityCache.find(a=>{

return (

String(a.propertyName).trim().toLowerCase()===

String(property).trim().toLowerCase()

&&

a.date===date

);

});

if(!row){

return{

className:"available",

short:"✓",

title:"Available"

};

}

switch(String(row.type)){

case"Owner Stay":

return{

className:"owner",

short:"O",

title:"Owner Stay"

};

case"Maintenance":

return{

className:"maintenance",

short:"M",

title:"Maintenance"

};

case"Private":

return{

className:"private",

short:"P",

title:"Private"

};

case"Hold":

return{

className:"hold",

short:"H",

title:"Hold"

};

default:

return{

className:"booked",

short:"B",

title:row.guestName || "Booked"

};

}

}

function uniqueProperties(bookings,availability){

const names=new Set();

bookings.forEach(x=>{

if(x.itemName){

names.add(

String(x.itemName).trim()

);

}

});

availability.forEach(x=>{

if(x.propertyName){

names.add(

String(x.propertyName).trim()

);

}

});

return [...names].sort();

}

function nextDays(total){

const list=[];

const today=new Date();

for(let i=0;i<total;i++){

const d=new Date(today);

d.setDate(today.getDate()+i);

const iso=d.toISOString().slice(0,10);

list.push({

date:iso,

label:d.toLocaleDateString(

"en-GB",

{weekday:"short"}

),

display:formatDate(iso)

});

}

return list;

}
