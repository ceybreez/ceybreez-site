CEYBREEZ GRAPESJS VISUAL BUILDER

INSTALL
1. Upload the folder: admin/grapes-builder/
2. Replace admin/index.html only if you want the new Visual Builder button inside Admin.
3. Open /admin/grapes-builder/ directly at any time.

SAFETY
- This builder does not overwrite any public page automatically.
- Save Draft stores builder data in the current browser only.
- Export HTML downloads the edited page. Review the downloaded file before replacing a live page.
- Existing booking, inquiry, finance, tour and worker files are untouched.

IMAGE UPLOAD
- Log in to CeyBreez Admin first so CEYBREEZ_ADMIN_TOKEN exists.
- Use the Upload Image block.
- It uses the existing /api/admin/upload-image endpoint.

IMPORTANT
Imported page scripts are intentionally removed inside the editor. This prevents forms, sliders and booking scripts from running while editing. The exported HTML preserves the imported page head styles, but you should review any script tags needed by the live page before replacing it.
