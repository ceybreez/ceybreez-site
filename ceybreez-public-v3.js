/* ================================================================
   CEYBREEZ JAVASCRIPT DEVELOPER NOTE
   FILE: ceybreez-public-v3.js
   PURPOSE: Front-end behavior / API integration.
   API REFERENCES FOUND: /api/site-content
   EDITING TIP: Search for "JS FUNCTION:" to find documented functions.
   WARNING: Change DOM ids/classes only if you also update the matching HTML/CSS.
   ================================================================ */

(()=>{
  document.documentElement.classList.add('v31-js');
  const header=document.querySelector('.site-header');
  const btn=document.getElementById('menuToggle');
  const nav=document.getElementById('mainNav');
  const onScroll=()=>header?.classList.toggle('scrolled',scrollY>30);
  onScroll(); addEventListener('scroll',onScroll,{passive:true});
  btn?.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');btn.setAttribute('aria-expanded',String(open));});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('menu-open');btn?.setAttribute('aria-expanded','false')}));
  const y=document.getElementById('footerYear');if(y)y.textContent=new Date().getFullYear();

  // Gentle reveal for editorial blocks. Content remains visible without JS.
  const reveal=[...document.querySelectorAll('.v31-reveal')];
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('v31-visible');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
    reveal.forEach(el=>io.observe(el));
  }else reveal.forEach(el=>el.classList.add('v31-visible'));

  const API='https://ceybreez-contact-api.ceybreez.workers.dev';
  fetch(API+'/api/site-content').then(r=>r.ok?r.json():{}).then(data=>{
    if(data.site_logo){document.querySelectorAll('.brand img,.footer-brand img').forEach(img=>img.src=data.site_logo)}
    const wa=String(data.contact_whatsapp||'').replace(/\D/g,'');
    const link=document.getElementById('floatingWhatsAppV3');if(link&&wa)link.href='https://api.whatsapp.com/send?phone='+wa;
  }).catch(()=>{});
})();
