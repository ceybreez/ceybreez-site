const API_BASE = window.CEYBREEZ_API_BASE || "https://ceybreez-contact-api.ceybreez.workers.dev";
const TOKEN_KEY = "CEYBREEZ_SESSION_TOKEN";

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = (v="") => String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pct = v => num(v) / 100;
const round2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;
const money = (v,c="USD") => `${c} ${round2(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const uid = p => `${p}-${Date.now()}-${Math.floor(Math.random()*100000)}`;
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

const state = { costings:[], tours:[], rates:[], current:null, dirty:false, activeStep:"setup" };

function token(){ return sessionStorage.getItem(TOKEN_KEY) || ""; }
function authHeaders(json=true){ const h={Authorization:`Bearer ${token()}`}; if(json) h["Content-Type"]="application/json"; return h; }
async function api(path, options={}){
  const res = await fetch(API_BASE+path,{...options,headers:{...authHeaders(!(options.body instanceof FormData)),...(options.headers||{})}});
  const type=res.headers.get("content-type")||"";
  const data=type.includes("application/json")?await res.json().catch(()=>({})):await res.text().catch(()=>"");
  if(!res.ok){ const e=new Error(data?.error||data?.message||`Request failed (${res.status})`); e.status=res.status; throw e; }
  return data;
}
function toast(msg,error=false){ const el=$("#tcToast"); if(!el)return; el.textContent=msg; el.className=`tc-toast show${error?" error":""}`; clearTimeout(toast.t); toast.t=setTimeout(()=>el.className="tc-toast",3000); }
function setDirty(v=true){ state.dirty=v; const t=$("#tcEditorTitle"); if(t) t.classList.toggle("tc-dirty",v); }
function pathGet(obj,path){ return String(path).split(".").reduce((a,k)=>a?.[k],obj); }
function pathSet(obj,path,value){ const parts=String(path).split("."); let cur=obj; parts.slice(0,-1).forEach(k=>cur=cur[k]??(cur[k]={})); cur[parts.at(-1)]=value; }
function asArray(v){ return Array.isArray(v)?v:[]; }
function normalizeList(v){ return Array.isArray(v)?v:(Array.isArray(v?.items)?v.items:[]); }

function blankCosting(){
  return {
    id:"",reference:"",rootId:"",previousId:"",revisionNo:0,status:"Draft",inquiryRef:"",source:"Web",
    tourPackageId:"",packageName:"",guestName:"",guestType:"Family",nationality:"",country:"",
    travelStart:today(),days:6,nights:5,adultPax:2,childWithBed:0,childWithoutBed:0,infantPax:0,focPax:0,
    currency:"USD",exchangeRate:310,hotelCategory:"3 Star",vehiclePreference:"",notes:"",
    pricing:{method:"markup",contingencyPct:5,overheadPct:3,markupPct:15,targetMarginPct:20,manualSale:0,discountPct:0,agentCommissionPct:0,bankFeePct:2.5,vatPct:18,childWBPct:75,childWOBPct:50,infantFixed:0},
    hotels:[],transport:[],activities:[],staff:[],extras:[],summary:{}
  };
}
function sanitizeCurrent(raw){
  const b=blankCosting(); const c={...b,...(raw||{})};
  c.pricing={...b.pricing,...(raw?.pricing||{})};
  ["hotels","transport","activities","staff","extras"].forEach(k=>c[k]=asArray(raw?.[k]));
  return c;
}
function totalPax(c=state.current){ return num(c?.adultPax)+num(c?.childWithBed)+num(c?.childWithoutBed)+num(c?.infantPax)+num(c?.focPax); }

function hotelEst(r){ return num(r.qty)*num(r.rate)+num(r.extra); }
function transportEst(r){ return num(r.qty)*num(r.rate)+num(r.tolls)+num(r.parking); }
function activityEst(r){ return num(r.qty)*num(r.rate); }
function staffEst(r){ return ["Included","Not Required","N/ Required"].includes(r.requirement) ? 0 : num(r.qty)*num(r.feeRate)+num(r.hotel)+num(r.food); }
function extraEst(r){ return num(r.qty)*num(r.rate); }
function lineActual(r){ return num(r.actual); }
function sectionSums(c=state.current){
  const est={hotels:0,transport:0,activities:0,staff:0,extras:0}, act={hotels:0,transport:0,activities:0,staff:0,extras:0};
  c.hotels.forEach(r=>{est.hotels+=hotelEst(r);act.hotels+=lineActual(r)});
  c.transport.forEach(r=>{est.transport+=transportEst(r);act.transport+=lineActual(r)});
  c.activities.forEach(r=>{est.activities+=activityEst(r);act.activities+=lineActual(r)});
  c.staff.forEach(r=>{est.staff+=staffEst(r);act.staff+=lineActual(r)});
  c.extras.forEach(r=>{est.extras+=extraEst(r);act.extras+=lineActual(r)});
  return {est,act};
}
function computeSummary(c=state.current){
  const {est,act}=sectionSums(c); const direct=Object.values(est).reduce((s,v)=>s+v,0); const actual=Object.values(act).reduce((s,v)=>s+v,0);
  const p=c.pricing||{}; const contingency=direct*pct(p.contingencyPct); const overhead=direct*pct(p.overheadPct); const costBeforeProfit=direct+contingency+overhead;
  let coreSale=0;
  if(p.method==="margin"){ const m=pct(p.targetMarginPct); coreSale=m>=.999?0:costBeforeProfit/(1-m); }
  else if(p.method==="manual") coreSale=num(p.manualSale);
  else coreSale=costBeforeProfit*(1+pct(p.markupPct));
  const discount=coreSale*pct(p.discountPct); const netSale=Math.max(0,coreSale-discount);
  const agentCommission=netSale*pct(p.agentCommissionPct); const bankFee=netSale*pct(p.bankFeePct); const vat=netSale*pct(p.vatPct);
  const finalSale=netSale+agentCommission+bankFee+vat; const operatingProfit=netSale-costBeforeProfit; const marginPct=netSale?operatingProfit/netSale*100:0;
  const actualOverhead=actual*pct(p.overheadPct); const actualOperatingCost=actual+actualOverhead; const actualProfit=netSale-actualOperatingCost;
  const infants=num(c.infantPax); const infantTotal=infants*num(p.infantFixed); const eq=num(c.adultPax)+num(c.childWithBed)*pct(p.childWBPct)+num(c.childWithoutBed)*pct(p.childWOBPct);
  const distributable=Math.max(0,finalSale-infantTotal); const adultRate=eq?distributable/eq:0;
  return {sectionsEst:est,sectionsActual:act,directCost:round2(direct),actualCost:round2(actual),contingency:round2(contingency),overhead:round2(overhead),costBeforeProfit:round2(costBeforeProfit),coreSale:round2(coreSale),discount:round2(discount),netSale:round2(netSale),agentCommission:round2(agentCommission),bankFee:round2(bankFee),vat:round2(vat),finalSale:round2(finalSale),operatingProfit:round2(operatingProfit),marginPct:round2(marginPct),actualOperatingCost:round2(actualOperatingCost),actualProfit:round2(actualProfit),actualVariance:round2(actual-direct),adultRate:round2(adultRate),childWBRate:round2(adultRate*pct(p.childWBPct)),childWOBRate:round2(adultRate*pct(p.childWOBPct)),infantRate:round2(num(p.infantFixed))};
}

async function ensureSession(){
  if(!token()){ location.href="index.html"; return false; }
  try{ await api("/api/admin/auth/me"); $("#tcAuthGate").classList.add("hidden"); $("#tcApp").classList.remove("hidden"); return true; }
  catch(e){ sessionStorage.removeItem(TOKEN_KEY); location.href="index.html"; return false; }
}

async function loadAll(){
  const [costings,tours,rates]=await Promise.all([
    api("/api/admin/finance/tour-costings").catch(()=>[]),
    api("/api/admin/tour-packages").catch(()=>[]),
    api("/api/admin/finance/tour-costing-rates").catch(()=>[])
  ]);
  state.costings=normalizeList(costings); state.tours=normalizeList(tours); state.rates=normalizeList(rates);
  populateTourOptions(); populateRateLists(); renderRegister(); renderRates();
}
function populateTourOptions(){
  const box=$("#tcTourPackage"); if(!box)return; const cur=state.current?.tourPackageId||"";
  box.innerHTML=`<option value="">New / Proposed Tour</option>`+state.tours.map(t=>`<option value="${esc(t.id)}">${esc(t.title||t.name||t.id)}</option>`).join(""); box.value=cur;
}
function populateRateLists(){
  const groups={Hotel:"#tcHotelRates",Transport:"#tcTransportRates",Activity:"#tcActivityRates"};
  Object.entries(groups).forEach(([cat,sel])=>{const box=$(sel); if(box) box.innerHTML=state.rates.filter(r=>r.category===cat).map(r=>`<option value="${esc(r.name)}">${esc(`${r.currency||"USD"} ${r.rate||0} · ${r.basis||""}`)}</option>`).join("")});
  const other=$("#tcOtherRates"); if(other) other.innerHTML=state.rates.filter(r=>!["Hotel","Transport","Activity"].includes(r.category)).map(r=>`<option value="${esc(r.name)}">${esc(`${r.category} · ${r.currency||"USD"} ${r.rate||0}`)}</option>`).join("");
}

function renderRegister(){
  const c=state.costings; const curr=c[0]?.currency||"USD"; const sum=(k)=>c.reduce((s,x)=>s+num(x[k]),0); const completed=c.filter(x=>x.status==="Completed");
  $("#tcStats").innerHTML=[
    ["Total Costings",c.length],["Draft / Working",c.filter(x=>["Draft","Approved","Quoted"].includes(x.status)).length],["Booked",c.filter(x=>x.status==="Booked").length],["Total Quoted Sale",money(sum("finalSale"),curr)],["Completed Profit",money(completed.reduce((s,x)=>s+num(x.grossProfit),0),curr)]
  ].map(([a,b])=>`<div class="tc-stat"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join("");
  const search=($("#tcSearch")?.value||"").toLowerCase(), status=$("#tcStatusFilter")?.value||"all";
  const rows=c.filter(x=>{const txt=`${x.reference||""} ${x.packageName||""} ${x.inquiryRef||""}`.toLowerCase();return(!search||txt.includes(search))&&(status==="all"||x.status===status)});
  $("#tcRegisterBody").innerHTML=rows.length?rows.map(x=>`<tr>
    <td><strong>${esc(x.reference||x.id)}</strong><br><small>${esc(x.inquiryRef||"")}</small></td><td>${esc(x.packageName||"-")}</td><td>R${num(x.revisionNo)}</td><td>${esc(x.travelStart||"-")}</td><td>${esc(x.totalPax??0)}</td>
    <td class="tc-money">${money(x.directCost,x.currency)}</td><td class="tc-money">${money(x.finalSale,x.currency)}</td><td class="tc-money">${money(x.grossProfit,x.currency)}</td><td>${round2(x.marginPct)}%</td><td>${statusPill(x.status)}</td>
    <td><button class="tc-btn small ghost" data-edit-costing="${esc(x.id)}">Open</button></td></tr>`).join(""):`<tr><td colspan="11" class="tc-empty">No costings found.</td></tr>`;
}
function statusPill(s){const cls=s==="Completed"||s==="Booked"?"good":s==="Cancelled"?"bad":s==="Draft"?"warn":"";return `<span class="tc-pill ${cls}">${esc(s||"Draft")}</span>`;}

