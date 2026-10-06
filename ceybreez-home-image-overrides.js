(() => {
  'use strict';
  const API='https://ceybreez-contact-api.ceybreez.workers.dev';
  const KEY='home_static_image_overrides_v1';
  const EXCLUDE=[
    '#homeGalleryGrid','.gallery-tile','#galleryLightbox','.gallery-lightbox',
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
  function labelFor(img,i){
    if(img.id==='heroImage') return 'Hero main image';
    const p=img.closest('.hero-story'); if(p){const all=[...document.querySelectorAll('.hero-story img')].filter(eligible);return `Hero story photo ${all.indexOf(img)+1}`}
    if(img.closest('.collage-main')) return 'About collage · main photo';
    if(img.closest('.collage-small.top')) return 'About collage · top photo';
    if(img.closest('.collage-small.bottom')) return 'About collage · bottom photo';
    if(img.closest('.thing-card')){const all=[...document.querySelectorAll('.thing-card img')].filter(eligible);return `Things to do · photo ${all.indexOf(img)+1}`}
    if(img.closest('.journey-banner')) return 'Journey banner photo';
    if(img.closest('.final-cta')) return 'Final call-to-action photo';
    return `Static photo ${i+1}`;
  }
  function scan(){
    const counts={}; const list=[];
    [...document.images].filter(eligible).forEach((img,i)=>{
      if(!img.dataset.cbStaticOriginal) img.dataset.cbStaticOriginal=img.getAttribute('src')||'';
      const original=img.dataset.cbStaticOriginal;
      const n=normSrc(original); counts[n]=(counts[n]||0)+1;
      const occurrence=counts[n];
      const key=`img:${encodeURIComponent(n)}#${occurrence}`;
      img.dataset.cbStaticKey=key;
      list.push({key,original,norm:n,occurrence,label:labelFor(img,i),element:img});
    });
    return list;
  }
  function applyMap(map={}){
    const targets=scan();
    targets.forEach(t=>{
      const item=map[t.key];
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
  window.CeyBreezHomeStaticImages={scan,applyMap,eligible,labelFor,key:KEY};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true});
  else setTimeout(load,0);
})();
