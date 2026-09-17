# CeyBreez V4 — Developer / Editing Guide

This package is the website code with **developer comments added** so future edits are easier. The comments themselves do not change layout or functionality.

**Use search instead of relying only on line numbers:** `SECTION:` in HTML, `IMAGE SOURCE:` for hard-coded images, `CSS SECTION:` in CSS, and `JS FUNCTION:` in JavaScript. Line numbers move after edits.

## Quick file map

| Page | HTML | Main visual CSS | Main JS / data |
|---|---|---|---|
| Home | `index.html` | `ceybreez-home-v3.css + ceybreez-public-v3.css` | page-builder.js, reviews-showcase.js, common JS |
| Tours | `tours.html` | `tours.css + tours-v4.css + ceybreez-public-v3.css` | tours.js + inline planner JS |
| Tour Details | `tour-details.html` | `tour-details.css + tour-details-v4.css` | tour-details.js |
| Villas | `villas.html` | `villas.css + stays-v4.css` | inline property/inquiry JS |
| Apartments | `apartments.html` | `apartments.css + stays-v4.css` | inline property/inquiry JS |
| Homestays | `homestays.html` | `homestays.css + stays-v4.css` | inline property/inquiry JS |
| Services | `services.html` | `services.css + services-v4.css` | inline services API JS |
| Contact | `contact.html` | `contact.css + contact-v4.css` | inline contact/inquiry JS |

## Page-by-page section map

### `index.html`
- **Line ~67: GLOBAL HEADER / NAVIGATION**
- **Line ~101: HOME HERO**
- **Line ~154: QUICK PATHS**
- **Line ~170: ABOUT / EDITORIAL**
- **Line ~203: THINGS TO DO**
- **Line ~255: HOME IMAGE GALLERY**
- **Line ~314: EXPERIENCES**
- **Line ~337: FEATURED TOURS**
- **Line ~354: CUSTOM JOURNEY CTA**
- **Line ~374: FEATURED STAYS**
- **Line ~391: POPULAR DESTINATIONS**
- **Line ~408: LOCAL SERVICES**
- **Line ~425: REVIEWS / SOCIAL PROOF**
- **Line ~443: VIDEO REELS**
- **Line ~494: FINAL CTA / CONTACT**
- **Line ~516: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~59: `logo.png`
    - line ~108: `images/cover.jpg`
    - line ~131: `images/train.jpg`
    - line ~136: `images/nature.jpg`
    - line ~141: `images/temple.jpg`
    - line ~191: `images/mountains.jpg`
    - line ~193: `images/food.jpg`
    - line ~221: `images/beach.jpg`
    - line ~671: `${esc(imageOf(item,`
    - line ~689: `${esc(imageOf(item))}`
    - line ~702: `${esc(imageOf(item, index % 2 ?`
    - line ~767: `${esc(item.src)}`
    - line ~842: `${esc(poster`

### `tours.html`
- **Line ~48: GLOBAL HEADER / NAVIGATION**
- **Line ~65: TOURS HERO**
- **Line ~93: TRAVEL DIFFERENTLY / INTRO**
- **Line ~120: FEATURED TOUR PACKAGES**
- **Line ~148: CHOOSE YOUR TRAVEL MOOD**
- **Line ~169: ROUTE INSPIRATION**
- **Line ~190: FEATURED DESTINATIONS**
- **Line ~263: WHY CEYBREEZ**
- **Line ~278: CUSTOM TRIP PLANNER**
- **Line ~445: FINAL TOURS CTA**
- **Line ~458: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~56: `logo.png`
    - line ~111: `images/train.jpg`
    - line ~113: `images/beach.jpg`
    - line ~115: `images/temple.jpg`
    - line ~181: `images/mountains.jpg`
    - line ~183: `images/nature.jpg`

### `tour-details.html`
- **Line ~40: GLOBAL HEADER / NAVIGATION**
- **Line ~68: TOUR DETAIL HERO**
- **Line ~120: TOUR PHOTO GALLERY**
- **Line ~146: QUICK TOUR FACTS**
- **Line ~162: OVERVIEW + ITINERARY + INCLUSIONS**
- **Line ~207: STICKY BOOKING / INQUIRY PANEL**
- **Line ~253: RELATED TOURS**
- **Line ~267: FINAL TOUR CTA**
- **Line ~294: TOUR REVIEWS**
- **Line ~307: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~48: `logo.png`
    - line ~135: `images/cover.jpg`
    - line ~200: `images/train.jpg`
    - line ~274: `images/beach.jpg`

