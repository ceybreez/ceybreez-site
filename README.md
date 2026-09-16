# CeyBreez Website — V3 Complete Package

Premium, image-first Sri Lanka tourism website with Cloudflare-backed CMS/admin.

## Public pages
- Home V3 with CMS-driven tours, stays, destinations, services, image gallery, reviews and reels
- Villas, Apartments and Homestays with CMS property data and inquiry flows
- Tours + custom trip planner + route/map flow
- Tour detail page
- Services
- Contact
- Privacy, Terms and 404

## CMS / Admin
Open `/admin/`. Existing booking, inquiry, property, tour, destination, service, review, finance/report and page-builder functions are preserved. Home V3 adds a CMS-managed `home_gallery` field. Reels continue to use the existing `review_reels` website showcase setting.

## GitHub / Cloudflare Pages
Upload the contents of this folder to the repository root. Cloudflare Pages can publish it as a static site with no build command. Keep the existing Cloudflare Worker deployed separately; its source is included in `/cloudflare/worker.js` for version control/reference. Do not commit production secrets.

## Notes
- `_headers` adds safe caching/security defaults.
- `_redirects` normalizes `/admin` to `/admin/`.
- `/admin/` is excluded in `robots.txt` (this is crawler guidance, not authentication).
