# FrameBridge

Full-stack video editing marketplace built with React, Express, Supabase Postgres, manually verified UPI payments, and secure JWT role access. Production is hosted on Vercel at `https://framebridge-studio.vercel.app`.

## Setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`, add the Supabase server variables, and replace the JWT/admin secrets.
3. Apply `server/supabase-schema.sql` to the Supabase database.
4. Run `npm install`, `npm run seed`, then `npm run dev`.
4. Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

UPI payments default to `earnaster@okicici`. Clients scan an amount-specific QR or open the UPI deep link, then submit a screenshot, transaction ID, and payment time. Projects never activate automatically: the admin must approve each transaction. The UPI ID and QR image can be replaced from the admin dashboard.

For production, Vercel builds the Vite client and routes `/api/*` to the Express serverless function. Cloudinary uploads remain optional when its three environment variables are configured. Uploads are limited to 10 files of 100 MB each; use direct signed cloud uploads if larger raw footage must be supported. The initial video can be set through `PUT /api/admin/content/initialVideo`.

## Roles and workflow

- Clients submit projects, accept quotes, pay 30%/70%, chat, and track progress.
- Editors require admin approval, submit anonymous showcase work, quote, message, and update progress.
- Admins approve/block users and work, assign editors, manage content, payments, completion, and commissions.
- Commission is calculated server-side at completion: 17% for the editor's first four completed projects, then 10%.
- Public showcase API responses exclude editor identity and moderation notes.
- Pending editors may sign in to check account state but cannot access protected editor workflows until approved.
