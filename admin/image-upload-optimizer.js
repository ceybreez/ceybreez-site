/* ================================================================
   CEYBREEZ IMAGE UPLOAD OPTIMIZER V5.7
   Compresses future admin image uploads before they are sent to R2.
   - Max edge: 1920px
   - WebP quality: 0.78
   - Skips SVG/GIF and already-small images
   ================================================================ */
(() => {
  "use strict";
  const nativeFetch = window.fetch.bind(window);
  const MAX_EDGE = 1920;
  const QUALITY = 0.78;
  const MIN_BYTES = 280 * 1024;

  const isOptimizable = (file) => file instanceof File && /^image\//i.test(file.type || "") && !/(svg|gif)/i.test(file.type || "") && file.size >= MIN_BYTES;

  async function fileToBitmap(file){
    if ("createImageBitmap" in window) return createImageBitmap(file);
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve,reject) => { const el = new Image(); el.onload=()=>resolve(el); el.onerror=reject; el.src=url; });
      return img;
    } finally { URL.revokeObjectURL(url); }
  }

  async function optimize(file){
    if(!isOptimizable(file)) return file;
    try{
      const bitmap = await fileToBitmap(file);
      const width = bitmap.width || bitmap.naturalWidth;
      const height = bitmap.height || bitmap.naturalHeight;
      if(!width || !height) return file;
      const scale = Math.min(1, MAX_EDGE / Math.max(width,height));
      const outW = Math.max(1, Math.round(width * scale));
      const outH = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d", {alpha:true});
      ctx.drawImage(bitmap, 0, 0, outW, outH);
      if(bitmap.close) bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", QUALITY));
      if(!blob || blob.size >= file.size) return file;
      const base = (file.name || "ceybreez-image").replace(/\.[^.]+$/, "");
      return new File([blob], `${base}.webp`, {type:"image/webp", lastModified:Date.now()});
    }catch(err){
      console.warn("CeyBreez image optimization skipped", err);
      return file;
    }
  }

  window.CeyBreezImageOptimizer = { optimize, MAX_EDGE, QUALITY };

  window.fetch = async function(input, init){
    const url = typeof input === "string" ? input : (input?.url || "");
    if(init?.body instanceof FormData && /\/api\/admin\/upload-image(?:$|\?)/.test(url)){
      const source = init.body;
      const file = source.get("file");
      if(isOptimizable(file)){
        const optimized = await optimize(file);
        if(optimized !== file){
          const next = new FormData();
          for(const [key,value] of source.entries()){
            if(key === "file") next.append(key, optimized, optimized.name);
            else next.append(key, value);
          }
          init = {...init, body:next};
        }
      }
    }
    return nativeFetch(input, init);
  };
})();
