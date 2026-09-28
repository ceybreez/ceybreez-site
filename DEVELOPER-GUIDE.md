# CeyBreez Final — Developer / Editing Guide

Use **VS Code search** rather than relying only on line numbers. Search `SECTION:` in HTML, `CSS SECTION:` in CSS, `JS FUNCTION:` in JavaScript, and `IMAGE SOURCE:` for hard-coded images. Line numbers are included only as a quick locator and will move after edits.

## Quick file map

| Page | HTML | Main visual CSS | Main JS / data |
|---|---|---|---|
| Home | `index.html` | `ceybreez-home-v3.css + ceybreez-public-v3.css` | inline home loaders + page-builder.js + reviews-showcase.js |
| Tours | `tours.html` | `tours.css + ceybreez-public-v3.css + tours-v4.css` | tours.js + inline trip planner |
| Tour Details | `tour-details.html` | `tour-details.css + ceybreez-public-v3.css + tour-details-v4.css` | tour-details.js |
| Villas | `villas.html` | `villas.css + ceybreez-public-v3.css + stays-v4.css + villas-v4.css` | inline property/inquiry JS |
| Apartments | `apartments.html` | `apartments.css + ceybreez-public-v3.css + stays-v4.css + apartments-v4.css` | inline property/inquiry JS |
| Homestays | `homestays.html` | `homestays.css + ceybreez-public-v3.css + stays-v4.css + homestays-v4.css` | inline property/inquiry JS |
| Services | `services.html` | `services.css + ceybreez-public-v3.css + services-v4.css` | inline services API JS |
| Contact | `contact.html` | `contact.css + ceybreez-public-v3.css + contact-v4.css` | inline contact/inquiry JS |
| Privacy | `privacy.html` | `privacy.css + ceybreez-public-v3.css` | common JS |
| Terms | `terms.html` | `privacy.css + ceybreez-public-v3.css` | common JS |
| 404 | `404.html` | `ceybreez-public-v3.css` | common JS |

## Page-by-page section map

### `index.html`
- Line ~11: **" to jump between visible page sections.**
- Line ~67: **GLOBAL HEADER / NAVIGATION**
- Line ~101: **HOME HERO**
- Line ~154: **QUICK PATHS**
- Line ~170: **ABOUT / EDITORIAL**
- Line ~203: **THINGS TO DO**
- Line ~255: **HOME IMAGE GALLERY**
- Line ~314: **EXPERIENCES**
- Line ~337: **FEATURED TOURS**
- Line ~354: **CUSTOM JOURNEY CTA**
- Line ~374: **FEATURED STAYS**
- Line ~391: **POPULAR DESTINATIONS**
- Line ~408: **LOCAL SERVICES**
- Line ~425: **REVIEWS / SOCIAL PROOF**
- Line ~443: **VIDEO REELS**
- Line ~494: **FINAL CTA / CONTACT**
- Line ~516: **GLOBAL FOOTER**
  - Hard-coded images:
    - line ~60: `logo.png`
    - line ~109: `images/cover.jpg`
    - line ~132: `images/train.jpg`
    - line ~137: `images/nature.jpg`
    - line ~142: `images/temple.jpg`
    - line ~192: `images/mountains.jpg`
    - line ~194: `images/food.jpg`
    - line ~222: `images/beach.jpg`

### `tours.html`
- No major section markers; simple utility/policy page.
  - Hard-coded images:
    - line ~35: `logo.png`
    - line ~75: `images/train.jpg`
    - line ~76: `images/beach.jpg`
    - line ~77: `images/temple.jpg`
    - line ~121: `images/mountains.jpg`
    - line ~122: `images/nature.jpg`

### `tour-details.html`
- Line ~7: **" to jump between visible page sections.**
- Line ~36: **GLOBAL HEADER / NAVIGATION**
- Line ~64: **TOUR DETAIL HERO**
- Line ~116: **TOUR PHOTO GALLERY**
- Line ~142: **QUICK TOUR FACTS**
- Line ~158: **OVERVIEW + ITINERARY + INCLUSIONS**
- Line ~203: **STICKY BOOKING / INQUIRY PANEL**
- Line ~249: **RELATED TOURS**
- Line ~263: **FINAL TOUR CTA**
- Line ~290: **TOUR REVIEWS**
- Line ~303: **GLOBAL FOOTER**
  - Hard-coded images:
    - line ~45: `logo.png`
    - line ~132: `images/cover.jpg`
    - line ~197: `images/train.jpg`
    - line ~271: `images/beach.jpg`

