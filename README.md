# CeyBreez — GitHub frontend replacement

## Installation
1. Back up/commit the current repository first.
2. Extract this ZIP. Copy the CONTENTS of ceybreez-site-main to the existing frontend root where index.html lives; do not upload the outer folder as another nested directory.
3. Replace matching files and add new files. Explicitly delete the old admin/admin directory from GitHub: uploading files does not delete that old duplicate.
4. Preserve existing CNAME, host settings, workflows and other configuration absent from the supplied ZIP. Do not change Worker secrets, database bindings or backend code. This package contains frontend files only.
5. Commit and push through your normal process. Preview the resulting deployment and hard-refresh the browser. Roll back to your backup commit if required.

## Gallery editing
Admin > Page Control > Home > island-gallery / Find your kind of escape. Edit/add/remove cards and image URLs, then save. Initial photo cards are now preserved when first editing the section. Visual Builder also supports image upload, duplication/deletion and Publish to Live. Keep photos around 1000–1600px wide and ideally below 250 KB.

## Changes
Welcome overlay removed; shared modern theme; Home photo gallery/lightbox; local JPEG assets reduced 84.9% (11.03 MB to 1.66 MB); lazy images; duplicate admin directory removed; 37 superseded top-level function declarations removed with last effective definitions retained; mobile navigation wrapping; duplicate WhatsApp ID removed; robots admin directory rule; bundled Flatpickr for apartments/admin; graceful Google Places load failure.

## Tests performed
- 126 JavaScript/inline scripts parsed; supplied Worker module parsed.
- Local HTML assets/links and element IDs checked: no missing files or duplicate IDs.
- Chromium: 11 public pages plus admin login and Visual Builder, at 1440px and 390px (26 page/viewport checks): no uncaught JS errors or horizontal page overflow with test fixtures.
- Authenticated admin initial dashboard loads without uncaught errors with mock API data.
- Home photo lightbox opens and Escape closes at both widths.
- Worker with fake DB: public content/properties/tours/page-sections, authenticated admin page-sections and OPTIONS return 200. Unauthorized admin request rejected; existing Worker uses 500 instead of 401.

## What these tests do not prove
API responses were mocked and external services blocked/provided locally in browser tests. No real bookings/emails/payments, live D1 schema/data, actual Google Places, translation or persisted CMS publication were exercised. No live records changed. This is a complete frontend file package, not a guarantee every production function is verified.

Existing browser-local availability blocks do not constitute shared server-side inventory. Existing saved visual-builder overrides may override the new theme. Neither behavior is migrated in this update. Keep the existing Worker running; no backend deployment is needed for these frontend changes.

Before directing customers to the update, perform owner-controlled preview checks: submit a test inquiry, verify delivery and admin record, check date availability and finance totals with known records, and publish a gallery edit. Do not use real customer records for testing.
