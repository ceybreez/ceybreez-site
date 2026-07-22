(()=>{
  'use strict';
  const LANGS={
    en:{name:'English',flag:'🇬🇧',code:'en'},
    de:{name:'Deutsch',flag:'🇩🇪',code:'de'},
    fr:{name:'Français',flag:'🇫🇷',code:'fr'},
    da:{name:'Dansk',flag:'🇩🇰',code:'da'},
    es:{name:'Español',flag:'🇪🇸',code:'es'},
    it:{name:'Italiano',flag:'🇮🇹',code:'it'},
    ru:{name:'Русский',flag:'🇷🇺',code:'ru'},
    zh:{name:'中文',flag:'🇨🇳',code:'zh-CN'},
    ar:{name:'العربية',flag:'🇸🇦',code:'ar'}
  };
  const STORAGE_KEY='ceybreez_language';
  const CACHE_PREFIX='cbtr_v1_';
  const originalText=new WeakMap();
  const originalAttrs=new WeakMap();
  let current='en',observer=null,busy=false,pendingTimer=null;

  const skipTag=el=>!el||['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA','SVG','PATH'].includes(el.tagName)||el.closest('.notranslate,.cb-lang-switcher,.cb-lang-loading,[data-no-translate]');
  const meaningful=s=>{const t=(s||'').trim();return t.length>1&&/[A-Za-z]/.test(t)&&!/^https?:\/\//i.test(t)&&!/^\S+@\S+\.\S+$/.test(t)};
  const cacheKey=(lang,text)=>CACHE_PREFIX+lang+'_'+hash(text);
  function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function getCache(lang,text){try{return localStorage.getItem(cacheKey(lang,text))||''}catch{return ''}}
  function setCache(lang,text,value){try{localStorage.setItem(cacheKey(lang,text),value)}catch{}}
  async function translateText(text,lang){
    if(lang==='en'||!meaningful(text))return text;
    const cached=getCache(lang,text);if(cached)return cached;
    const target=LANGS[lang].code;
    const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
    const r=await fetch(url,{headers:{Accept:'application/json'}});
    if(!r.ok)throw new Error('Translation service unavailable');
    const data=await r.json();
    const out=(data?.[0]||[]).map(x=>x?.[0]||'').join('')||text;
    setCache(lang,text,out);return out;
  }
  function collect(root=document.body){
    const texts=[],attrs=[];
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
      const p=node.parentElement;if(skipTag(p)||!meaningful(node.nodeValue))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }});
    let n;while(n=walker.nextNode())texts.push(n);
    root.querySelectorAll?.('[placeholder],[title],[aria-label],input[type="submit"][value],input[type="button"][value]').forEach(el=>{
      if(skipTag(el))return;
      ['placeholder','title','aria-label','value'].forEach(a=>{if(el.hasAttribute(a)&&meaningful(el.getAttribute(a)))attrs.push([el,a])});
    });
    return {texts,attrs};
  }
  async function pool(items,worker,limit=5){
    let i=0;const runners=Array.from({length:Math.min(limit,items.length)},async()=>{while(i<items.length){const item=items[i++];await worker(item)}});await Promise.all(runners);
  }
  function restoreEnglish(root=document.body){
    const {texts,attrs}=collect(root);
    texts.forEach(node=>{if(originalText.has(node))node.nodeValue=originalText.get(node)});
    attrs.forEach(([el,a])=>{const map=originalAttrs.get(el);if(map&&a in map)el.setAttribute(a,map[a])});
  }
  async function applyLanguage(lang,root=document.body){
    if(!LANGS[lang])lang='en';current=lang;localStorage.setItem(STORAGE_KEY,lang);
    document.documentElement.lang=LANGS[lang].code;document.documentElement.dir=lang==='ar'?'rtl':'ltr';
    updateButton();
    if(lang==='en'){restoreEnglish(root);return}
    setLoading(true);
    const {texts,attrs}=collect(root);
    await pool(texts,async node=>{
      if(!originalText.has(node))originalText.set(node,node.nodeValue);
      const source=originalText.get(node);
      try{node.nodeValue=await translateText(source,lang)}catch{}
    });
    await pool(attrs,async([el,a])=>{
      let map=originalAttrs.get(el);if(!map){map={};originalAttrs.set(el,map)}
      if(!(a in map))map[a]=el.getAttribute(a);
      try{el.setAttribute(a,await translateText(map[a],lang))}catch{}
    });
    setLoading(false);
  }
  function setLoading(on){document.querySelector('.cb-lang-loading')?.classList.toggle('show',!!on)}
  function updateButton(){
    const b=document.querySelector('.cb-lang-button');if(!b)return;
    const l=LANGS[current];b.innerHTML=`<span class="cb-lang-flag">${l.flag}</span><span>${l.name}</span><span>▾</span>`;
    document.querySelectorAll('.cb-lang-option').forEach(x=>x.classList.toggle('active',x.dataset.lang===current));
  }
  function buildSwitcher(){
    const wrap=document.createElement('div');wrap.className='cb-lang-switcher notranslate';wrap.setAttribute('data-no-translate','');
    wrap.innerHTML='<button class="cb-lang-button" type="button" aria-label="Select language"></button><div class="cb-lang-menu"></div>';
    const menu=wrap.querySelector('.cb-lang-menu');
    Object.entries(LANGS).forEach(([key,l])=>{const b=document.createElement('button');b.type='button';b.className='cb-lang-option';b.dataset.lang=key;b.innerHTML=`<span class="cb-lang-flag">${l.flag}</span><span>${l.name}</span>`;b.addEventListener('click',async()=>{wrap.classList.remove('open');observer?.disconnect();await applyLanguage(key);startObserver()});menu.appendChild(b)});
    wrap.querySelector('.cb-lang-button').addEventListener('click',e=>{e.stopPropagation();wrap.classList.toggle('open')});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))wrap.classList.remove('open')});
    document.body.appendChild(wrap);
    const load=document.createElement('div');load.className='cb-lang-loading notranslate';load.textContent='Translating website…';load.setAttribute('data-no-translate','');document.body.appendChild(load);
    updateButton();
  }
  function startObserver(){
    observer=new MutationObserver(muts=>{
      if(current==='en'||busy)return;
      const roots=new Set();muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)roots.add(n);else if(n.nodeType===3&&n.parentElement)roots.add(n.parentElement)}));
      if(!roots.size)return;clearTimeout(pendingTimer);pendingTimer=setTimeout(async()=>{busy=true;observer.disconnect();for(const r of roots)await applyLanguage(current,r);busy=false;startObserver()},180);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  async function init(){
    buildSwitcher();
    current=localStorage.getItem(STORAGE_KEY)||'en';
    if(!LANGS[current])current='en';
    await applyLanguage(current);
    startObserver();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
