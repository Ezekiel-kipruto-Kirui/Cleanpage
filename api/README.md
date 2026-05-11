# Vercel API

These serverless functions replace the Django backend for the React deployment.
The Vercel function at `/api/render` now serves the HTML app shell for page
requests, while the auth and data functions handle API work.

Firebase is handled on the serverless side. The React app does not need
`initializeApp(...)` or direct Firebase SDK access for auth or database reads.
Your Vercel functions now own the Firebase project configuration and JWT flow.

Embedded Firebase project defaults:

- `projectId`: `cleanpage-6fa02`
- `databaseURL`: `https://cleanpage-6fa02-default-rtdb.firebaseio.com`
- `authDomain`: `cleanpage-6fa02.firebaseapp.com`

Required Vercel environment variables:

- `JWT_SECRET` - long random string used to sign access and refresh tokens.

Recommended Vercel environment variables:

- `FIREBASE_DATABASE_AUTH_TOKEN` - token/secret used by the Vercel function to read and write protected database paths.
- `FIREBASE_DATABASE_URL` - optional override for the built-in database URL.
- `ROAMTECH_API_KEY` - SMS API key for order/customer messaging.
- `ROAMTECH_PARTNER_ID` - SMS partner ID.
- `SHORTCODE` - SMS sender shortcode used in the provider payload.

Auth expects users in Firebase under `auth_users`. The export script at
`../../scripts/export_firebase_data.py` creates that collection from Django users
and stores existing Django `pbkdf2_sha256` password hashes as `password_hash`.

Protect `auth_users` in Firebase security rules so browser clients cannot read
password hashes directly. If you keep `auth_users` protected, the Vercel
functions need `FIREBASE_DATABASE_AUTH_TOKEN` or equivalent server-side access.

Optional SMS environment variables:

- `SMS_BASE_URL` - defaults to `https://api.v2.emalify.com`
- `SMS_NOTIFICATIONS_ENABLED` - set to `false` to disable outbound SMS without removing credentials

SMS behavior now handled by the serverless backend:

- `POST /api/Laundry/send-sms/` sends single or bulk SMS
- creating a laundry order sends a confirmation SMS to the customer
- updating an order to `Completed` or `Delivered_picked` sends a status SMS
- updating an order payment to `completed` sends a payment confirmation SMS

Deployment note:

- Point the Vercel project root at `Front-end`.
- Local full server: `npm run dev`
- Local Vite-only server: `npm run dev:vite`
- Server typecheck: `npm run typecheck:server`
- Build command: `npm run build`
- Output directory: `dist`
