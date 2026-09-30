CeyBreez V6.5.2 - Unified Inquiry Forms

Replace these files in the website root:
- contact.html
- tours.html
- villas.html
- apartments.html
- homestays.html
- tour-details.html
- tour-details.js
- inquiry-common.css
- inquiry-common.js

Changes are limited to public inquiry forms:
- One shared field/control style across all inquiry forms.
- Country appears before Mobile/WhatsApp.
- Country is a dropdown.
- Mobile is disabled until a country is selected.
- Selecting a country automatically inserts its dial code.
- Dial-code-only is not accepted as a complete phone number.
- Reset returns mobile to disabled state.
- Existing Worker/API/Security/Admin/CMS logic is untouched.

The old ceybreez-country-phone.js file may remain on the server; these updated pages no longer load it.