function openNew(){ state.current=blankCosting(); state.dirty=false; state.activeStep="setup"; showMain("editor"); renderEditor(); }
async function openCosting(id){
  try{ const row=await api(`/api/admin/finance/tour-costings/${encodeURIComponent(id)}`); state.current=sanitizeCurrent(row.payload||row); if(!state.current.id) state.current.id=row.id; if(!state.current.reference) state.current.reference=row.reference; state.dirty=false; state.activeStep="setup"; showMain("editor"); renderEditor(); }
  catch(e){toast(e.message,true)}
}
function renderEditor(){
  const c=state.current; if(!c)return;
  populateTourOptions();
  $$("[data-field]").forEach(el=>{const v=pathGet(c,el.dataset.field); el.value=v??"";});
  $("#tcTotalPax").value=totalPax(c); $("#tcEditorMode").textContent=c.id?`EDIT COSTING · REV ${num(c.revisionNo)}`:"NEW COSTING"; $("#tcEditorTitle").textContent=c.packageName||"New Tour Costing"; $("#tcEditorSub").textContent=c.reference?`${c.reference}${c.inquiryRef?` · ${c.inquiryRef}`:""}`:"Estimate the full package cost and selling price before quotation.";
  $("#tcDeleteBtn").disabled=!c.id; $("#tcRevisionBtn").disabled=!c.id;
  renderSection("hotels"); renderSection("transport"); renderSection("activities"); renderSection("staff"); renderSection("extras"); renderSummary(); setStep(state.activeStep); setDirty(false);
}
function lineInput(section,i,key,value,type="text",extra="") { return `<input ${type!=="text"?`type="${type}"`:""} data-section="${section}" data-index="${i}" data-key="${key}" value="${esc(value??"")}" ${extra}>`; }
function lineSelect(section,i,key,value,opts){return `<select data-section="${section}" data-index="${i}" data-key="${key}">${opts.map(o=>`<option${o===value?" selected":""}>${esc(o)}</option>`).join("")}</select>`;}
function removeBtn(section,i){return `<button type="button" class="tc-icon-btn" data-remove-row="${section}" data-index="${i}" title="Remove">×</button>`;}
function renderSection(section){ const c=state.current; if(!c)return; const currency=c.currency||"USD";
  if(section==="hotels") $("#tcHotelsBody").innerHTML=c.hotels.length?c.hotels.map((r,i)=>`<tr>${td(lineInput("hotels",i,"day",r.day))}${td(lineInput("hotels",i,"hotel",r.hotel,"text",'class="wide" list="tcHotelRates" data-rate-category="Hotel"'))}${td(lineInput("hotels",i,"location",r.location))}${td(lineSelect("hotels",i,"mealPlan",r.mealPlan||"BB",["RO","BB","HB","FB","AI","Other"]))}${td(lineInput("hotels",i,"roomSetup",r.roomSetup||"1 Double"))}${td(lineInput("hotels",i,"qty",r.qty||1,"number",'min="0" step="1"'))}${td(lineInput("hotels",i,"rate",r.rate||0,"number",'min="0" step="0.01"'))}${td(lineInput("hotels",i,"extra",r.extra||0,"number",'min="0" step="0.01"'))}<td class="tc-line-total" data-line-total="hotels-${i}">${money(hotelEst(r),currency)}</td>${td(lineInput("hotels",i,"actual",r.actual||"","number",'min="0" step="0.01"'))}${td(removeBtn("hotels",i))}</tr>`).join(""):emptyRow(11,"No hotel rows yet.");
  if(section==="transport") $("#tcTransportBody").innerHTML=c.transport.length?c.transport.map((r,i)=>`<tr>${td(lineInput("transport",i,"day",r.day))}${td(lineInput("transport",i,"route",r.route,"text",'class="wide"'))}${td(lineInput("transport",i,"vehicle",r.vehicle,"text",'list="tcTransportRates" data-rate-category="Transport"'))}${td(lineSelect("transport",i,"basis",r.basis||"Per Day",["Per Day","Per Km","Per Tour","Fixed"]))}${td(lineInput("transport",i,"qty",r.qty||1,"number",'min="0" step="0.01"'))}${td(lineInput("transport",i,"rate",r.rate||0,"number",'min="0" step="0.01"'))}${td(lineInput("transport",i,"tolls",r.tolls||0,"number",'min="0" step="0.01"'))}${td(lineInput("transport",i,"parking",r.parking||0,"number",'min="0" step="0.01"'))}<td class="tc-line-total" data-line-total="transport-${i}">${money(transportEst(r),currency)}</td>${td(lineInput("transport",i,"actual",r.actual||"","number",'min="0" step="0.01"'))}${td(removeBtn("transport",i))}</tr>`).join(""):emptyRow(11,"No transport rows yet.");
  if(section==="activities") $("#tcActivitiesBody").innerHTML=c.activities.length?c.activities.map((r,i)=>`<tr>${td(lineInput("activities",i,"day",r.day))}${td(lineInput("activities",i,"activity",r.activity,"text",'class="wide" list="tcActivityRates" data-rate-category="Activity"'))}${td(lineInput("activities",i,"location",r.location))}${td(lineSelect("activities",i,"basis",r.basis||"Per Pax",["Per Pax","Per Team","Per Jeep","Per Boat","Per Unit","Fixed"]))}${td(lineInput("activities",i,"qty",r.qty||1,"number",'min="0" step="0.01"'))}${td(lineInput("activities",i,"rate",r.rate||0,"number",'min="0" step="0.01"'))}<td class="tc-line-total" data-line-total="activities-${i}">${money(activityEst(r),currency)}</td>${td(lineInput("activities",i,"actual",r.actual||"","number",'min="0" step="0.01"'))}${td(lineInput("activities",i,"remark",r.remark))}${td(removeBtn("activities",i))}</tr>`).join(""):emptyRow(10,"No activities yet.");
  if(section==="staff") $("#tcStaffBody").innerHTML=c.staff.length?c.staff.map((r,i)=>`<tr>${td(lineInput("staff",i,"day",r.day))}${td(lineSelect("staff",i,"type",r.type||"Driver",["Driver","Chauffeur Guide","National Guide","Tour Leader","Other"]))}${td(lineSelect("staff",i,"requirement",r.requirement||"Required",["Required","Included","Not Required"]))}${td(lineInput("staff",i,"qty",r.qty||1,"number",'min="0" step="0.01"'))}${td(lineInput("staff",i,"feeRate",r.feeRate||0,"number",'min="0" step="0.01"'))}${td(lineInput("staff",i,"hotel",r.hotel||0,"number",'min="0" step="0.01"'))}${td(lineInput("staff",i,"food",r.food||0,"number",'min="0" step="0.01"'))}<td class="tc-line-total" data-line-total="staff-${i}">${money(staffEst(r),currency)}</td>${td(lineInput("staff",i,"actual",r.actual||"","number",'min="0" step="0.01"'))}${td(lineInput("staff",i,"remark",r.remark))}${td(removeBtn("staff",i))}</tr>`).join(""):emptyRow(11,"No driver / guide costs yet.");
  if(section==="extras") $("#tcExtrasBody").innerHTML=c.extras.length?c.extras.map((r,i)=>`<tr>${td(lineInput("extras",i,"day",r.day))}${td(lineSelect("extras",i,"category",r.category||"Consumable",["Meal","Consumable","Ticket","Visa","Insurance","Permit","Tip","Marketing","Other"]))}${td(lineInput("extras",i,"description",r.description,"text",'class="wide" list="tcOtherRates"'))}${td(lineSelect("extras",i,"basis",r.basis||"Per Unit",["Per Day","Per Pax","Per Unit","Per Tour","Fixed"]))}${td(lineInput("extras",i,"qty",r.qty||1,"number",'min="0" step="0.01"'))}${td(lineInput("extras",i,"rate",r.rate||0,"number",'min="0" step="0.01"'))}<td class="tc-line-total" data-line-total="extras-${i}">${money(extraEst(r),currency)}</td>${td(lineInput("extras",i,"actual",r.actual||"","number",'min="0" step="0.01"'))}${td(lineInput("extras",i,"remark",r.remark))}${td(removeBtn("extras",i))}</tr>`).join(""):emptyRow(10,"No other costs yet.");
}
function td(x){return `<td>${x}</td>`} function emptyRow(n,msg){return `<tr><td colspan="${n}" class="tc-empty">${esc(msg)}</td></tr>`}
function addRow(section){ const c=state.current; const defaults={hotels:{day:"Night 1",hotel:"",location:"",mealPlan:"BB",roomSetup:"1 Double",qty:1,rate:0,extra:0,actual:""},transport:{day:"Day 1",route:"",vehicle:c.vehiclePreference||"",basis:"Per Day",qty:1,rate:0,tolls:0,parking:0,actual:""},activities:{day:"Day 1",activity:"",location:"",basis:"Per Pax",qty:Math.max(1,num(c.adultPax)+num(c.childWithBed)+num(c.childWithoutBed)),rate:0,actual:"",remark:""},staff:{day:"Day 1",type:"Driver",requirement:"Required",qty:1,feeRate:0,hotel:0,food:0,actual:"",remark:""},extras:{day:"",category:"Consumable",description:"",basis:"Per Unit",qty:1,rate:0,actual:"",remark:""}}; c[section].push(defaults[section]); renderSection(section); setDirty(); renderSummary(); }
function generateDayRows(){
  const c=state.current;if(!c)return;
  const days=Math.max(1,Math.floor(num(c.days)||1)), nights=Math.max(0,Math.floor(num(c.nights)));
  if(c.hotels.length||c.transport.length){if(!confirm("This will replace current Hotel and Transport day rows. Continue?"))return;}
  c.hotels=Array.from({length:nights},(_,i)=>({day:`Night ${i+1}`,hotel:"",location:"",mealPlan:"BB",roomSetup:"1 Double",qty:1,rate:0,extra:0,actual:""}));
  c.transport=Array.from({length:days},(_,i)=>({day:`Day ${i+1}`,route:"",vehicle:c.vehiclePreference||"",basis:"Per Day",qty:1,rate:0,tolls:0,parking:0,actual:""}));
  renderSection("hotels");renderSection("transport");setDirty();renderSummary();toast(`${days} transport days and ${nights} hotel nights generated`);
}
function removeRow(section,i){ state.current[section].splice(i,1); renderSection(section); setDirty(); renderSummary(); }
function updateLine(section,i,key,value,el,allowAutoRate=false){ const row=state.current[section][i]; if(!row)return; row[key]=el?.type==="number"?(value===""?"":num(value)):value; if(allowAutoRate) autoRate(section,row,key,value); setDirty(); updateLineTotal(section,i); renderSummary(); }
function autoRate(section,row,key,value){
  const map={hotels:["Hotel","hotel"],transport:["Transport","vehicle"],activities:["Activity","activity"],extras:[null,"description"]}; const m=map[section]; if(!m||key!==m[1])return;
  const hit=state.rates.find(r=>(!m[0]||r.category===m[0])&&String(r.name||"").trim().toLowerCase()===String(value||"").trim().toLowerCase()); if(!hit)return;
  const costingCurrency=state.current.currency||"USD"; const rateCurrency=hit.currency||costingCurrency; let appliedRate=num(hit.rate);
  if(rateCurrency!==costingCurrency){
    if(rateCurrency==="LKR" && costingCurrency!=="LKR" && num(state.current.exchangeRate)>0) appliedRate=appliedRate/num(state.current.exchangeRate);
    else { toast(`Rate is ${rateCurrency}; costing is ${costingCurrency}. Convert it before use.`,true); return; }
  }
  if(section==="hotels") row.rate=round2(appliedRate); else if(section==="transport"){row.rate=round2(appliedRate);row.basis=hit.basis||row.basis;} else if(section==="activities"){row.rate=round2(appliedRate);row.basis=hit.basis||row.basis;} else if(section==="extras"){row.rate=round2(appliedRate);row.basis=hit.basis||row.basis;}
  renderSection(section); toast(`Rate applied: ${money(appliedRate,costingCurrency)}${hit.supplier?` · ${hit.supplier}`:""}`);
}
function updateLineTotal(section,i){ const r=state.current[section][i]; const fn={hotels:hotelEst,transport:transportEst,activities:activityEst,staff:staffEst,extras:extraEst}[section]; const el=$(`[data-line-total="${section}-${i}"]`); if(el)el.textContent=money(fn(r),state.current.currency); }

