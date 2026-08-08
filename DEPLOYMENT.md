# FrameBridge Studio deployment

FrameBridge Studio is deployed as a Vite frontend and Express serverless API on Vercel, with a private Supabase Postgres data layer.

## Production

- Website: `https://framebridge-studio.vercel.app`
- Health check: `https://framebridge-studio.vercel.app/api/health`
- Vercel project: `vaibhavbibhus-projects/framebridge-studio`
- Supabase resource: `supabase-copper-garden`

## Required Vercel environment variables

The Supabase Marketplace integration supplies `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, Postgres connection variables, and related public keys. The application additionally requires:

- `JWT_SECRET`: sensitive random production secret.
- `ADMIN_EMAIL`: administrator email address.
- `ADMIN_PASSWORD`: sensitive 16+ character administrator password.
- `CLIENT_URL`: `https://framebridge-studio.vercel.app`.

Never commit these values. `.env`, `.env.local`, `.vercel`, and integration-generated agent files are ignored.

## Data security

`public.framebridge_documents` has row-level security enabled. Browser roles have no table privileges. Only the server-side Supabase secret can access application records, and the existing API JWT and role middleware performs user authorization. Payment screenshots remain protected behind the admin API.

## Deploy

Push reviewed changes to `main` for connected Git deployments, or build and deploy through the authenticated Vercel CLI. After every deployment, verify the homepage, `/api/health`, registration, authenticated profile lookup, and administrator login.
