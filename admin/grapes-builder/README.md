# CeyBreez Visual Builder Pro V1

## Workflow
1. Log in to the normal CeyBreez Admin panel first.
2. Open `admin/grapes-builder/`.
3. Select a section, then select an element.
4. Desktop edits are the base and automatically appear on tablet/mobile.
5. Switch to Tablet or Mobile only when a device-specific override is needed.
6. **Save Draft** stores work in this browser only.
7. **Publish Live** saves visual element styles and uploaded image URLs to the existing Page Sections API.

## Important
- Image files are uploaded through the existing `/api/admin/upload-image` endpoint, so published images use permanent URLs rather than temporary browser data.
- Public pages read the published data through `page-builder.js`.
- The first production-ready scope is the Home page, where all editable areas already have `data-section` markers.