function renderSummary(){ if(!state.current)return; const c=state.current,s=computeSummary(c); c.summary=s; const cur=c.currency||"USD";
  $("#tcSummaryRef").textContent=c.reference||"Unsaved"; $("#tcDirectCost").textContent=money(s.directCost,cur); $("#tcCostBeforeProfit").textContent=money(s.costBeforeProfit,cur); $("#tcFinalSale").textContent=money(s.finalSale,cur); $("#tcProfit").textContent=money(s.operatingProfit,cur); $("#tcMargin").textContent=`${s.marginPct}%`; $("#tcActualCost").textContent=money(s.actualCost,cur); $("#tcActualVariance").textContent=money(s.actualVariance,cur); $("#tcTotalPax").value=totalPax(c);
  $("#tcPerPerson").innerHTML=`<h4>Selling Rate Guide</h4><div><span>Adult</span><strong>${money(s.adultRate,cur)}</strong></div><div><span>Child With Bed</span><strong>${money(s.childWBRate,cur)}</strong></div><div><span>Child Without Bed</span><strong>${money(s.childWOBRate,cur)}</strong></div><div><span>Infant</span><strong>${money(s.infantRate,cur)}</strong></div>`;
  $("#tcSaleBreakdown").innerHTML=[["Direct Cost",s.directCost],["Contingency",s.contingency],["Overhead / Admin",s.overhead],["Cost Before Profit",s.costBeforeProfit],["Core Selling",s.coreSale],["Discount",-s.discount],["Agent Commission",s.agentCommission],["Bank / Card Fee",s.bankFee],["Tax / VAT",s.vat],["Final Customer Price",s.finalSale],["Operating Profit",s.operatingProfit],["Profit Margin",`${s.marginPct}%`]].map(([a,b])=>`<div class="tc-break-item"><span>${esc(a)}</span><strong>${typeof b==="string"?esc(b):money(b,cur)}</strong></div>`).join("");
  $("#tcVarianceCards").innerHTML=[["Estimated Direct",s.directCost],["Actual Direct",s.actualCost],["Cost Variance",s.actualVariance],["Actual Profit",s.actualProfit]].map(([a,b])=>`<div class="tc-variance-card"><span>${esc(a)}</span><strong>${money(b,cur)}</strong></div>`).join("");
}

