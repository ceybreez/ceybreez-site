CeyBreez V6.6.10 - SAFE Home Visual Photo Picker

PURPOSE
- Show the real Home page inside the Admin photo manager.
- Static/hard-coded photos only are clickable.
- CMS/API images, Home Gallery tiles and Review Reels are intentionally excluded.
- Clicking a static photo opens a mini picker: Choose from Gallery / Upload New / Restore Original.
- All replacements remain private draft changes until Publish Photo Changes.

FILES
1) /admin/gallery-manager.html   REPLACE
2) /ceybreez-home-image-overrides.js   ADD
3) /index.html   REPLACE (verified change from V6.6.6 Home baseline: only one script tag is added to load ceybreez-home-image-overrides.js)

DATA
- Uses existing public /api/site-content to read Gallery library.
- Uses existing /api/admin/upload-image to upload a selected new photo.
- Uses existing /api/admin/site-content to publish only home_static_image_overrides_v1.
- Does NOT modify Worker, Login, User Management, Security, Approval Queue, Tours CMS, Properties CMS, Services CMS, Reviews or Page Builder.

IMPORTANT
Keep Cloudflare deploy command as the current working command. Do not change deployment settings for this patch.
