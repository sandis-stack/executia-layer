# EXECUTIA 10/10 Deploy Fix

This package includes BOTH engine source files and Vercel-ready static UI files under `/public`.

Critical fix:
- `/dashboard`, `/control`, `/demo`, `/proof`, `/ledger`, `/audit-ledger` route to `/public/...`
- `/components/enterprise.css` and `/components/enterprise.js` route to `/public/components/...`
- This prevents raw unstyled HTML on Vercel.

Deploy validation:
- `npm install`
- `npm run verify`

Expected live checks:
- `/api/v1/health` → OK
- `/dashboard` → styled V8 institutional UI
- `/components/enterprise.css` → CSS file loads
- `/components/enterprise.js` → JS file loads