### `villas.html`
- Line ~43: **VILLAS HERO | Main image: images/cover.jpg | Main CSS: stays-v4.css + villas-v4.css**
- Line ~56: **QUICK VILLA VALUE STRIP | Compact trust points below hero**
- Line ~63: **VILLA INTRO / HOW IT WORKS | Edit text here; spacing/colors in villas-v4.css**
- Line ~67: **VILLA IMAGE STORY | Images: cover.jpg, beach.jpg, nature.jpg**
- Line ~75: **STAY MOOD CARDS | Images + text can be edited directly here**
- Line ~77: **CMS VILLA LISTING | Data: /api/properties?type=villa | Card styling: villas-v4.css**
- Line ~100: **WHY CEYBREEZ | Static benefits / trust content**
- Line ~101: **VILLA INQUIRY FORM | IDs are used by JS, do not rename without updating JS**
- Line ~129: **FINAL VILLA CTA**
  - Hard-coded images:
    - line ~36: `logo.png`
    - line ~71: `images/cover.jpg`
    - line ~72: `images/beach.jpg`
    - line ~73: `images/nature.jpg`

### `apartments.html`
- Line ~53: **QUICK VALUE STRIP | Compact trust points below hero**
- Line ~66: **CMS PROPERTY LISTING | Data comes from /api/properties; visual styling in page V4 CSS**
- Line ~92: **INQUIRY FORM | Keep field IDs unchanged; styling in page V4 CSS**
  - Hard-coded images:
    - line ~34: `logo.png`
    - line ~61: `images/beach.jpg`
    - line ~62: `images/food.jpg`
    - line ~63: `images/cover.jpg`

### `homestays.html`
- Line ~54: **QUICK VALUE STRIP | Compact trust points below hero**
- Line ~67: **CMS PROPERTY LISTING | Data comes from /api/properties; visual styling in page V4 CSS**
- Line ~93: **INQUIRY FORM | Keep field IDs unchanged; styling in page V4 CSS**
  - Hard-coded images:
    - line ~35: `logo.png`
    - line ~62: `images/mountains.jpg`
    - line ~63: `images/nature.jpg`
    - line ~64: `images/temple.jpg`

### `services.html`
- Line ~46: **SERVICES HERO | CSS: services-v4.css | IMAGE: images/food.jpg**
- Line ~50: **SERVICES INTRO | CSS: services-v4.css**
- Line ~58: **SERVICES IMAGE STORY | CSS: services-v4.css**
- Line ~60: **SERVICE CATEGORIES + FILTERS | CSS: services-v4.css | DATA: /api/services**
- Line ~73: **DYNAMIC SERVICE LIST | CSS: services-v4.css | DATA: /api/services**
- Line ~78: **SERVICES GALLERY | AUTO-BUILT FROM CMS SERVICE PHOTOS**
- Line ~83: **SERVICES CTA | CSS: services-v4.css**
  - Hard-coded images:
    - line ~39: `logo.png`
    - line ~54: `images/food.jpg`
    - line ~55: `images/nature.jpg`
    - line ~56: `images/temple.jpg`
    - line ~59: `images/train.jpg`

### `contact.html`
- Line ~30: **SITE HEADER**
- Line ~50: **CONTACT HERO**
- Line ~70: **HOW IT WORKS**
- Line ~77: **CONTACT + INQUIRY FORM**
- Line ~178: **FINAL CONTACT CTA**
- Line ~188: **FOOTER**
  - Hard-coded images:
    - line ~33: `logo.png`

### `privacy.html`
- Line ~11: **" to jump between visible page sections.**
  - Hard-coded images:
    - line ~54: `logo.png`

### `terms.html`
- Line ~11: **" to jump between visible page sections.**
  - Hard-coded images:
    - line ~54: `logo.png`

### `404.html`
- Line ~11: **" to jump between visible page sections.**
  - Hard-coded images:
    - line ~54: `logo.png`

## CSS section map

### `ceybreez-home-v3.css`
- line ~5: **" to jump to major visual areas.**
- line ~55: **HOME FEATURED DATA SECTIONS**
- line ~107: **HOME HERO**
- line ~277: **HOME GALLERY**
- line ~287: **HOME REELS**
- line ~303: **HOME EXPERIENCES — UNIFIED CARD COLOUR**

### `ceybreez-public-v3.css`
- line ~5: **" to jump to major visual areas.**
- line ~15: **GLOBAL HEADER**
- line ~45: **GLOBAL FOOTER**
- line ~51: **WHATSAPP BUTTON**

