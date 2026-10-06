CeyBreez V6.6.7 SAFE Site Media Manager
========================================
Purpose: Change/add photos on Tours, Villas, Apartments, Homestays and Services pages without rewriting the current design/content.

SAFETY MODEL
- Existing image src values are preserved as fallback.
- Existing CSS files are NOT replaced.
- Existing page content, forms, text, CMS and logic are NOT removed.
- Only non-visual data-cb-media-slot attributes + one new CSS/JS include + one hidden extra-gallery placeholder are added to the 5 public HTML pages.
- If the API is unavailable or there is no published override, the original page renders as before.
- Restore Original removes only the override.
- Extra Gallery is hidden until published photos exist.
- Worker, Security, User Management, Approval Queue, Page Builder, Visual Builder, Tours CMS, Properties CMS and Services CMS are not replaced.

UPLOAD THESE FILES
/tours.html
/villas.html
/apartments.html
/homestays.html
/services.html
/ceybreez-media-overrides.css
/ceybreez-media-overrides.js
/admin/site-media-manager.html
/admin/site-media-manager.css
/admin/site-media-manager.js
/admin/site-media-manifest.json

OPEN
https://ceybreez.com/admin/site-media-manager.html

FLOW
Replace / Add photos -> Save Draft -> Preview Draft -> Publish Page Media

DYNAMIC CMS IMAGES
Tour-package galleries remain managed by Tours CMS.
Villa/Apartment/Homestay property galleries remain managed by Properties CMS.
Service item media remains managed by Services CMS.
This manager is for static page imagery + optional extra page galleries.
