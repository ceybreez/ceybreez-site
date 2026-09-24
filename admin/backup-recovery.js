(function(){
  const API_BASE = "https://ceybreez-contact-api.ceybreez.workers.dev";
  const TOKEN_KEY = "CEYBREEZ_SESSION_TOKEN";
  let backupStatus = null;
  let backupBusy = false;

  function token(){ return sessionStorage.getItem(TOKEN_KEY) || ""; }
  function headers(json=true){
    const h = { Authorization: `Bearer ${token()}` };
    if(json) h["Content-Type"] = "application/json";
    return h;
  }
  function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
  function fmtDate(v){ if(!v) return "—"; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}); }
  function fmtBytes(n){ const x=Number(n||0); if(!x) return "0 B"; const u=["B","KB","MB","GB"]; const i=Math.min(Math.floor(Math.log(x)/Math.log(1024)),u.length-1); return `${(x/Math.pow(1024,i)).toFixed(i?1:0)} ${u[i]}`; }
  function setProgress(text, tone=""){ const el=document.getElementById("backupProgress"); if(el){ el.textContent=text||""; el.className=`backup-progress ${tone}`.trim(); } }
  function setBusy(value){
    backupBusy=!!value;
    ["backupCreateBtn","backupMediaSyncBtn","backupMediaRestoreBtn"].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled=backupBusy; });
  }
  async function api(path, options={}){
    const res=await fetch(API_BASE+path,{...options,headers:{...headers(options.body!==undefined),...(options.headers||{})},cache:"no-store"});
    const type=res.headers.get("content-type")||"";
    const data=type.includes("application/json")?await res.json().catch(()=>({})):await res.text();
    if(!res.ok){ const e=new Error((data&&data.error)||data||`Request failed (${res.status})`); e.status=res.status; throw e; }
    return data;
  }

  function renderStatus(status, backups){
    backupStatus=status||{};
    const storage=document.getElementById("backupStorageStatus");
    const storageHint=document.getElementById("backupStorageHint");
    const media=document.getElementById("backupMediaStatus");
    const mediaHint=document.getElementById("backupMediaHint");
    const retention=document.getElementById("backupRetentionStatus");
    const last=document.getElementById("backupLastStatus");
    const lastHint=document.getElementById("backupLastHint");
    if(storage) storage.textContent=status.storageLabel||"Unavailable";
    if(storageHint) storageHint.textContent=status.storageDedicated?"Separate R2 backup storage":"Fallback storage — dedicated BACKUP_BUCKET recommended";
    if(media) media.textContent=status.mediaMirrorEnabled?"Enabled":"Not configured";
    if(mediaHint) mediaHint.textContent=status.mediaMirrorEnabled?`Last sync: ${fmtDate(status.lastMediaSync)}`:"Bind a separate R2 bucket as BACKUP_BUCKET";
    if(retention) retention.textContent=`${status.retentionDays||30} days`;
    const rows=Array.isArray(backups)?backups:[];
    if(rows[0]){ if(last) last.textContent=fmtDate(rows[0].createdAt); if(lastHint) lastHint.textContent=`${rows[0].kind||"manual"} · ${rows[0].rowsCount||0} rows`; }
    else { if(last) last.textContent="None"; if(lastHint) lastHint.textContent="Create the first backup now"; }
    const syncBtn=document.getElementById("backupMediaSyncBtn");
    const restoreBtn=document.getElementById("backupMediaRestoreBtn");
    if(syncBtn) syncBtn.disabled=backupBusy || !status.mediaMirrorEnabled;
    if(restoreBtn) restoreBtn.disabled=backupBusy || !status.mediaMirrorEnabled;
  }

  function renderBackups(rows){
    const body=document.getElementById("backupTableBody");
    if(!body) return;
    if(!rows.length){ body.innerHTML='<tr><td colspan="7">No stored database backups yet.</td></tr>'; return; }
    body.innerHTML=rows.map(row=>{
      const kind=String(row.kind||"manual").replaceAll("_"," ");
      const check=String(row.checksum||"");
      return `<tr>
        <td><strong>${esc(fmtDate(row.createdAt))}</strong><small>${esc(row.createdBy||"system")}</small></td>
        <td><span class="backup-kind">${esc(kind)}</span></td>
        <td>${Number(row.tablesCount||0)} / ${Number(row.rowsCount||0)}</td>
        <td>${esc(fmtBytes(row.sizeBytes))}</td>
        <td>${esc(row.storageBinding||"-")}</td>
        <td><code title="${esc(check)}">${esc(check.slice(0,12))}${check.length>12?"…":""}</code></td>
        <td><div class="backup-row-actions"><button type="button" onclick="downloadDatabaseBackup('${esc(row.id)}')">Download</button><button type="button" class="backup-restore-btn" onclick="restoreDatabaseBackup('${esc(row.id)}')">Restore</button></div></td>
      </tr>`;
    }).join("");
  }

  window.loadBackupRecovery=async function loadBackupRecovery(){
    if(!window.CEYBREEZ_CURRENT_USER || window.CEYBREEZ_CURRENT_USER.role!=="super_admin") return;
    setProgress("Loading backup status…");
    try{
      const [status, rows]=await Promise.all([api("/api/admin/backups/status"),api("/api/admin/backups")]);
      renderStatus(status,rows);
      renderBackups(rows);
      setProgress(status.storageDedicated?"Backup system ready.":"Database backup works, but create a dedicated BACKUP_BUCKET to enable a separate media mirror.",status.storageDedicated?"ok":"warn");
    }catch(e){ setProgress(e.message||"Backup status failed","error"); }
  };

  async function runMediaSync(){
    if(!backupStatus?.mediaMirrorEnabled) return {complete:false,skipped:true};
    let cursor=""; let copied=0, skipped=0, processed=0, pages=0;
    do{
      const out=await api("/api/admin/backups/media-sync",{method:"POST",body:JSON.stringify({cursor})});
      copied+=Number(out.copied||0); skipped+=Number(out.skipped||0); processed+=Number(out.processed||0); pages++;
      cursor=out.nextCursor||"";
      setProgress(`Media mirror: ${processed} checked, ${copied} copied, ${skipped} unchanged…`);
      if(pages>=100) throw new Error("Media sync paused after 100 batches. Run Sync R2 Media Mirror again to continue.");
    }while(cursor);
    return {complete:true,copied,skipped,processed};
  }

  window.createBackupNow=async function createBackupNow(){
    if(backupBusy) return;
    setBusy(true); setProgress("Creating D1 database snapshot…");
    try{
      const out=await api("/api/admin/backups",{method:"POST",body:JSON.stringify({notes:"Manual backup from Admin panel"})});
      setProgress(`Database snapshot ${out.id} created. ${out.rowsCount||0} rows saved.`);
      if(backupStatus?.mediaMirrorEnabled){ await runMediaSync(); }
      await window.loadBackupRecovery();
      setProgress(`Backup complete: ${out.id}. Database snapshot saved${backupStatus?.mediaMirrorEnabled?" and media mirror synchronized":""}.`,"ok");
    }catch(e){ setProgress(e.message||"Backup failed","error"); }
    finally{ setBusy(false); renderStatus(backupStatus||{},[]); }
  };

  window.syncBackupMedia=async function syncBackupMedia(){
    if(backupBusy) return;
    setBusy(true); setProgress("Synchronizing R2 media to the dedicated backup bucket…");
    try{ const out=await runMediaSync(); setProgress(`Media mirror complete. ${out.processed||0} checked, ${out.copied||0} copied, ${out.skipped||0} unchanged.`,"ok"); await window.loadBackupRecovery(); }
    catch(e){ setProgress(e.message||"Media sync failed","error"); }
    finally{ setBusy(false); }
  };

  window.downloadDatabaseBackup=async function downloadDatabaseBackup(id){
    try{
      const res=await fetch(`${API_BASE}/api/admin/backups/${encodeURIComponent(id)}/download`,{headers:{Authorization:`Bearer ${token()}`}});
      if(!res.ok){ const d=await res.json().catch(()=>({})); throw new Error(d.error||"Download failed"); }
      const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download=`ceybreez-backup-${id}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){ alert(e.message||"Download failed"); }
  };

  window.restoreDatabaseBackup=async function restoreDatabaseBackup(id){
    if(backupBusy) return;
    const phrase=`RESTORE ${id}`;
    const answer=prompt(`Emergency database restore.\n\nA safety snapshot will be created first.\nStaff should not edit the CMS during restore.\n\nType exactly:\n${phrase}`);
    if(answer!==phrase) return;
    setBusy(true); setProgress(`Creating safety snapshot and restoring ${id}…`,`warn`);
    try{
      const out=await api(`/api/admin/backups/${encodeURIComponent(id)}/restore`,{method:"POST",body:JSON.stringify({confirmation:phrase})});
      setProgress(`Restore complete. ${out.tablesRestored||0} tables / ${out.rowsRestored||0} rows restored. Safety snapshot: ${out.safetyBackupId||"created"}.`,`ok`);
      await window.loadBackupRecovery();
    }catch(e){ setProgress(e.message||"Restore failed","error"); }
    finally{ setBusy(false); }
  };

  window.restoreBackupMedia=async function restoreBackupMedia(){
    if(backupBusy) return;
    const phrase="RESTORE MEDIA";
    if(prompt(`Emergency R2 media restore.\n\nThis copies the dedicated media mirror back to the live IMAGES_BUCKET.\n\nType exactly:\n${phrase}`)!==phrase) return;
    setBusy(true); setProgress("Restoring R2 media mirror…","warn");
    try{
      let cursor=""; let copied=0,processed=0,pages=0;
      do{
        const out=await api("/api/admin/backups/media-restore",{method:"POST",body:JSON.stringify({confirmation:phrase,cursor})});
        copied+=Number(out.copied||0); processed+=Number(out.processed||0); cursor=out.nextCursor||""; pages++;
        setProgress(`Media restore: ${processed} checked, ${copied} copied…`,`warn`);
        if(pages>=100) throw new Error("Media restore paused after 100 batches. Run Restore Media Mirror again to continue.");
      }while(cursor);
      setProgress(`Media restore complete. ${copied} objects copied to the live media bucket.`,`ok`);
    }catch(e){ setProgress(e.message||"Media restore failed","error"); }
    finally{ setBusy(false); }
  };
})();
