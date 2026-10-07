(() => {
  'use strict';
  const API='https://ceybreez-contact-api.ceybreez.workers.dev';
  const body=document.body;
  const file=(location.pathname.split('/').pop()||'').toLowerCase();
  const page=(body?.dataset?.page || file.replace(/\.html$/,'') || '').toLowerCase();
  const SUPPORTED=new Set(['tours','villas','apartments','homestays','services']);
  if(!SUPPORTED.has(page)) return;

  const CONTENT_KEY=`${page}_static_image_overrides_v1`;
  const LOGO_RE=/(^|\/)(logo|favicon)(\.|-|_)/i;
  const GENERAL_EXCLUDE=[
    'header .brand','footer .footer-brand',
    '.site-logo','.brand-logo','[data-logo]',
    '[data-cms]','[data-dynamic]',
    '.cb-review-grid','[data-review-grid]',
    '.modal','.lightbox','.gallery-lightbox'
  ];
  const PAGE_EXCLUDE={
    tours:['#tourPackagesGrid','#destinationCardGrid','#destinationLightbox','.destination-modal'],
    villas:['#propertyGrid','#propertyModal','.property-modal','#modalMainImage','.booked-dates-list'],
    apartments:['#propertyGrid','#propertyModal','.property-modal','#modalMainImage','.booked-dates-list'],
    homestays:['#propertyGrid','#propertyModal','.property-modal','#modalMainImage','.booked-dates-list'],
    services:['.featured-services','.services-gallery','#serviceModal','#modalServiceImage','#modalServiceGallery']
  };
  const EXCLUDE=[...GENERAL_EXCLUDE,...(PAGE_EXCLUDE[page]||[])].join(',');
  const clean=v=>String(v??'').trim();
  const parse=v=>{ if(!v) return {}; if(typeof v==='object') return v; try{return JSON.parse(v)||{}}catch{return{}} };
  const normSrc=src=>{try{const u=new URL(src,location.href);return u.origin===location.origin?u.pathname+u.search:u.href}catch{return clean(src)}};
  const escAttr=s=>String(s||'').replace(/"/g,'&quot;');

  function excluded(el){ return !!(EXCLUDE && el?.closest?.(EXCLUDE)); }
  function validPhotoSrc(src){ const s=clean(src); return !!s && !LOGO_RE.test(s) && !/^data:image\/svg/i.test(s); }
  function imageEligible(img){
    if(!img || img.tagName!=='IMG' || excluded(img)) return false;
    const src=img.dataset.cbStaticOriginal || img.getAttribute('src') || '';
    if(!validPhotoSrc(src)) return false;
    if(img.id && /logo|lightbox|modal/i.test(img.id)) return false;
    const alt=clean(img.getAttribute('alt'));
    if(/\bceybreez\b.*\blogo\b|\blogo\b/i.test(alt)) return false;
    return true;
  }
  function inlineBackgroundInfo(el){
    if(!el || excluded(el)) return null;
    const style=el.getAttribute('style')||'';
    if(!/url\(/i.test(style)) return null;
    const propMatch=style.match(/(--[\w-]+|background-image|background)\s*:\s*([^;]*url\([^;]+\)[^;]*)/i);
    if(!propMatch) return null;
    const property=propMatch[1];
    const value=propMatch[2];
    const urlMatch=value.match(/url\(\s*(['"]?)(.*?)\1\s*\)/i);
    if(!urlMatch || !validPhotoSrc(urlMatch[2])) return null;
    return {property,value,src:urlMatch[2]};
  }
  function sectionName(el){
    const section=el.closest('section,article,figure');
    const heading=section?.querySelector('h1,h2,h3,figcaption');
    return clean(heading?.textContent).replace(/\s+/g,' ').slice(0,80);
  }
  function labelForImage(img,index){
    const alt=clean(img.getAttribute('alt'));
    const section=sectionName(img);
    if(img.dataset.cbMediaSlot) return alt || section || `Page photo ${index+1}`;
    if(img.closest('.editorial-gallery')) return alt || `Editorial gallery photo ${index+1}`;
    if(img.closest('.stay-v4-mood')) return alt || `Mood card photo ${index+1}`;
    if(img.closest('.services-v4-story-card')) return alt || `Story card photo ${index+1}`;
    if(img.closest('.journey-collage-v4')) return alt || `Journey collage photo ${index+1}`;
    if(img.closest('.route-card-v4')) return alt || `Route card photo ${index+1}`;
    return alt || section || `Static page photo ${index+1}`;
  }
  function stableImageKey(img,index,counts){
    if(img.dataset.cbMediaSlot) return `${page}:slot:${img.dataset.cbMediaSlot}`;
    const raw=img.dataset.cbStaticOriginal || img.getAttribute('src') || '';
    const n=normSrc(raw); counts[n]=(counts[n]||0)+1;
    return `${page}:img:${encodeURIComponent(n)}#${counts[n]}`;
  }
  function scan(){
    const list=[]; const counts={};
    [...document.images].filter(imageEligible).forEach((img,index)=>{
      if(!img.dataset.cbStaticOriginal) img.dataset.cbStaticOriginal=img.getAttribute('src')||'';
      const key=stableImageKey(img,index,counts);
      img.dataset.cbStaticKey=key;
      list.push({
        key,kind:'img',element:img,original:img.dataset.cbStaticOriginal,
        label:labelForImage(img,index)
      });
    });
    let bgIndex=0;
    [...document.querySelectorAll('[style*="url("]')].forEach(el=>{
      const info=inlineBackgroundInfo(el); if(!info) return;
      const originalAttr=el.dataset.cbStaticStyleOriginal || el.getAttribute('style') || '';
      if(!el.dataset.cbStaticStyleOriginal) el.dataset.cbStaticStyleOriginal=originalAttr;
      let key, label;
      if(el.classList.contains('stay-v4-hero')){ key=`${page}:hero-background`; label='Hero background photo'; }
      else { bgIndex++; key=`${page}:background:${bgIndex}`; label=sectionName(el)||`Background photo ${bgIndex}`; }
      list.push({key,kind:'background',element:el,original:info.src,property:info.property,originalValue:info.value,label});
    });
    return list;
  }
  function setBackground(target,src){
    if(!target?.element) return;
    if(src){
      const value=`url("${escAttr(src)}")`;
      target.element.style.setProperty(target.property,value);
      target.element.dataset.cbStaticOverridden='1';
    }else{
      const originalStyle=target.element.dataset.cbStaticStyleOriginal;
      if(originalStyle!==undefined) target.element.setAttribute('style',originalStyle);
      delete target.element.dataset.cbStaticOverridden;
    }
  }
  function applyMap(map={}){
    const targets=scan();
    targets.forEach(t=>{
      const item=map[t.key]; const src=clean(item?.src);
      if(t.kind==='img'){
        t.element.setAttribute('src',src||t.original);
        if(src) t.element.dataset.cbStaticOverridden='1'; else delete t.element.dataset.cbStaticOverridden;
      } else setBackground(t,src);
    });
    return targets;
  }
  async function load(){
    try{
      const r=await fetch(API+'/api/site-content',{cache:'no-store'}); if(!r.ok) return;
      const d=await r.json(); applyMap(parse(d[CONTENT_KEY]));
    }catch(_){/* fail closed: original page remains */}
  }

  // Capture originals synchronously before older async override layers can mutate the DOM.
  scan();
  window.CeyBreezPageStaticImages={page,key:CONTENT_KEY,scan,applyMap,imageEligible};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{setTimeout(load,0);setTimeout(load,900)},{once:true});
  else {setTimeout(load,0);setTimeout(load,900)}
})();
