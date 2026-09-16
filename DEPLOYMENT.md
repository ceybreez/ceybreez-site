# Deployment — CeyBreez V3

## GitHub
Upload **the contents of this folder** to the repository root. `index.html` must remain at repository root.

## Cloudflare Pages
- Framework preset: None
- Build command: leave empty
- Build output directory: `/` (repository root)
- Keep your existing custom domain `ceybreez.com` attached to the Pages project.

## Existing backend / CMS
The site is configured to use the existing Worker endpoint:
`https://ceybreez-contact-api.ceybreez.workers.dev`

The Worker source supplied by you is included at `cloudflare/worker.js`. Production bindings/secrets remain configured in Cloudflare and must not be committed to GitHub.

Expected bindings include your existing D1 `DB`, R2 `IMAGES_BUCKET`, admin authentication configuration, Resend email key and OpenRouteService key.

## CMS
Open `/admin/` after deployment. Home V3 gallery images can be managed in Page Builder → Global Website Settings → Home Gallery Images. Reels continue under the existing review/showcase settings.

## Safe rollout
1. Upload to a GitHub branch or Cloudflare preview deployment first.
2. Check Home, Villas, Apartments, Homestays, Tours, one Tour Details URL, Services, Contact and `/admin/`.
3. Confirm property/tour data loads from the Worker and one test inquiry reaches Admin.
4. Promote the deployment to production.

## V3.1 CMS layout protection
Normal public visits now use **content-safe CMS mode**. Old saved Visual Builder positioning/HTML will not re-apply after the page loads. The CMS can still update supported content fields, Home Gallery and Reels. Visual Builder records are only applied in builder mode (or when intentionally testing with `?visual`).

If you previously saw the new layout for ~2 seconds and then the old layout appeared, replace `page-builder.js` with this package version and hard-refresh the browser after Cloudflare finishes deploying.
