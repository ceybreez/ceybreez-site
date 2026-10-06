(() => {
  'use strict';
  const API_BASE = 'https://ceybreez-contact-api.ceybreez.workers.dev';
  const KEY = 'site_media_overrides_v1';
  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i,'') || 'home';
  const original = new Map();
  let visibleCount = 12;

  const clean = v => String(v ?? '').trim();
  const esc = s => clean(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const parse = value => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value) || {}; } catch (_) { return {}; }
  };

  function rememberOriginals(){
    document.querySelectorAll('[data-cb-media-slot]').forEach(el=>{
      if (!original.has(el)) original.set(el,{src:el.getAttribute('src')||'',alt:el.getAttribute('alt')||''});
    });
  }

  function applySlots(pageData={}){
    rememberOriginals();
    const slots = pageData.slots || {};
    document.querySelectorAll('[data-cb-media-slot]').forEach(img=>{
      const base=original.get(img) || {src:img.getAttribute('src')||'',alt:img.getAttribute('alt')||''};
      const key=img.getAttribute('data-cb-media-slot');
      const item=slots[key];
      if(item && clean(item.src)){
        img.setAttribute('src',clean(item.src));
        if(clean(item.alt)) img.setAttribute('alt',clean(item.alt));
      } else {
        img.setAttribute('src',base.src);
        img.setAttribute('alt',base.alt);
      }
    });
  }

  function ensureLightbox(){
    let box=document.getElementById('cbMediaLightbox');
    if(box) return box;
    box=document.createElement('div');
    box.id='cbMediaLightbox';
    box.className='cb-media-lightbox';
    box.innerHTML='<button class="cb-media-lightbox-close" type="button" aria-label="Close">×</button><figure><img alt="Travel photo"><figcaption></figcaption></figure>';
    document.body.appendChild(box);
    const close=()=>{box.classList.remove('is-open');document.body.style.overflow='';};
    box.querySelector('.cb-media-lightbox-close').addEventListener('click',close);
    box.addEventListener('click',e=>{if(e.target===box) close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});
    return box;
  }

  function openLightbox(item){
    const box=ensureLightbox();
    box.querySelector('img').src=clean(item.src);
    box.querySelector('img').alt=clean(item.alt || item.title || 'Travel photo');
    box.querySelector('figcaption').textContent=clean(item.title || item.caption || '');
    box.classList.add('is-open');
    document.body.style.overflow='hidden';
  }

  function renderGallery(pageData={}){
    const section=document.querySelector(`[data-cb-extra-gallery="${CSS.escape(page)}"]`);
    if(!section) return;
    const items=Array.isArray(pageData.gallery) ? pageData.gallery.filter(x=>x&&clean(x.src)) : [];
    const grid=section.querySelector('[data-cb-extra-gallery-grid]');
    const more=section.querySelector('[data-cb-extra-gallery-more]');
    if(!items.length){ section.hidden=true; if(grid) grid.innerHTML=''; return; }
    section.hidden=false;
    const shown=items.slice(0,visibleCount);
    grid.innerHTML=shown.map((item,i)=>`<button class="cb-extra-gallery-card" type="button" data-cb-gallery-index="${i}"><img src="${esc(item.src)}" alt="${esc(item.alt||item.title||`Travel photo ${i+1}`)}"><span>${esc(item.title||item.caption||'Sri Lanka')}</span></button>`).join('');
    grid.querySelectorAll('[data-cb-gallery-index]').forEach(btn=>btn.addEventListener('click',()=>openLightbox(shown[Number(btn.dataset.cbGalleryIndex)])));
    const remain=items.length-shown.length;
    more.hidden=remain<=0;
    more.textContent=remain>0?`Show more photos (${remain})`:'Show more photos';
    more.onclick=()=>{visibleCount+=6;renderGallery(pageData);};
  }

  function applyPageData(pageData){
    applySlots(pageData||{});
    renderGallery(pageData||{});
  }

  async function load(){
    try{
      const res=await fetch(`${API_BASE}/api/site-content`,{cache:'no-store'});
      if(!res.ok) return;
      const data=await res.json();
      const all=parse(data[KEY]);
      applyPageData(all[page]||{});
    }catch(_){ /* fail closed: original site remains unchanged */ }
  }

  window.addEventListener('message',event=>{
    if(event.origin!==location.origin) return;
    const msg=event.data||{};
    if(msg.type==='CB_MEDIA_PREVIEW' && msg.page===page){
      visibleCount=12;
      applyPageData(msg.data||{});
    }
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
