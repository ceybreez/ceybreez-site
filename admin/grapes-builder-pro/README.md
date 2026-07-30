# CEYBREEZ Live Builder Pro v2

This version loads each original CEYBREEZ page inside a same-origin iframe. The page's own CSS, JavaScript, API calls, sliders and dynamic sections therefore run normally.

## Install
Copy `admin/grapes-builder-pro/` into the website repository and open:

`/admin/grapes-builder-pro/`

## Important
The builder must be hosted on the same domain as the public pages. Opening `index.html` directly from the computer (`file://`) will block iframe DOM editing.

## Drafts
Edits are stored in the browser's localStorage. Export creates a JSON backup.

## Publish
The Publish button calls:

`POST /api/admin/page-builder/live-publish`

Until that Worker route is implemented, Publish safely falls back to a local draft. No booking, inquiry, finance or public API logic is changed by this package.
