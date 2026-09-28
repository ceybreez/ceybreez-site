/* ================================================================
   CEYBREEZ COMMON INQUIRY SYSTEM
   FILE: inquiry-common.js
   PURPOSE:
     1) Country dropdown on every inquiry form.
     2) Auto dial-code in mobile field after country selection.
     3) One success/reference sheet for every inquiry page.
     4) Shared helpers used by Contact / Stays / Tours / Tour Details.
   EDITING TIP: Search for "INQUIRY COMMON".
   ================================================================ */
(function(){
  "use strict";

  const COUNTRIES=[{"name":"Afghanistan","iso2":"af","dial":"93"},{"name":"Albania","iso2":"al","dial":"355"},{"name":"Algeria","iso2":"dz","dial":"213"},{"name":"American Samoa","iso2":"as","dial":"1684"},{"name":"Angola","iso2":"ao","dial":"244"},{"name":"Anguilla","iso2":"ai","dial":"1264"},{"name":"Antigua and Barbuda","iso2":"ag","dial":"1268"},{"name":"Argentina","iso2":"ar","dial":"54"},{"name":"Armenia","iso2":"am","dial":"374"},{"name":"Aruba","iso2":"aw","dial":"297"},{"name":"Australia","iso2":"au","dial":"61"},{"name":"Austria","iso2":"at","dial":"43"},{"name":"Azerbaijan","iso2":"az","dial":"994"},{"name":"Bahrain","iso2":"bh","dial":"973"},{"name":"Bangladesh","iso2":"bd","dial":"880"},{"name":"Barbados","iso2":"bb","dial":"1246"},{"name":"Belarus","iso2":"by","dial":"375"},{"name":"Belgium","iso2":"be","dial":"32"},{"name":"Belize","iso2":"bz","dial":"501"},{"name":"Benin","iso2":"bj","dial":"229"},{"name":"Bermuda","iso2":"bm","dial":"1441"},{"name":"Bhutan","iso2":"bt","dial":"975"},{"name":"Bolivia","iso2":"bo","dial":"591"},{"name":"Bosnia and Herzegovina","iso2":"ba","dial":"387"},{"name":"Botswana","iso2":"bw","dial":"267"},{"name":"Brazil","iso2":"br","dial":"55"},{"name":"British Indian Ocean Territory","iso2":"io","dial":"246"},{"name":"Brunei","iso2":"bn","dial":"673"},{"name":"Bulgaria","iso2":"bg","dial":"359"},{"name":"Burkina Faso","iso2":"bf","dial":"226"},{"name":"Burundi","iso2":"bi","dial":"257"},{"name":"Cambodia","iso2":"kh","dial":"855"},{"name":"Cameroon","iso2":"cm","dial":"237"},{"name":"Canada","iso2":"ca","dial":"1"},{"name":"Cape Verde","iso2":"cv","dial":"238"},{"name":"Cayman Islands","iso2":"ky","dial":"1345"},{"name":"Central African Republic","iso2":"cf","dial":"236"},{"name":"Chad","iso2":"td","dial":"235"},{"name":"Chile","iso2":"cl","dial":"56"},{"name":"China","iso2":"cn","dial":"86"},{"name":"Christmas Island","iso2":"cx","dial":"61"},{"name":"Cocos (Keeling) Islands","iso2":"cc","dial":"61"},{"name":"Colombia","iso2":"co","dial":"57"},{"name":"Comoros","iso2":"km","dial":"269"},{"name":"Cook Islands","iso2":"ck","dial":"682"},{"name":"Costa Rica","iso2":"cr","dial":"506"},{"name":"Croatia","iso2":"hr","dial":"385"},{"name":"Cuba","iso2":"cu","dial":"53"},{"name":"Cyprus","iso2":"cy","dial":"357"},{"name":"Czech Republic","iso2":"cz","dial":"420"},{"name":"Democratic Republic of the Congo","iso2":"cd","dial":"243"},{"name":"Denmark","iso2":"dk","dial":"45"},{"name":"Djibouti","iso2":"dj","dial":"253"},{"name":"Dominica","iso2":"dm","dial":"1767"},{"name":"Dominican Republic","iso2":"do","dial":"1809"},{"name":"East Timor","iso2":"tl","dial":"670"},{"name":"Ecuador","iso2":"ec","dial":"593"},{"name":"Egypt","iso2":"eg","dial":"20"},{"name":"El Salvador","iso2":"sv","dial":"503"},{"name":"Equatorial Guinea","iso2":"gq","dial":"240"},{"name":"Eritrea","iso2":"er","dial":"291"},{"name":"Estonia","iso2":"ee","dial":"372"},{"name":"Ethiopia","iso2":"et","dial":"251"},{"name":"Falkland Islands","iso2":"fk","dial":"500"},{"name":"Faroe Islands","iso2":"fo","dial":"298"},{"name":"Federated States of Micronesia","iso2":"fm","dial":"691"},{"name":"Fiji","iso2":"fj","dial":"679"},{"name":"Finland","iso2":"fi","dial":"358"},{"name":"France","iso2":"fr","dial":"33"},{"name":"French Guiana","iso2":"gf","dial":"594"},{"name":"French Polynesia","iso2":"pf","dial":"689"},{"name":"Gabon","iso2":"ga","dial":"241"},{"name":"Georgia","iso2":"ge","dial":"995"},{"name":"Germany","iso2":"de","dial":"49"},{"name":"Ghana","iso2":"gh","dial":"233"},{"name":"Gibraltar","iso2":"gi","dial":"350"},{"name":"Greece","iso2":"gr","dial":"30"},{"name":"Greenland","iso2":"gl","dial":"299"},{"name":"Grenada","iso2":"gd","dial":"1473"},{"name":"Guadeloupe","iso2":"gp","dial":"590"},{"name":"Guam","iso2":"gu","dial":"1671"},{"name":"Guatemala","iso2":"gt","dial":"502"},{"name":"Guernsey","iso2":"gg","dial":"44"},{"name":"Guinea","iso2":"gn","dial":"224"},{"name":"Guinea-Bissau","iso2":"gw","dial":"245"},{"name":"Guyana","iso2":"gy","dial":"592"},{"name":"Haiti","iso2":"ht","dial":"509"},{"name":"Honduras","iso2":"hn","dial":"504"},{"name":"Hong Kong","iso2":"hk","dial":"852"},{"name":"Hungary","iso2":"hu","dial":"36"},{"name":"Iceland","iso2":"is","dial":"354"},{"name":"India","iso2":"in","dial":"91"},{"name":"Indonesia","iso2":"id","dial":"62"},{"name":"Iran","iso2":"ir","dial":"98"},{"name":"Iraq","iso2":"iq","dial":"964"},{"name":"Ireland","iso2":"ie","dial":"353"},{"name":"Isle of Man","iso2":"im","dial":"44"},{"name":"Israel","iso2":"il","dial":"972"},{"name":"Italy","iso2":"it","dial":"39"},{"name":"Ivory Coast","iso2":"ci","dial":"225"},{"name":"Jamaica","iso2":"jm","dial":"1876"},{"name":"Japan","iso2":"jp","dial":"81"},{"name":"Jersey","iso2":"je","dial":"44"},{"name":"Jordan","iso2":"jo","dial":"962"},{"name":"Kazakhstan","iso2":"kz","dial":"76"},{"name":"Kenya","iso2":"ke","dial":"254"},{"name":"Kiribati","iso2":"ki","dial":"686"},{"name":"Kuwait","iso2":"kw","dial":"965"},{"name":"Kyrgyzstan","iso2":"kg","dial":"996"},{"name":"Laos","iso2":"la","dial":"856"},{"name":"Latvia","iso2":"lv","dial":"371"},{"name":"Lebanon","iso2":"lb","dial":"961"},{"name":"Lesotho","iso2":"ls","dial":"266"},{"name":"Liberia","iso2":"lr","dial":"231"},{"name":"Libya","iso2":"ly","dial":"218"},{"name":"Liechtenstein","iso2":"li","dial":"423"},{"name":"Lithuania","iso2":"lt","dial":"370"},{"name":"Luxembourg","iso2":"lu","dial":"352"},{"name":"Macau","iso2":"mo","dial":"853"},{"name":"Madagascar","iso2":"mg","dial":"261"},{"name":"Malawi","iso2":"mw","dial":"265"},{"name":"Malaysia","iso2":"my","dial":"60"},{"name":"Maldives","iso2":"mv","dial":"960"},{"name":"Mali","iso2":"ml","dial":"223"},{"name":"Malta","iso2":"mt","dial":"356"},{"name":"Marshall Islands","iso2":"mh","dial":"692"},{"name":"Martinique","iso2":"mq","dial":"596"},{"name":"Mauritania","iso2":"mr","dial":"222"},{"name":"Mauritius","iso2":"mu","dial":"230"},{"name":"Mayotte","iso2":"yt","dial":"262"},{"name":"Mexico","iso2":"mx","dial":"52"},{"name":"Moldova","iso2":"md","dial":"373"},{"name":"Monaco","iso2":"mc","dial":"377"},{"name":"Mongolia","iso2":"mn","dial":"976"},{"name":"Montserrat","iso2":"ms","dial":"1664"},{"name":"Morocco","iso2":"ma","dial":"212"},{"name":"Mozambique","iso2":"mz","dial":"258"},{"name":"Namibia","iso2":"na","dial":"264"},{"name":"Nauru","iso2":"nr","dial":"674"},{"name":"Nepal","iso2":"np","dial":"977"},{"name":"Netherlands","iso2":"nl","dial":"31"},{"name":"New Caledonia","iso2":"nc","dial":"687"},{"name":"New Zealand","iso2":"nz","dial":"64"},{"name":"Nicaragua","iso2":"ni","dial":"505"},{"name":"Niger","iso2":"ne","dial":"227"},{"name":"Nigeria","iso2":"ng","dial":"234"},{"name":"Niue","iso2":"nu","dial":"683"},{"name":"Norfolk Island","iso2":"nf","dial":"672"},{"name":"North Korea","iso2":"kp","dial":"850"},{"name":"Northern Mariana Islands","iso2":"mp","dial":"1670"},{"name":"Norway","iso2":"no","dial":"47"},{"name":"Oman","iso2":"om","dial":"968"},{"name":"Pakistan","iso2":"pk","dial":"92"},{"name":"Palau","iso2":"pw","dial":"680"},{"name":"Panama","iso2":"pa","dial":"507"},{"name":"Papua New Guinea","iso2":"pg","dial":"675"},{"name":"Paraguay","iso2":"py","dial":"595"},{"name":"Peru","iso2":"pe","dial":"51"},{"name":"Philippines","iso2":"ph","dial":"63"},{"name":"Pitcairn Islands","iso2":"pn","dial":"64"},{"name":"Poland","iso2":"pl","dial":"48"},{"name":"Portugal","iso2":"pt","dial":"351"},{"name":"Puerto Rico","iso2":"pr","dial":"1787"},{"name":"Qatar","iso2":"qa","dial":"974"},{"name":"Republic of Macedonia","iso2":"mk","dial":"389"},{"name":"Republic of the Congo","iso2":"cg","dial":"242"},{"name":"Romania","iso2":"ro","dial":"40"},{"name":"Russia","iso2":"ru","dial":"7"},{"name":"Rwanda","iso2":"rw","dial":"250"},{"name":"Réunion","iso2":"re","dial":"262"},{"name":"Saint Helena","iso2":"sh","dial":"290"},{"name":"Saint Kitts and Nevis","iso2":"kn","dial":"1869"},{"name":"Saint Lucia","iso2":"lc","dial":"1758"},{"name":"Saint Pierre and Miquelon","iso2":"pm","dial":"508"},{"name":"Saint Vincent and the Grenadines","iso2":"vc","dial":"1784"},{"name":"Samoa","iso2":"ws","dial":"685"},{"name":"San Marino","iso2":"sm","dial":"378"},{"name":"Saudi Arabia","iso2":"sa","dial":"966"},{"name":"Senegal","iso2":"sn","dial":"221"},{"name":"Serbia","iso2":"rs","dial":"381"},{"name":"Seychelles","iso2":"sc","dial":"248"},{"name":"Sierra Leone","iso2":"sl","dial":"232"},{"name":"Singapore","iso2":"sg","dial":"65"},{"name":"Slovakia","iso2":"sk","dial":"421"},{"name":"Slovenia","iso2":"si","dial":"386"},{"name":"Solomon Islands","iso2":"sb","dial":"677"},{"name":"Somalia","iso2":"so","dial":"252"},{"name":"South Africa","iso2":"za","dial":"27"},{"name":"South Georgia","iso2":"gs","dial":"500"},{"name":"South Korea","iso2":"kr","dial":"82"},{"name":"South Sudan","iso2":"ss","dial":"211"},{"name":"Spain","iso2":"es","dial":"34"},{"name":"Sri Lanka","iso2":"lk","dial":"94"},{"name":"Sudan","iso2":"sd","dial":"249"},{"name":"Suriname","iso2":"sr","dial":"597"},{"name":"Svalbard and Jan Mayen","iso2":"sj","dial":"4779"},{"name":"Swaziland","iso2":"sz","dial":"268"},{"name":"Sweden","iso2":"se","dial":"46"},{"name":"Switzerland","iso2":"ch","dial":"41"},{"name":"Syria","iso2":"sy","dial":"963"},{"name":"São Tomé and Príncipe","iso2":"st","dial":"239"},{"name":"Taiwan","iso2":"tw","dial":"886"},{"name":"Tajikistan","iso2":"tj","dial":"992"},{"name":"Tanzania","iso2":"tz","dial":"255"},{"name":"Thailand","iso2":"th","dial":"66"},{"name":"The Bahamas","iso2":"bs","dial":"1242"},{"name":"The Gambia","iso2":"gm","dial":"220"},{"name":"Togo","iso2":"tg","dial":"228"},{"name":"Tokelau","iso2":"tk","dial":"690"},{"name":"Tonga","iso2":"to","dial":"676"},{"name":"Trinidad and Tobago","iso2":"tt","dial":"1868"},{"name":"Tunisia","iso2":"tn","dial":"216"},{"name":"Turkey","iso2":"tr","dial":"90"},{"name":"Turkmenistan","iso2":"tm","dial":"993"},{"name":"Tuvalu","iso2":"tv","dial":"688"},{"name":"Uganda","iso2":"ug","dial":"256"},{"name":"Ukraine","iso2":"ua","dial":"380"},{"name":"United Arab Emirates","iso2":"ae","dial":"971"},{"name":"United Kingdom","iso2":"gb","dial":"44"},{"name":"United States","iso2":"us","dial":"1"},{"name":"Uruguay","iso2":"uy","dial":"598"},{"name":"Uzbekistan","iso2":"uz","dial":"998"},{"name":"Vanuatu","iso2":"vu","dial":"678"},{"name":"Venezuela","iso2":"ve","dial":"58"},{"name":"Vietnam","iso2":"vn","dial":"84"},{"name":"Wallis and Futuna","iso2":"wf","dial":"681"},{"name":"Western Sahara","iso2":"eh","dial":"212"},{"name":"Yemen","iso2":"ye","dial":"967"},{"name":"Zambia","iso2":"zm","dial":"260"},{"name":"Zimbabwe","iso2":"zw","dial":"263"}];
  const COMMON_FIRST=["lk","om","in","ae","qa","sa","gb","us","au","ca","de","fr","it","nl","ch"];
  const API_BASE="https://ceybreez-contact-api.ceybreez.workers.dev";

  function byId(id){ return document.getElementById(id); }
  function clean(v){ return String(v || "").trim(); }
  function escapeHtml(v){ return String(v||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

  function orderedCountries(){
    const fav=[]; const rest=[];
    COUNTRIES.forEach(c => (COMMON_FIRST.includes(c.iso2) ? fav : rest).push(c));
    fav.sort((a,b)=>COMMON_FIRST.indexOf(a.iso2)-COMMON_FIRST.indexOf(b.iso2));
    return [...fav, ...rest];
  }

  function replaceWithCountrySelect(el){
    if(!el) return null;
    if(el.tagName === "SELECT") return el;
    const select=document.createElement("select");
    [...el.attributes].forEach(a=>{
      if(a.name !== "type" && a.name !== "placeholder") select.setAttribute(a.name,a.value);
    });
    select.id=el.id;
    select.name=el.name || el.id;
    if(el.required) select.required=true;
    select.className=el.className;
    el.replaceWith(select);
    return select;
  }

  function populateCountrySelect(select){
    if(!select) return;
    const old=clean(select.value);
    select.innerHTML='<option value="">Select your country</option>';
    orderedCountries().forEach(c=>{
      const option=document.createElement("option");
      option.value=c.name;
      option.dataset.iso2=c.iso2;
      option.dataset.dial=c.dial;
      option.textContent=`${c.name} (+${c.dial})`;
      select.appendChild(option);
    });
    if(old){
      const exact=[...select.options].find(o=>o.value===old);
      if(exact) select.value=old;
    }
  }

  function selectedCountry(select){
    if(!select || !select.value) return null;
    const opt=select.options[select.selectedIndex];
    if(opt?.dataset?.dial) return {name:select.value, iso2:opt.dataset.iso2||"", dial:opt.dataset.dial||""};
    return COUNTRIES.find(c=>c.name===select.value) || null;
  }

  function setPhonePrefix(phone, dial){
    if(!phone || !dial) return;
    let current=clean(phone.value);
    const oldDial=phone.dataset.cbDial || "";
    let national=current;
    if(oldDial && current.startsWith("+"+oldDial)) national=clean(current.slice(oldDial.length+1));
    else if(/^\+\d+\s*$/.test(current)) national="";
    phone.dataset.cbDial=dial;
    phone.value=`+${dial}${national ? " " + national : " "}`;
    requestAnimationFrame(()=>{ try{ phone.setSelectionRange(phone.value.length, phone.value.length); }catch(e){} });
  }

  function bindPair(countryId, phoneId){
    let country=byId(countryId);
    const phone=byId(phoneId);
    if(!country || !phone) return;
    country=replaceWithCountrySelect(country);
    populateCountrySelect(country);
    country.dataset.cbCountry="1";
    phone.dataset.cbPhone="1";
    country.addEventListener("change",()=>{
      const c=selectedCountry(country);
      if(c) setPhonePrefix(phone,c.dial);
      else { phone.dataset.cbDial=""; if(/^\+\d+\s*$/.test(clean(phone.value))) phone.value=""; }
    });
    phone.addEventListener("focus",()=>{
      if(!clean(phone.value)){
        const c=selectedCountry(country);
        if(c) setPhonePrefix(phone,c.dial);
      }
    });
    phone.addEventListener("blur",()=>{
      const c=selectedCountry(country);
      if(c && !clean(phone.value)) setPhonePrefix(phone,c.dial);
    });
  }

  function getCountry(id){ return clean(byId(id)?.value); }
  function getPhone(id){
    const el=byId(id);
    const value=clean(el?.value).replace(/\s+/g," ");
    if(!value) return "";
    const digits=value.replace(/\D/g,"");
    const dial=el?.dataset?.cbDial || "";
    if(dial && digits === dial) return "";
    if(digits.length < 6) return "";
    return value;
  }
  function getDialCode(countryId){
    const c=selectedCountry(byId(countryId));
    return c ? `+${c.dial}` : "";
  }

  function emailState(result){
    return {
      adminSent: result?.adminEmail?.success === true,
      guestSent: result?.guestEmail?.success === true
    };
  }

  function ensureSuccessSheet(){
    let sheet=byId("cbInquirySuccessSheet");
    if(sheet) return sheet;
    sheet=document.createElement("div");
    sheet.id="cbInquirySuccessSheet";
    sheet.className="cb-inquiry-success-backdrop";
    sheet.setAttribute("aria-hidden","true");
    sheet.innerHTML=`
      <div class="cb-inquiry-success-card" role="dialog" aria-modal="true" aria-labelledby="cbInquirySuccessTitle">
        <button type="button" class="cb-inquiry-success-close" aria-label="Close">×</button>
        <div class="cb-inquiry-success-icon">✓</div>
        <span class="cb-inquiry-success-kicker">REQUEST RECEIVED</span>
        <h2 id="cbInquirySuccessTitle">Thank you. Your inquiry is in.</h2>
        <p class="cb-inquiry-success-copy">We’ve saved your request and will review the details shortly.</p>
        <div class="cb-inquiry-success-reference"><span>Inquiry reference</span><strong id="cbInquirySuccessReference">—</strong></div>
        <p class="cb-inquiry-success-email" id="cbInquirySuccessEmail"></p>
        <div class="cb-inquiry-success-actions">
          <button type="button" data-cb-close-success>Close</button>
          <a href="https://api.whatsapp.com/send?phone=94704620017" target="_blank" rel="noopener">WhatsApp CeyBreez</a>
        </div>
      </div>`;
    document.body.appendChild(sheet);
    const close=()=>{ sheet.classList.remove("show"); sheet.setAttribute("aria-hidden","true"); document.documentElement.classList.remove("cb-inquiry-modal-open"); };
    sheet.querySelector(".cb-inquiry-success-close")?.addEventListener("click",close);
    sheet.querySelector("[data-cb-close-success]")?.addEventListener("click",close);
    sheet.addEventListener("click",e=>{ if(e.target===sheet) close(); });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape" && sheet.classList.contains("show")) close(); });
    return sheet;
  }

  function showSuccess(reference, result, options={}){
    const sheet=ensureSuccessSheet();
    const state=emailState(result || {});
    const title=options.title || "Thank you. Your inquiry is in.";
    const copy=options.copy || "We’ve saved your request and will review the details shortly.";
    sheet.querySelector("#cbInquirySuccessTitle").textContent=title;
    sheet.querySelector(".cb-inquiry-success-copy").textContent=copy;
    sheet.querySelector("#cbInquirySuccessReference").textContent=reference || "Reference pending";
    const emailEl=sheet.querySelector("#cbInquirySuccessEmail");
    if(state.adminSent && state.guestSent) emailEl.textContent="Confirmation emails were sent to you and the CeyBreez team.";
    else if(state.adminSent) emailEl.textContent="Your inquiry reached CeyBreez. Guest email delivery could not be confirmed.";
    else if(state.guestSent) emailEl.textContent="Your confirmation email was sent. Admin email delivery could not be confirmed.";
    else emailEl.textContent="Your inquiry is saved. Email delivery could not be confirmed; keep the reference number above.";
    sheet.classList.add("show");
    sheet.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("cb-inquiry-modal-open");
  }

  function resetPair(countryId, phoneId){
    const country=byId(countryId), phone=byId(phoneId);
    if(country) country.value="";
    if(phone){ phone.value=""; phone.dataset.cbDial=""; }
  }

  function decorateForms(){
    ["contactForm","tourInquiryForm","tripForm"].forEach(id=>byId(id)?.classList.add("cb-inquiry-form"));
    [".villa-inquiry-box",".property-inquiry-box"].forEach(sel=>document.querySelector(sel)?.classList.add("cb-inquiry-form"));
  }

  function init(){
    decorateForms();
    bindPair("country","mobile");
    bindPair("inqCountry","inqMobile");
    bindPair("guestCountry","guestMobile");
    ensureSuccessSheet();
  }

  window.CeyBreezInquiry={
    API_BASE, COUNTRIES, init, getCountry, getPhone, getDialCode, showSuccess, emailState, resetPair, bindPair
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
