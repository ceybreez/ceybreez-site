# CeyBreez Admin V10 Modular V2

This version keeps the working V10 logic but splits `admin.js` into separate section files under `modules/`.

Upload the whole folder as `admin-v2/`.

Test URL:
`https://ceybreez.com/admin-v2/admin.html`

Live `/admin/` V10 is not touched.

Files:
- `admin.html` loads split module scripts in order.
- `admin.css` includes V10 CSS + Admin V2 sidebar/dashboard layout.
- `modules/` contains separated JS sections.
- `worker.js` is copied from the current stable V10 package.

Deploy notes:
1. Upload full `admin-v2` folder.
2. Deploy Worker only if you want this worker version active.
3. Open admin-v2/admin.html and Ctrl + F5.