function setStep(step){ state.activeStep=step; $$("[data-step]").forEach(b=>b.classList.toggle("active",b.dataset.step===step)); $$("[data-step-pane]").forEach(p=>p.classList.toggle("active",p.dataset.stepPane===step)); }
function showMain(which){ $$("[data-main-tab]").forEach(b=>b.classList.toggle("active",b.dataset.mainTab===which)); ["register","editor","rates"].forEach(x=>$(`#tc${x[0].toUpperCase()+x.slice(1)}Pane`)?.classList.toggle("active",x===which)); }

async function saveCurrent(){
  const c=state.current; if(!c?.packageName?.trim()){toast("Package Name is required",true);setStep("setup");return;}
  c.summary=computeSummary(c); const payload={...c,totalPax:totalPax(c),summary:c.summary};
  try{
    const path=c.id?`/api/admin/finance/tour-costings/${encodeURIComponent(c.id)}`:"/api/admin/finance/tour-costings"; const res=await api(path,{method:c.id?"PUT":"POST",body:JSON.stringify(payload)});
    if(res?.pendingApproval){toast(res.message||"Costing change submitted for approval.");return;}
    const row=res?.costing||res; state.current=sanitizeCurrent(row.payload||payload); state.current.id=row.id||state.current.id; state.current.reference=row.reference||state.current.reference; setDirty(false); await refreshCostings(); renderEditor(); toast(c.id?"Costing updated":"Costing saved");
  }catch(e){toast(e.message,true)}
}
async function refreshCostings(){ state.costings=normalizeList(await api("/api/admin/finance/tour-costings")); renderRegister(); }
async function deleteCurrent(){ const c=state.current;if(!c?.id)return;if(!confirm(`Delete ${c.reference||c.packageName}?`))return;try{const r=await api(`/api/admin/finance/tour-costings/${encodeURIComponent(c.id)}`,{method:"DELETE"});if(r?.pendingApproval){toast(r.message||"Delete submitted for approval");return;}await refreshCostings();showMain("register");toast("Costing deleted");}catch(e){toast(e.message,true)}}
function createRevision(){ const c=state.current;if(!c?.id)return;const clone=JSON.parse(JSON.stringify(c));const next=num(c.revisionNo)+1;const base=String(c.reference||"").replace(/-R\d+$/i,"");clone.id="";clone.rootId=c.rootId||c.id;clone.previousId=c.id;clone.revisionNo=next;clone.reference=base?`${base}-R${next}`:"";clone.status="Draft";clone.notes=`Revision ${next} based on ${c.reference||c.id}.\n${clone.notes||""}`.trim();state.current=clone;state.dirty=true;renderEditor();setDirty(true);toast(`Revision ${next} created as draft`);}
function applyTourSelection(id){ const t=state.tours.find(x=>String(x.id)===String(id)); if(!t)return; state.current.packageName=t.title||state.current.packageName; state.current.currency=t.currency||state.current.currency; if(num(t.basePrice)>0 && state.current.pricing.method==="manual") state.current.pricing.manualSale=num(t.basePrice); const d=parseInt(String(t.duration||"").match(/\d+/)?.[0]||"0",10); if(d){state.current.days=d;if(!state.current.nights||state.current.nights>=d)state.current.nights=Math.max(0,d-1)} renderEditor(); setDirty(true); }