### `villas.html`
- **Line ~47: GLOBAL HEADER / NAVIGATION**
- **Line ~64: VILLAS HERO**
- **Line ~83: VILLA INTRO**
- **Line ~93: VILLA PHOTO STORY**
- **Line ~110: VILLA TRAVEL MOODS**
- **Line ~121: VILLA LISTING**
- **Line ~150: WHY BOOK A VILLA**
- **Line ~157: VILLA INQUIRY FORM**
- **Line ~190: VILLA CTA**
- **Line ~203: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~55: `logo.png`
    - line ~102: `images/cover.jpg`
    - line ~104: `images/beach.jpg`
    - line ~106: `images/nature.jpg`
    - line ~346: `${photo}`

### `apartments.html`
- **Line ~46: GLOBAL HEADER / NAVIGATION**
- **Line ~63: APARTMENTS HERO**
- **Line ~82: APARTMENT INTRO**
- **Line ~92: APARTMENT PHOTO STORY**
- **Line ~109: APARTMENT TRAVEL MOODS**
- **Line ~120: APARTMENT LISTING**
- **Line ~152: WHY BOOK AN APARTMENT**
- **Line ~159: APARTMENT INQUIRY FORM**
- **Line ~232: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~54: `logo.png`
    - line ~101: `images/beach.jpg`
    - line ~103: `images/food.jpg`
    - line ~105: `images/cover.jpg`
    - line ~395: `${photo}`

### `homestays.html`
- **Line ~47: GLOBAL HEADER / NAVIGATION**
- **Line ~64: HOMESTAYS HERO**
- **Line ~83: HOMESTAY INTRO**
- **Line ~93: HOMESTAY PHOTO STORY**
- **Line ~110: HOMESTAY TRAVEL MOODS**
- **Line ~121: HOMESTAY LISTING**
- **Line ~153: WHY CHOOSE HOMESTAY**
- **Line ~160: HOMESTAY INQUIRY FORM**
- **Line ~238: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~55: `logo.png`
    - line ~102: `images/mountains.jpg`
    - line ~104: `images/nature.jpg`
    - line ~106: `images/temple.jpg`
    - line ~401: `${photo}`

### `services.html`
- **Line ~52: GLOBAL HEADER / NAVIGATION**
- **Line ~69: SERVICES HERO**
- **Line ~79: SERVICES INTRO**
- **Line ~86: SERVICES PHOTO GALLERY**
- **Line ~103: SERVICES STORY CARDS**
- **Line ~114: SERVICE CATEGORIES**
- **Line ~151: FEATURED SERVICES**
- **Line ~165: SERVICES GALLERY**
- **Line ~177: LIST YOUR SERVICE CTA**
- **Line ~191: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~60: `logo.png`
    - line ~95: `images/food.jpg`
    - line ~97: `images/nature.jpg`
    - line ~99: `images/temple.jpg`
    - line ~110: `images/train.jpg`
    - line ~346: `${service.image}`

### `contact.html`
- **Line ~44: GLOBAL HEADER / NAVIGATION**
- **Line ~61: CONTACT HERO**
- **Line ~68: HOW IT WORKS**
- **Line ~75: CONTACT + INQUIRY FORM**
- **Line ~146: GLOBAL FOOTER**
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~52: `logo.png`

### `privacy.html`
- No major V4 section markers required; simple policy/error page.
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~53: `logo.png`

### `terms.html`
- No major V4 section markers required; simple policy/error page.
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~53: `logo.png`

### `404.html`
- No major V4 section markers required; simple policy/error page.
  - Hard-coded images:
    - line ~12: `" to find hard-coded images.`
    - line ~53: `logo.png`

## CSS map

### `ceybreez-home-v3.css`
- line ~55: **HOME FEATURED DATA SECTIONS**
- line ~107: **HOME HERO**
- line ~277: **HOME GALLERY**
- line ~287: **HOME REELS**

