# CeyBreez Admin-v2 Refactor Pack 1

## Purpose
This pack keeps the current UI exactly the same and only starts cleaning the architecture.

## Changes
- Keeps Dashboard UI as-is.
- Loads the modular Dashboard module after `v14-shell.js`.
- Updates `v14-shell.js` so Dashboard rendering can be handled by the modular dashboard module.
- Removes the Sprint 3 Inquiry module auto-load from `admin.html` so Inquiry returns to the previous working UI.
- Leaves existing `admin.js` logic untouched.

## Files changed
- `admin.html`
- `v14-shell.js`

## Upload
Upload/replace the full `admin-v2/` folder in Cloudflare Pages/GitHub.

## Test checklist
1. Login works.
2. Dashboard loads.
3. Sidebar Dashboard refresh works.
4. Inquiry page looks like the previous compact table/modal UI.
5. Booking page works.
6. Availability page works.
7. Date picker red/disabled dates still work.

## Rollback
Restore your current backup of `admin-v2` if anything looks wrong.
