(function(){
const API='https://ceybreez-contact-api.ceybreez.workers.dev',token=()=>localStorage.getItem('CEYBREEZ_ADMIN_TOKEN')||'', $=id=>document.getElementById(id);const urls={home:'../index.html',villas:'../villas.html',apartments:'../apartments.html',homestays:'../homestays.html',tours:'../tours.html',services:'../services.html',contact:'../contact.html'};let page='home',patches={},inserts=[],selected=null,history=[],future=[],themes={global:{},page:{}};
function status(s){$('vbStatus').textContent=s;setTimeout(()=>$('vbStatus').textContent='Ready',2500)}
function frameUrl(edit=true){return urls[page]+'?cb_builder_edit='+(edit?'1':'0')+'&cbv='+Date.now()}
function loadFrame(){selected=null;$('inspector').classList.add('hidden');$('emptyInspector').classList.remove('hidden');$('vbFrame').src=frameUrl(true)}
function snap(){history.push(JSON.stringify({patches,inserts}));if(history.length>50)history.shift();future=[]}
function post(patch){$('vbFrame').contentWindow.postMessage({source:'cb-v3-editor',type:'apply',patch},'*')}
function changePatch(p){if(!selected)return;snap();patches[selected]={...(patches[selected]||{}),...p,style:{...(patches[selected]?.style||{}),...(p.style||{})}};post(p)}
function getAll(){return fetch(API+'/api/site-content').then(r=>r.json())}
async function saveKey(key,val){const r=await fetch(API+'/api/admin/site-content',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({key,value:JSON.stringify(val)})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Save failed')}
async function loadData(){page=$('vbPage').value;try{const all=await getAll();let raw=all['builder_v3_draft_'+page]||all['builder_v3_live_'+page];const data=raw?JSON.parse(raw):{patches:{},inserts:[]};patches=data.patches||{};inserts=data.inserts||[];themes.global=all.builder_v3_theme_global?JSON.parse(all.builder_v3_theme_global):{};themes.page=all['builder_v3_theme_'+page]?JSON.parse(all['builder_v3_theme_'+page]):{};const t={...themes.global,...themes.page};$('themePrimary').value=t.primary||'#0f766e';$('themeSecondary').value=t.secondary||'#d4a24c';$('themeFont').value=t.font||'Poppins, sans-serif';loadFrame();status('Live page loaded')}catch(e){status(e.message)}}
function data(){return{page,patches,inserts,theme:{...themes.global,...themes.page},updatedAt:new Date().toISOString()}}
async function draft(){await saveKey('builder_v3_draft_'+page,data());localStorage.setItem('builder_v3_preview_'+page,JSON.stringify(data()));status('Draft saved. Live website unchanged.')}
async function publish(){if(!confirm('Publish these changes to the LIVE '+page.toUpperCase()+' page?'))return;const all=await getAll();let versions=[];try{versions=JSON.parse(all['builder_v3_versions_'+page]||'[]')}catch{};const current=all['builder_v3_live_'+page];if(current){versions.unshift({id:Date.now(),date:new Date().toISOString(),data:JSON.parse(current)});versions=versions.slice(0,20)}await saveKey('builder_v3_versions_'+page,versions);await saveKey('builder_v3_live_'+page,data());await saveKey('builder_v3_draft_'+page,data());status('Published to live website')}
function preview(){localStorage.setItem('builder_v3_preview_'+page,JSON.stringify(data()));window.open(urls[page]+'?cb_builder_preview=1','_blank')}
function fill(m){
 selected=m.selector;
 $('emptyInspector').classList.add('hidden');$('inspector').classList.remove('hidden');
 $('selTag').textContent=m.tag+' · '+m.selector;
 $('iText').value=m.html||'';
 $('iFontFamily').value=[...$('iFontFamily').options].some(o=>o.value===m.style.fontFamily)?m.style.fontFamily:'';
 $('iFontSize').value=m.style.fontSize||16;$('iWeight').value=m.style.fontWeight||400;
 $('iLineHeight').value=m.style.lineHeight||1.4;$('iLetterSpacing').value=m.style.letterSpacing||0;$('iTransform').value=m.style.textTransform||'none';
 $('iAlign').value=m.style.align||'left';$('iColor').value=m.style.color||'#17212b';$('iBg').value=m.style.background||'#ffffff';
 $('iPadTop').value=m.style.paddingTop||0;$('iPadRight').value=m.style.paddingRight||0;$('iPadBottom').value=m.style.paddingBottom||0;$('iPadLeft').value=m.style.paddingLeft||0;
 $('iMarTop').value=m.style.marginTop||0;$('iMarRight').value=m.style.marginRight||0;$('iMarBottom').value=m.style.marginBottom||0;$('iMarLeft').value=m.style.marginLeft||0;
 $('iWidth').value=m.style.width||100;$('iHeight').value=m.style.minHeight||0;$('iMaxWidth').value=m.style.maxWidth||0;$('iActualHeight').value=m.style.height||0;
 $('iRadius').value=m.style.radius||0;$('iOpacity').value=m.style.opacity||100;$('iHref').value=m.href||'';$('iSrc').value=m.src||'';
 $('iObjectFit').value=m.style.objectFit||'';$('iObjectPosition').value=m.style.objectPosition||'center center';
 $('bgSize').value=['cover','contain','auto','100% 100%'].includes(m.style.backgroundSize)?m.style.backgroundSize:'cover';
 $('bgPosition').value=m.style.backgroundPosition||'center center';$('bgRepeat').value=m.style.backgroundRepeat||'no-repeat';$('bgAttachment').value=m.style.backgroundAttachment||'scroll';
}
window.addEventListener('message',e=>{const m=e.data;if(!m||m.source!=='cb-v3')return;if(m.type==='selected')fill(m);if(m.type==='change'){patches[m.selector]=m.patch;selected=m.selector}if(m.type==='insertState'){inserts=m.inserts||[]}});
$('iText').onchange=()=>changePatch({html:$('iText').value});['iFontFamily','iFontSize','iWeight','iLineHeight','iLetterSpacing','iTransform','iAlign','iColor','iBg','iPadTop','iPadRight','iPadBottom','iPadLeft','iMarTop','iMarRight','iMarBottom','iMarLeft','iWidth','iHeight','iMaxWidth','iActualHeight','iRadius','iOpacity','iObjectFit','iObjectPosition'].forEach(id=>$(id).addEventListener('input',()=>changePatch({style:{
fontFamily:$('iFontFamily').value||'inherit',
fontSize:$('iFontSize').value+'px',
fontWeight:$('iWeight').value,
lineHeight:$('iLineHeight').value,
letterSpacing:$('iLetterSpacing').value+'px',
textTransform:$('iTransform').value,
textAlign:$('iAlign').value,
color:$('iColor').value,
backgroundColor:$('iBg').value,
paddingTop:$('iPadTop').value+'px',paddingRight:$('iPadRight').value+'px',paddingBottom:$('iPadBottom').value+'px',paddingLeft:$('iPadLeft').value+'px',
marginTop:$('iMarTop').value+'px',marginRight:$('iMarRight').value+'px',marginBottom:$('iMarBottom').value+'px',marginLeft:$('iMarLeft').value+'px',
width:$('iWidth').value+'%',minHeight:$('iHeight').value+'px',maxWidth:(+$('iMaxWidth').value?$('iMaxWidth').value+'px':'none'),height:(+$('iActualHeight').value?$('iActualHeight').value+'px':'auto'),
borderRadius:$('iRadius').value+'px',opacity:(+$('iOpacity').value/100),
objectFit:$('iObjectFit').value||'initial',objectPosition:$('iObjectPosition').value
}})));$('iHref').onchange=()=>changePatch({attrs:{href:$('iHref').value}});$('iSrc').onchange=()=>changePatch({attrs:{src:$('iSrc').value}});
$('applyBackground').onclick=()=>{
const type=$('bgType').value,a=$('bg1').value,b=$('bg2').value,img=$('bgImage').value,op=+$('bgOverlay').value/100;
const size=$('bgSize').value,pos=$('bgPosition').value,rep=$('bgRepeat').value,att=$('bgAttachment').value;
let bg='none';
if(type==='color')bg=a;
if(type==='gradient')bg=`linear-gradient(135deg,${a},${b})`;
if(type==='image')bg=`linear-gradient(rgba(0,0,0,${op}),rgba(0,0,0,${op})),url("${img}")`;
changePatch({style:{background:bg,backgroundSize:size,backgroundPosition:pos,backgroundRepeat:rep,backgroundAttachment:att}});
};
$('uploadMedia').onclick=async()=>{const f=$('imageFile').files[0];if(!f)return alert('Select an image or video');const fd=new FormData();fd.append('file',f);fd.append('folder','builder-media');status('Uploading...');const r=await fetch(API+'/api/admin/upload-image',{method:'POST',headers:{Authorization:'Bearer '+token()},body:fd});const j=await r.json();if(!r.ok)return alert(j.error||'Upload failed');$('iSrc').value=j.url;changePatch({attrs:{src:j.url}});status('Media uploaded and applied')};
$('hideElement').onclick=()=>changePatch({hidden:true});$('resetElement').onclick=()=>{if(!selected)return;if(!confirm('Reset changes for this selected element?'))return;delete patches[selected];$('vbFrame').contentWindow.postMessage({source:'cb-v3-editor',type:'reset'},'*')};$('vbUndo').onclick=()=>{if(!history.length)return;future.push(JSON.stringify({patches,inserts}));const s=JSON.parse(history.pop());patches=s.patches||{};inserts=s.inserts||[];loadFrame()};
$('vbRedo').onclick=()=>{if(!future.length)return;history.push(JSON.stringify({patches,inserts}));const s=JSON.parse(future.pop());patches=s.patches||{};inserts=s.inserts||[];loadFrame()};
$('selectionMode').onchange=()=>postMessageToFrame({type:'selectionMode',mode:$('selectionMode').value});
$('selectParent').onclick=()=>postMessageToFrame({type:'selectParent'});
$('selectSection').onclick=()=>postMessageToFrame({type:'selectSection'});
function postMessageToFrame(msg){$('vbFrame').contentWindow.postMessage({source:'cb-v3-editor',...msg},'*')}
$('vbPage').onchange=loadData;$('vbReload').onclick=()=>{if(confirm('Reload the live page? Unsaved canvas changes remain in the draft data but the frame will refresh.'))loadFrame()};$('vbDraft').onclick=()=>draft().catch(e=>status(e.message));$('vbPublish').onclick=()=>publish().catch(e=>status(e.message));$('vbPreview').onclick=preview;document.querySelectorAll('[data-device]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-device]').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('frameWrap').className=b.dataset.device});

const elementDefaults={
 section:{tag:'section',html:'<div style="max-width:1100px;margin:auto;padding:55px 24px"><h2>New Section</h2><p>Edit this section by double-clicking text.</p></div>',style:{background:'#ffffff'}},
 heading:{tag:'h2',html:'Your Heading',style:{textAlign:'center',fontSize:'42px',padding:'18px'}},
 text:{tag:'p',html:'Add your text here.',style:{fontSize:'17px',padding:'12px'}},
 button:{tag:'a',html:'Learn More',attrs:{href:'#'},style:{display:'inline-block',background:'#0f766e',color:'#ffffff',padding:'12px 22px',borderRadius:'999px',textDecoration:'none',margin:'12px'}},
 image:{tag:'img',attrs:{src:'https://ceybreez.com/logo.png',alt:'CeyBreez image'},style:{display:'block',maxWidth:'70%',margin:'20px auto'}},
 video:{tag:'video',attrs:{src:'',controls:'controls'},style:{display:'block',maxWidth:'80%',margin:'20px auto'}},
 columns:{tag:'div',html:'<div style="padding:20px;border:1px dashed #bbb">Column 1</div><div style="padding:20px;border:1px dashed #bbb">Column 2</div>',style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px',padding:'20px'}},
 divider:{tag:'hr',style:{border:'0',borderTop:'1px solid #cbd5df',margin:'30px 0'}},
 spacer:{tag:'div',html:'',style:{height:'60px'}},
 counter:{tag:'div',html:'<strong style="font-size:38px;display:block">450+</strong><span>Happy Guests</span>',style:{textAlign:'center',padding:'28px',color:'#0f766e'}},
 reviews:{tag:'section',html:'<h2>Featured Guest Reviews</h2><p>★★★★★</p><p>Reviews will load from the Reviews CMS.</p>',style:{textAlign:'center',padding:'45px',background:'#f7faf9'}},
 cta:{tag:'section',html:'<h2>Ready to plan your Sri Lanka escape?</h2><p>Contact CeyBreez today.</p><a href="../contact.html" style="display:inline-block;background:white;color:#0f766e;padding:12px 22px;border-radius:999px;text-decoration:none">Contact Us</a>',style:{textAlign:'center',padding:'50px',background:'#0f766e',color:'#ffffff'}}
};
document.querySelectorAll('[data-add]').forEach(btn=>btn.onclick=()=>{
  const type=btn.dataset.add;
  const item=JSON.parse(JSON.stringify(elementDefaults[type]||elementDefaults.text));
  item.id='cbv3-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  item.type=type;
  snap();
  inserts.push(item);
  $('vbFrame').contentWindow.postMessage({source:'cb-v3-editor',type:'insert',item},'*');
  status(type+' added');
});

function theme(){return{primary:$('themePrimary').value,secondary:$('themeSecondary').value,font:$('themeCustomFont').value.trim()||$('themeFont').value}}$('themePage').onclick=async()=>{themes.page=theme();await saveKey('builder_v3_theme_'+page,themes.page);loadFrame();status('Theme applied to this page')};$('themeAll').onclick=async()=>{if(!confirm('Apply this theme to ALL pages?'))return;themes.global=theme();await saveKey('builder_v3_theme_global',themes.global);loadFrame();status('Theme applied to all pages')};
$('vbVersions').onclick=async()=>{const all=await getAll();let a=[];try{a=JSON.parse(all['builder_v3_versions_'+page]||'[]')}catch{};$('versionsList').innerHTML=a.length?a.map((v,i)=>`<div class="version-row"><span>${new Date(v.date).toLocaleString()}</span><span><button data-p="${i}">Preview</button><button data-r="${i}">Restore Draft</button></span></div>`).join(''):'<p style="padding:18px">No versions yet.</p>';$('versionsDialog').showModal();document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{localStorage.setItem('builder_v3_preview_'+page,JSON.stringify(a[+b.dataset.p].data));window.open(urls[page]+'?cb_builder_preview=1','_blank')});document.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{patches=a[+b.dataset.r].data.patches||{};inserts=a[+b.dataset.r].data.inserts||[];await saveKey('builder_v3_draft_'+page,data());$('versionsDialog').close();loadFrame();status('Version restored as draft')})};loadData();
})();
