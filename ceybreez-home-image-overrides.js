(() => {
  'use strict';
  const API='https://ceybreez-contact-api.ceybreez.workers.dev';
  const KEY='home_static_image_overrides_v1';
  const EXCLUDE=[
    '#galleryLightbox','.gallery-lightbox',
    '#homeReelsTrack','.reel-card','#featuredToursGrid','#featuredStaysGrid',
    '#featuredDestinationsGrid','#featuredServicesGrid','.data-grid',
    '.tour-card','.stay-card','.destination-card','.service-card','.property-card',
    '.reviews-showcase','#reviewsShowcase','[data-cms]','[data-dynamic]'
  ].join(',');
  const LOGO_RE=/(^|\/)(logo|favicon)(\.|-|_)/i;
  const clean=v=>String(v??'').trim();
  const parse=v=>{if(!v)return{};if(typeof v==='object')return v;try{return JSON.parse(v)||{}}catch{return{}}};
  const normSrc=(src)=>{try{const u=new URL(src,location.href);return u.origin===location.origin?u.pathname+u.search:u.href}catch{return clean(src)}};
  function eligible(img){
    if(!img || img.tagName!=='IMG') return false;
    if(img.closest(EXCLUDE)) return false;
    if(['welcomeLogo','navLogo','footerLogo','galleryLightboxImage'].includes(img.id)) return false;
    const raw=img.dataset.cbStaticOriginal || img.getAttribute('src') || '';
    if(!raw || LOGO_RE.test(raw)) return false;
    return true;
  }
  function slotInfo(img,i){
    if(img.id==='heroImage') return {key:'home:hero-main',label:'Hero main image'};
    let p=img.closest('.hero-story');
    if(p){const all=[...document.querySelectorAll('.hero-story img')].filter(eligible);const n=all.indexOf(img)+1;return {key:`home:hero-story:${n}`,label:`Hero story card photo ${n}`}}
    if(img.closest('.collage-main')) return {key:'home:about:main',label:'About collage · main photo'};
    if(img.closest('.collage-small.top')) return {key:'home:about:top',label:'About collage · top photo'};
    if(img.closest('.collage-small.bottom')) return {key:'home:about:bottom',label:'About collage · bottom photo'};
    if(img.closest('.thing-card')){const all=[...document.querySelectorAll('.thing-card img')].filter(eligible);const n=all.indexOf(img)+1;return {key:`home:things:${n}`,label:`Things to do card photo ${n}`}}
    if(img.closest('#homeGalleryGrid,.gallery-tile')){const all=[...document.querySelectorAll('#homeGalleryGrid .gallery-tile img,.gallery-tile img')].filter(eligible);const n=all.indexOf(img)+1;return {key:`home:gallery:${n}`,label:`Home gallery photo ${n}`}}
    if(img.closest('.journey-banner')) return {key:'home:journey-banner',label:'Journey banner photo'};
    if(img.closest('.final-cta')) return {key:'home:final-cta',label:'Final call-to-action photo'};
    return {key:`home:static:${i+1}`,label:`Static page photo ${i+1}`};
  }
  function labelFor(img,i){ return slotInfo(img,i).label; }
  function scan(){
    const counts={}; const list=[];
    [...document.images].filter(eligible).forEach((img,i)=>{
      if(!img.dataset.cbStaticOriginal) img.dataset.cbStaticOriginal=img.getAttribute('src')||'';
      const original=img.dataset.cbStaticOriginal;
      const n=normSrc(original); counts[n]=(counts[n]||0)+1;
      const occurrence=counts[n];
      const legacyKey=`img:${encodeURIComponent(n)}#${occurrence}`;
      const info=slotInfo(img,i);
      const key=info.key;
      img.dataset.cbStaticKey=key;
      img.dataset.cbStaticLegacyKey=legacyKey;
      list.push({key,legacyKey,original,norm:n,occurrence,label:info.label,element:img});
    });
    return list;
  }
  function applyMap(map={}){
    const targets=scan();
    targets.forEach(t=>{
      const item=map[t.key] || map[t.legacyKey];
      const src=clean(item?.src);
      t.element.setAttribute('src',src||t.original);
      if(src) t.element.dataset.cbStaticOverridden='1'; else delete t.element.dataset.cbStaticOverridden;
    });
    return targets;
  }
  async function load(){
    try{
      const r=await fetch(API+'/api/site-content',{cache:'no-store'}); if(!r.ok)return;
      const d=await r.json(); applyMap(parse(d[KEY]));
    }catch(_){/* fail closed: original images stay unchanged */}
  }
  window.CeyBreezHomeStaticImages={scan,applyMap,eligible,labelFor,slotInfo,key:KEY};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true});
  else setTimeout(load,0);
})();