### `ceybreez-public-v3.css`
- line ~15: **GLOBAL HEADER**
- line ~45: **GLOBAL FOOTER**
- line ~51: **WHATSAPP BUTTON**

### `contact-v4.css`
- line ~15: **CONTACT HERO**
- line ~23: **CONTACT PROCESS**
- line ~30: **CONTACT FORM AREA**
- line ~37: **EXPERIENCE CHECKBOXES**
- line ~43: **EXPECTED DATES**

### `contact.css`
- line ~94: **CONTACT TWO-COLUMN LAYOUT**
- line ~227: **CONTACT FORM**
- line ~320: **CONTACT CHECKBOXES**
- line ~386: **CONTACT DATES**

### `services-v4.css`
- line ~14: **SERVICES HERO**
- line ~22: **SERVICES INTRO**
- line ~29: **SERVICES IMAGE GALLERY**
- line ~35: **SERVICES STORY**
- line ~42: **SERVICE LISTINGS**
- line ~48: **SERVICE CTA**

### `stays-v4.css`
- line ~15: **STAY HERO**
- line ~29: **STAY INTRO**
- line ~37: **STAY PHOTO GALLERY**
- line ~44: **STAY MOOD CARDS**
- line ~51: **PROPERTY LISTING**
- line ~58: **WHY BOOK**
- line ~65: **PROPERTY INQUIRY FORM**

### `tour-details-v4.css`
- line ~14: **TOUR DETAIL HERO**
- line ~21: **PHOTO GALLERY**
- line ~27: **RELATED TOURS**
- line ~34: **QUICK FACTS**
- line ~41: **DETAIL CONTENT**
- line ~48: **BOOKING PANEL**
- line ~56: **FINAL CTA**

### `tours-v4.css`
- line ~14: **TOURS HERO**
- line ~31: **TOURS INTRO / IMAGE COLLAGE**
- line ~37: **ROUTE INSPIRATION**
- line ~43: **FEATURED DESTINATIONS**
- line ~49: **WHY CEYBREEZ**
- line ~58: **FEATURED TOUR PACKAGES**
- line ~66: **TRAVEL MOOD CARDS**
- line ~80: **CUSTOM TRIP PLANNER**

## JavaScript map

### `tours.js`
- line ~6: " to find documented functions.
- line ~16: clean — Normalizes text values before rendering/filtering.
- line ~19: moneyNumber — Converts stored price values into a numeric value for sorting/display.
- line ~24: escapeHtml — Escapes CMS/API text before inserting it into HTML.
- line ~33: firstImage — Chooses the first usable tour image (main image/photos/fallback).
- line ~39: priceText — Builds the human-readable tour price label.
- line ~46: detailsUrl — Builds the tour-details page URL/slug.
- line ~51: setStatus — Updates the tour loading/error/status message.
- line ~57: renderCategories — Builds the tour category dropdown from API data.
- line ~68: filteredTours — Applies search/category/sort filters to loaded tour packages.
- line ~94: renderTours — Builds the visible Featured Tour Packages cards.
- line ~131: loadTours — Fetches tour packages from the public API and starts rendering.

### `tour-details.js`
- line ~6: " to find documented functions.
- line ~18: qs — Small querySelector helper.
- line ~21: clean — Normalizes values.
- line ~23: escapeHtml — Escapes dynamic text.
- line ~25: array — Converts stored JSON/newline lists into arrays.
- line ~27: firstImage — Chooses a usable tour image.
- line ~29: priceText — Formats tour price.
- line ~31: setText — Writes text into a DOM target.
- line ~33: setStatus — Shows loading/error state.
- line ~36: renderList — Renders itinerary/inclusion/exclusion list items.
- line ~45: renderTour — Populates the full tour-details page from one API record.
- line ~75: loadTour — Loads the selected tour from /api/tour-packages/:slug.
- line ~101: renderTourGallery — Builds main photo + thumbnails.
- line ~136: updateGalleryCounter — Updates lightbox image counter.
- line ~142: openGallery — Opens tour photo lightbox.
- line ~156: closeGallery — Closes tour photo lightbox.
- line ~165: nextGalleryImage — Moves to next lightbox image.
- line ~174: prevGalleryImage — Moves to previous lightbox image.
- line ~183: loadRelated — Loads related tours.
- line ~201: submitInquiry — Submits the tour inquiry form.
- line ~247: backToTours — Returns to tours listing.
- line ~254: toggleShareBox — Shows/hides sharing options.
- line ~260: shareTour — Uses native share when supported.
- line ~267: shareWhatsApp — Shares current tour to WhatsApp.
- line ~274: shareFacebook — Shares current tour to Facebook.
- line ~280: copyTourLink — Copies the current tour URL.
- line ~287: saveTour — Stores/saves tour reference locally.