### `tours-v4.css`
- line ~5: **" to jump to major visual areas.**
- line ~14: **TOURS HERO**
- line ~31: **TOURS INTRO / IMAGE COLLAGE**
- line ~37: **ROUTE INSPIRATION**
- line ~43: **FEATURED DESTINATIONS**
- line ~49: **WHY CEYBREEZ**
- line ~58: **FEATURED TOUR PACKAGES**
- line ~66: **TRAVEL MOOD CARDS**
- line ~80: **CUSTOM TRIP PLANNER**

### `tour-details-v4.css`
- line ~5: **" to jump to major visual areas.**
- line ~14: **TOUR DETAIL HERO**
- line ~21: **PHOTO GALLERY**
- line ~27: **RELATED TOURS**
- line ~34: **QUICK FACTS**
- line ~41: **DETAIL CONTENT**
- line ~48: **BOOKING PANEL**
- line ~56: **FINAL CTA**

### `stays-v4.css`
- line ~5: **" to jump to major visual areas.**
- line ~15: **STAY HERO**
- line ~29: **STAY INTRO**
- line ~37: **STAY PHOTO GALLERY**
- line ~44: **STAY MOOD CARDS**
- line ~51: **PROPERTY LISTING**
- line ~58: **WHY BOOK**
- line ~65: **PROPERTY INQUIRY FORM**

### `villas-v4.css`
- Base/shared stylesheet; use selector search.

### `apartments-v4.css`
- line ~9: **HERO**
- line ~15: **QUICK VALUE STRIP**
- line ~22: **INTRO / PHOTO STORY / MOOD CARDS**
- line ~34: **CMS PROPERTY LISTING**
- line ~56: **WHY / SUPPORT**
- line ~60: **INQUIRY FORM**
- line ~71: **FINAL CTA**

### `homestays-v4.css`
- line ~9: **HERO**
- line ~15: **QUICK VALUE STRIP**
- line ~22: **INTRO / PHOTO STORY / MOOD CARDS**
- line ~34: **CMS PROPERTY LISTING**
- line ~56: **WHY / SUPPORT**
- line ~60: **INQUIRY FORM**
- line ~71: **FINAL CTA**

### `services-v4.css`
- line ~4: **" to jump to each visible area.**
- line ~27: **SERVICES HERO**
- line ~60: **EDITORIAL INTRO**
- line ~73: **IMAGE STORY**
- line ~88: **SERVICE CATEGORIES**
- line ~109: **DYNAMIC SERVICE LIST**
- line ~134: **SERVICES GALLERY**
- line ~145: **BOTTOM CTA**
- line ~154: **SERVICE MODAL**

### `contact-v4.css`
- line ~24: **CONTACT HERO**
- line ~103: **PLANNING FLOW**
- line ~118: **MAIN CONTACT AREA**
- line ~141: **CONTACT INFO CARD**
- line ~231: **CONTACT FORM CARD**
- line ~299: **EXPERIENCE CHOICES**
- line ~337: **DATE FIELDS**
- line ~343: **SUBMIT**
- line ~364: **FINAL CTA**

### `contact.css`
- line ~5: **" to jump to major visual areas.**
- line ~94: **CONTACT TWO-COLUMN LAYOUT**
- line ~227: **CONTACT FORM**
- line ~320: **CONTACT CHECKBOXES**
- line ~386: **CONTACT DATES**

### `ceybreez-language.css`
- line ~5: **" to jump to major visual areas.**
- line ~12: **LANGUAGE SWITCHER — COMPACT TOP-LEFT**

## JavaScript locator map

### `tours.js`
- line ~6: **" to find documented functions.**
- line ~16: **clean — Normalizes text values before rendering/filtering.**
- line ~19: **moneyNumber — Converts stored price values into a numeric value for sorting/display.**
- line ~24: **escapeHtml — Escapes CMS/API text before inserting it into HTML.**
- line ~33: **firstImage — Chooses the first usable tour image (main image/photos/fallback).**
- line ~39: **priceText — Builds the human-readable tour price label.**
- line ~46: **detailsUrl — Builds the tour-details page URL/slug.**
- line ~51: **setStatus — Updates the tour loading/error/status message.**
- line ~57: **renderCategories — Builds the tour category dropdown from API data.**
- line ~68: **filteredTours — Applies search/category/sort filters to loaded tour packages.**
- line ~94: **renderTours — Builds the visible Featured Tour Packages cards.**
- line ~131: **loadTours — Fetches tour packages from the public API and starts rendering.**

