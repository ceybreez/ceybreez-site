CEYBREEZ GRAPESJS BUILDER — SAFE HOME-PAGE TRIAL

Install
1. Upload this entire folder to: admin/grapes-builder/
2. Open: https://ceybreez.com/admin/grapes-builder/
3. No existing website or admin file needs to be replaced.

What this trial does
- Imports the current index.html and linked local CSS.
- Lets you drag/drop, edit text, colours, spacing, buttons, images and responsive views.
- Saves a draft in the current browser's localStorage.
- Exports a separate HTML file for review.

Important safety limits
- This trial DOES NOT publish over index.html.
- It DOES NOT call the existing CeyBreez API or D1 database.
- Image uploads are embedded in the draft/export as base64 and are not uploaded to Cloudflare/R2.
- Scripts are intentionally removed during import, so booking/inquiry/dynamic behaviours are not executed inside the editor.
- Test this Home-page workflow first. A remote save/publish endpoint should only be added after the editor experience is accepted.

Restore
Delete admin/grapes-builder/. Nothing else is changed.