### `page-builder.js`
- line ~6: " to find documented functions.
- line ~30: loadCeyBreezSections — Loads CMS page sections for the current page.
- line ~49: applySection — Applies CMS content fields to matching HTML targets.
- line ~98: applySectionStyles — Applies permitted CMS styling when visual override mode is enabled.
- line ~138: merged — Merges desktop/tablet/mobile visual-builder settings.
- line ~145: applyRecord — Applies one visual-builder style record to an element.
- line ~168: applyElementStyles — Applies element-level visual styles.
- line ~183: renderCustom — Renders custom visual-builder elements.
- line ~210: applyVideoBackground — Creates/removes a section video background.
- line ~226: renderCards — Renders CMS card collections.
- line ~257: applyVisualBuilderRecords — Applies saved visual-builder DOM records.
- line ~292: start — Initializes CMS page-builder behavior safely.

### `reviews-showcase.js`
- line ~6: " to find documented functions.
- line ~20: reviewCard — Builds one review card.
- line ~35: renderReviewSections — Populates review sections and filters.
- line ~65: youtubeId — Extracts a YouTube video ID from common URL formats.
- line ~68: renderStatsAndReels — Updates stats and video reels from CMS site-content.
- line ~90: init — Loads reviews/site content and starts the showcase.

### `ceybreez-language.js`
- line ~6: " to find documented functions.
- line ~32: hash — Creates a small cache key for translated strings.
- line ~34: getCache — Reads a cached translation from localStorage.
- line ~36: setCache — Stores a translated string in localStorage.
- line ~38: translateText — Requests translation for one text string.
- line ~50: collect — Collects visible text/attributes that can be translated.
- line ~64: pool — Runs translation jobs with limited concurrency.
- line ~68: restoreEnglish — Restores original English text.
- line ~74: applyLanguage — Applies the selected language to a page/section.
- line ~94: setLoading — Shows/hides translation loading UI.
- line ~96: updateButton — Updates language switcher label/state.
- line ~102: buildSwitcher — Creates the language dropdown.
- line ~114: startObserver — Translates dynamically inserted DOM content.
- line ~123: init — Initializes language support.

### `ceybreez-public-v3.js`
- line ~6: " to find documented functions.

## Common changes — where to edit

- **Hero image:** HTML `SECTION: ... HERO` + corresponding V4 CSS hero selector.
- **Heading / paragraph:** edit the `<h1>`, `<h2>`, `<h3>` or `<p>` inside the matching HTML section. Dynamic CMS names/descriptions should be changed in Admin/CMS.
- **Static image:** search `IMAGE SOURCE:` and change the `src` directly below the comment.
- **CMS image:** change `mainImage`, `photos`, `image`, `logoImage` etc. in Admin/CMS; API cards should not be hard-coded.
- **Text color / background:** matching `CSS SECTION:` -> `color:` / `background:`.
- **Padding / spacing:** matching `CSS SECTION:` -> `padding`, `margin`, `gap`.
- **Card width / columns:** `grid-template-columns`, `width`, `max-width`, `minmax(...)`.
- **Mobile layout:** `@media` blocks near the bottom of the relevant CSS file.
- **Tour card logic:** `tours.js` -> `renderTours`, `filteredTours`, `loadTours`.
- **Tour detail dynamic data:** `tour-details.js` -> `renderTour`, `renderTourGallery`, `loadTour`.
- **CMS public behavior:** `page-builder.js`; keep safe content mode so old visual-builder layouts do not overwrite V4.
- **Important:** keep base CSS and V4 override CSS as separate files unless intentionally refactoring both. V4 should load after base CSS.