### `tour-details.js`
- line ~6: **" to find documented functions.**
- line ~18: **qs — Small querySelector helper.**
- line ~21: **clean — Normalizes values.**
- line ~23: **escapeHtml — Escapes dynamic text.**
- line ~25: **array — Converts stored JSON/newline lists into arrays.**
- line ~27: **firstImage — Chooses a usable tour image.**
- line ~29: **priceText — Formats tour price.**
- line ~31: **setText — Writes text into a DOM target.**
- line ~33: **setStatus — Shows loading/error state.**
- line ~36: **renderList — Renders itinerary/inclusion/exclusion list items.**
- line ~45: **renderTour — Populates the full tour-details page from one API record.**
- line ~75: **loadTour — Loads the selected tour from /api/tour-packages/:slug.**
- line ~101: **renderTourGallery — Builds main photo + thumbnails.**
- line ~136: **updateGalleryCounter — Updates lightbox image counter.**
- line ~142: **openGallery — Opens tour photo lightbox.**
- line ~156: **closeGallery — Closes tour photo lightbox.**
- line ~165: **nextGalleryImage — Moves to next lightbox image.**
- line ~174: **prevGalleryImage — Moves to previous lightbox image.**
- line ~183: **loadRelated — Loads related tours.**
- line ~201: **submitInquiry — Submits the tour inquiry form.**
- line ~247: **backToTours — Returns to tours listing.**
- line ~254: **toggleShareBox — Shows/hides sharing options.**
- line ~260: **shareTour — Uses native share when supported.**
- line ~267: **shareWhatsApp — Shares current tour to WhatsApp.**
- line ~274: **shareFacebook — Shares current tour to Facebook.**
- line ~280: **copyTourLink — Copies the current tour URL.**
- line ~287: **saveTour — Stores/saves tour reference locally.**

### `page-builder.js`
- line ~6: **" to find documented functions.**
- line ~30: **loadCeyBreezSections — Loads CMS page sections for the current page.**
- line ~49: **applySection — Applies CMS content fields to matching HTML targets.**
- line ~98: **applySectionStyles — Applies permitted CMS styling when visual override mode is enabled.**
- line ~138: **merged — Merges desktop/tablet/mobile visual-builder settings.**
- line ~145: **applyRecord — Applies one visual-builder style record to an element.**
- line ~168: **applyElementStyles — Applies element-level visual styles.**
- line ~183: **renderCustom — Renders custom visual-builder elements.**
- line ~210: **applyVideoBackground — Creates/removes a section video background.**
- line ~226: **renderCards — Renders CMS card collections.**
- line ~257: **applyVisualBuilderRecords — Applies saved visual-builder DOM records.**
- line ~292: **start — Initializes CMS page-builder behavior safely.**

### `ceybreez-public-v3.js`
- line ~6: **" to find documented functions.**

### `ceybreez-language.js`
- line ~6: **" to find documented functions.**
- line ~32: **hash — Creates a small cache key for translated strings.**
- line ~34: **getCache — Reads a cached translation from localStorage.**
- line ~36: **setCache — Stores a translated string in localStorage.**
- line ~38: **translateText — Requests translation for one text string.**
- line ~50: **collect — Collects visible text/attributes that can be translated.**
- line ~64: **pool — Runs translation jobs with limited concurrency.**
- line ~68: **restoreEnglish — Restores original English text.**
- line ~74: **applyLanguage — Applies the selected language to a page/section.**
- line ~94: **setLoading — Shows/hides translation loading UI.**
- line ~96: **updateButton — Updates language switcher label/state.**
- line ~102: **buildSwitcher — Creates the language dropdown.**
- line ~114: **startObserver — Translates dynamically inserted DOM content.**
- line ~123: **init — Initializes language support.**

### `reviews-showcase.js`
- line ~6: **" to find documented functions.**
- line ~20: **reviewCard — Builds one review card.**
- line ~35: **renderReviewSections — Populates review sections and filters.**
- line ~65: **youtubeId — Extracts a YouTube video ID from common URL formats.**
- line ~68: **renderStatsAndReels — Updates stats and video reels from CMS site-content.**
- line ~90: **init — Loads reviews/site content and starts the showcase.**

## Safe editing rules

- Change **colors, spacing, font sizes and card dimensions in CSS** before editing JavaScript.
- Change **visible text and section order in HTML**.
- Change **API behavior / dynamic rendering in JS** only when needed.
- Keep V4 override stylesheets loaded **after** their base stylesheet.
- Do not delete the existing element IDs used by inquiry, booking, tour planner, CMS or language scripts.
- After editing, hard refresh with **Ctrl + F5** and check desktop + mobile.