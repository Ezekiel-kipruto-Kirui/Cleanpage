# Cleanpage

This folder contains only the deployable React app, the Vercel serverless functions, and the Firebase database rules/config.

It intentionally excludes:

- Django and Python backend code
- local `.env` secrets
- local build output
- migration/export helper files

## Run locally

```sh
npm install
npm run dev
```

The local app server runs the React frontend and the TypeScript serverless handlers together.

## Environment variables

Use `.env.example` as the template and set:

- `JWT_SECRET`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_DATABASE_AUTH_TOKEN` if protected Firebase paths require server-side access

## Deploy

This folder is ready to be used as the project root for Vercel.

Firebase rules files included here:

- `.firebaserc`
- `firebase.json`
- `database.rules.json`
