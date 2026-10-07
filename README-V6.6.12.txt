CeyBreez V6.6.12 — FINAL Unified Gallery / Photo Manager
Date: 2026-10-07

PURPOSE
- One Gallery Manager for Home, Tours, Villas, Apartments, Homestays and Services.
- Live page is shown in a private iframe preview.
- Click any NON-CMS photo to replace it.
- CMS-managed images remain locked and continue to be managed by their own CMS modules.
- Choose an existing Gallery photo or upload a new photo.
- Delete unwanted photos from the Gallery list (removes from Gallery data only; does not physically delete the R2 object).
- Draft changes are not live until Preview / Unlock Publish + Publish Changes.
- Gallery Manager is added to the Admin V19 sidebar under Visual Designer.

REPLACE / ADD
/admin/gallery-manager.html              REPLACE
/admin/v14-shell.js                      REPLACE (ONLY sidebar addition vs V6.6 master)
/ceybreez-home-image-overrides.js        REPLACE/KEEP latest Home picker runtime
/ceybreez-page-image-overrides.js        ADD
/ceybreez-media-overrides.js             KEEP/REPLACE from V6.6.7 (unchanged support runtime)
/ceybreez-media-overrides.css            KEEP/REPLACE from V6.6.7 (unchanged support style)
/tours.html                               REPLACE
/villas.html                              REPLACE
/apartments.html                          REPLACE
/homestays.html                           REPLACE
/services.html                            REPLACE

NOT TOUCHED
- Cloudflare API Worker
- Admin login/auth logic
- User Management
- Roles / permissions
- Approval Queue
- Security RBAC
- admin/admin.js (Review Reel upload fix remains untouched)
- Tours CMS / Properties CMS / Services CMS logic
- Page Builder / Visual Designer core
- Home index.html in this patch

SUPPORTED PAGE PHOTO RULES
Home:
- Existing V6.6.11 non-CMS selector/runtime is preserved.

Tours:
- Static journey collage and route-card photos selectable.
- Tour package CMS and Destination CMS images locked.

Villas / Apartments / Homestays:
- Static hero background, editorial gallery and mood-card photos selectable.
- Property CMS cards/modal photos and Reviews locked.

Services:
- Static editorial gallery and story-card photos selectable.
- Dynamic Services CMS list/gallery/modal photos locked.

GALLERY DELETE BEHAVIOUR
- The × button removes the image from the Gallery library draft.
- Publish is required for the Gallery list change to become live.
- R2 object is NOT permanently deleted, preventing broken existing placements.

SAFE WORKFLOW
1. Login to Admin.
2. Sidebar > Gallery Manager.
3. Select page.
4. Hover/click desired NON-CMS photo in the private preview.
5. Choose from Gallery OR Upload New Photo.
6. Check private preview.
7. Click Preview / Unlock Publish.
8. Click Publish Changes.
