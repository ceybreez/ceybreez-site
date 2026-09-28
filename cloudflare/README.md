# CeyBreez Cloudflare backend

`worker.js` is the Worker source supplied with this website package. The public site and `/admin/` currently call `https://ceybreez-contact-api.ceybreez.workers.dev`.

Required Cloudflare bindings/secrets depend on your existing production Worker configuration and include the D1 database binding (`DB`), R2 media bucket (`IMAGES_BUCKET`), admin authentication secret/token, Resend email key (`RESEND_API_KEY`), and OpenRouteService key (`ORS_API_KEY`). Keep production secrets in Cloudflare settings — never commit them to GitHub.

If you change the Worker URL, update the `API_BASE` constants in the public/admin JavaScript files.
