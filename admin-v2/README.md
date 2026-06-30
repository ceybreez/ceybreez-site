# CeyBreez Enterprise PMS - Modular Base V19

This package keeps the current V19 working admin behaviour while preparing a cleaner modular structure.

## Upload
Upload this folder as:

```text
admin-v2/
```

Do not replace Worker. Do not touch live `/admin/`.

## Active runtime files
- admin.html
- admin.css
- admin.js
- v14-shell.js

## Modular preparation
- css/ contains split CSS entry files.
- sections/ contains extracted HTML sections for future migration.
- modules/ contains prepared folders for future JS module split.

## Important
Root `admin.js` remains active for now to avoid breaking V10/V19 tested logic.
The date-picker overlap issue is not solved in this package; it will be handled as a separate Availability Protection patch.
