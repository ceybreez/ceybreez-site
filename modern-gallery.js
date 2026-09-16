(()=>{
 'use strict';
 if(new URLSearchParams(location.search).has('cbuilder'))return;
 const gallery=document.querySelector('.modern-gallery');if(!gallery)return;
 const dialog=document.createElement('dialog');dialog.className='cb-lightbox';dialog.setAttribute('aria-label','Island photo gallery');
 const close=document.createElement('button');close.type='button';close.textContent='Close ✕';
 const photo=document.createElement('img');dialog.append(close,photo);document.body.append(dialog);
 close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 function open(img){photo.src=img.currentSrc||img.src;photo.alt=img.alt||'Sri Lanka travel photograph';dialog.showModal()}
 gallery.addEventListener('click',e=>{if(e.target.tagName==='IMG')open(e.target)});
 gallery.addEventListener('keydown',e=>{if(e.target.tagName==='IMG'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(e.target)}});
 function prepare(){gallery.querySelectorAll('img').forEach(img=>{img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Enlarge: '+(img.alt||'travel photo'));img.loading='lazy';img.decoding='async'})}
 prepare();new MutationObserver(prepare).observe(gallery,{childList:true,subtree:true});
})();
