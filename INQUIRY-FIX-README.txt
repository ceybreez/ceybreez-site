CEYBREEZ INQUIRY SYSTEM FIX V5

FILES ADDED:
- inquiry-common.js
- inquiry-common.css

PUBLIC PAGES UPDATED:
- contact.html
- villas.html
- apartments.html
- homestays.html
- tours.html
- tour-details.html
- tour-details.js

WHAT THIS FIXES:
1. Country is a dropdown on every inquiry form.
2. Selecting a country auto-inserts the dial code into the mobile field.
3. All inquiry controls use one common visual style.
4. Every successful inquiry shows the same reference-number success sheet.
5. All forms post to the same CeyBreez Worker inquiry endpoint.
6. Email delivery status for admin + guest is shown in the success sheet.

CLOUDFLARE WORKER:
Use the separate cloudflare-worker-inquiry-v5.js supplied with this package to harden phone formatting, admin email configuration and reference generation.