function renderRates(){
  const q=($("#tcRateSearch")?.value||"").toLowerCase(), cat=$("#tcRateCategoryFilter")?.value||"all"; const rows=state.rates.filter(r=>(cat==="all"||r.category===cat)&&(!q||`${r.name} ${r.location} ${r.notes}`.toLowerCase().includes(q)));
  $("#tcRatesBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r.category)}</td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.supplier||"-")}</td><td>${esc(r.location||"-")}</td><td>${esc(r.validFrom||"-")} → ${esc(r.validTo||"-")}</td><td>${esc(r.basis||"-")}</td><td>${esc(r.currency||"USD")}</td><td class="tc-money">${money(r.rate,r.currency)}</td><td>${esc(r.notes||"")}</td><td><button class="tc-btn small ghost" data-edit-rate="${esc(r.id)}">Edit</button> <button class="tc-btn small danger" data-delete-rate="${esc(r.id)}">Delete</button></td></tr>`).join(""):`<tr><td colspan="10" class="tc-empty">No rates saved.</td></tr>`;
}
function openRateForm(r={}){$("#tcRateForm").classList.remove("hidden");$("#tcRateId").value=r.id||"";$("#tcRateCategory").value=r.category||"Hotel";$("#tcRateName").value=r.name||"";$("#tcRateLocation").value=r.location||"";$("#tcRateSupplier").value=r.supplier||"";$("#tcRateValidFrom").value=r.validFrom||"";$("#tcRateValidTo").value=r.validTo||"";$("#tcRateBasis").value=r.basis||"Per Day";$("#tcRateCurrency").value=r.currency||"USD";$("#tcRateAmount").value=r.rate??"";$("#tcRateNotes").value=r.notes||"";}
function closeRateForm(){$("#tcRateForm").classList.add("hidden");$("#tcRateId").value="";}
async function saveRate(){const id=$("#tcRateId").value;const body={category:$("#tcRateCategory").value,name:$("#tcRateName").value.trim(),location:$("#tcRateLocation").value.trim(),supplier:$("#tcRateSupplier").value.trim(),validFrom:$("#tcRateValidFrom").value,validTo:$("#tcRateValidTo").value,basis:$("#tcRateBasis").value,currency:$("#tcRateCurrency").value,rate:num($("#tcRateAmount").value),notes:$("#tcRateNotes").value.trim()};if(!body.name){toast("Rate name is required",true);return;}try{const r=await api(id?`/api/admin/finance/tour-costing-rates/${encodeURIComponent(id)}`:"/api/admin/finance/tour-costing-rates",{method:id?"PUT":"POST",body:JSON.stringify(body)});if(r?.pendingApproval){toast(r.message||"Rate change submitted for approval");return;}state.rates=normalizeList(await api("/api/admin/finance/tour-costing-rates"));populateRateLists();renderRates();closeRateForm();toast("Rate saved");}catch(e){toast(e.message,true)}}
async function deleteRate(id){if(!confirm("Delete this rate library item?"))return;try{const r=await api(`/api/admin/finance/tour-costing-rates/${encodeURIComponent(id)}`,{method:"DELETE"});if(r?.pendingApproval){toast(r.message||"Delete submitted for approval");return;}state.rates=normalizeList(await api("/api/admin/finance/tour-costing-rates"));populateRateLists();renderRates();toast("Rate deleted");}catch(e){toast(e.message,true)}}

function bind(){
  $$("[data-main-tab]").forEach(b=>b.addEventListener("click",()=>showMain(b.dataset.mainTab)));
  $$("[data-step]").forEach(b=>b.addEventListener("click",()=>setStep(b.dataset.step)));
  $("#tcNewBtn").addEventListener("click",openNew); $("#tcGenerateRowsBtn").addEventListener("click",generateDayRows); $("#tcRefreshBtn").addEventListener("click",loadAll); $("#tcSearch").addEventListener("input",renderRegister); $("#tcStatusFilter").addEventListener("change",renderRegister);
  $("#tcRegisterBody").addEventListener("click",e=>{const b=e.target.closest("[data-edit-costing]");if(b)openCosting(b.dataset.editCosting)});
  $("#tcSaveBtn").addEventListener("click",saveCurrent); $("#tcSaveBtnRail").addEventListener("click",saveCurrent); $("#tcDeleteBtn").addEventListener("click",deleteCurrent); $("#tcRevisionBtn").addEventListener("click",createRevision); $("#tcPrintBtn").addEventListener("click",()=>window.print()); $("#tcCopySaleBtn").addEventListener("click",async()=>{const s=computeSummary();await navigator.clipboard.writeText(String(s.finalSale));toast("Final sale copied")});
  $("#tcEditorPane").addEventListener("input",e=>{const el=e.target;if(el.matches("[data-field]")){const path=el.dataset.field;const val=el.type==="number"?(el.value===""?"":num(el.value)):el.value;pathSet(state.current,path,val);if(path==="packageName")$("#tcEditorTitle").textContent=val||"New Tour Costing";setDirty();renderSummary();}});
  $("#tcEditorPane").addEventListener("change",e=>{const el=e.target;if(el.id==="tcTourPackage"){state.current.tourPackageId=el.value;applyTourSelection(el.value);return;}if(el.matches("[data-section][data-key]"))updateLine(el.dataset.section,num(el.dataset.index),el.dataset.key,el.value,el,true);});
  $("#tcEditorPane").addEventListener("input",e=>{const el=e.target;if(el.matches("[data-section][data-key]"))updateLine(el.dataset.section,num(el.dataset.index),el.dataset.key,el.value,el,false);});
  $("#tcEditorPane").addEventListener("click",e=>{const a=e.target.closest("[data-add-row]");if(a)addRow(a.dataset.addRow);const r=e.target.closest("[data-remove-row]");if(r)removeRow(r.dataset.removeRow,num(r.dataset.index));});
  $("#tcAddRateBtn").addEventListener("click",()=>openRateForm()); $("#tcRateCancelBtn").addEventListener("click",closeRateForm); $("#tcRateSaveBtn").addEventListener("click",saveRate); $("#tcRateSearch").addEventListener("input",renderRates); $("#tcRateCategoryFilter").addEventListener("change",renderRates);
  $("#tcRatesBody").addEventListener("click",e=>{const edit=e.target.closest("[data-edit-rate]");if(edit){const r=state.rates.find(x=>String(x.id)===String(edit.dataset.editRate));if(r)openRateForm(r)}const del=e.target.closest("[data-delete-rate]");if(del)deleteRate(del.dataset.deleteRate)});
  window.addEventListener("beforeunload",e=>{if(state.dirty){e.preventDefault();e.returnValue="";}});
}

(async function init(){ bind(); if(!(await ensureSession()))return; try{await loadAll(); showMain("register");}catch(e){toast(e.message,true);$("#tcRegisterBody").innerHTML=`<tr><td colspan="11" class="tc-empty">${esc(e.message)}</td></tr>`;}})();
