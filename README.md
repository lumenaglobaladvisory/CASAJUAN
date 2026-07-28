# Casa Juan — Pre-Launch Landing Page & Email Pipeline

Quiet luxury pre-launch landing page for Casa Juan (Fort Lauderdale, FL). Collects
email/phone signups, tags leads by source, sends an automated welcome email via
Resend, and includes an admin dashboard for search, export, and campaign sends.

Built to the Casa Juan Quiet Luxury Brand Kit v1.0.

## Project Overview

- **Frontend** (`public/`): static HTML/CSS/vanilla JS. Age gate → hero → email
  capture → brand philosophy strip → live subscriber count → footer.
- **Backend** (`server/`): Node.js + Express API for subscribing, counting,
  event tracking, and the admin dashboard.
- **Database**: Supabase (Postgres) — `subscribers`, `campaigns`, `events` tables.
- **Email**: Resend — welcome email on signup, campaign sends from the admin
  dashboard.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (reserved for future client-side use) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side DB access) |
| `RESEND_API_KEY` | Resend API key for sending email |
| `ADMIN_PASSWORD` | Password for the `/admin` dashboard login |
| `ADMIN_API_KEY` | Key required in the `x-admin-key` header for `POST /api/admin/export` |
| `PORT` | Local server port (default `3000`) |
| `NODE_ENV` | `development` or `production` |

### 3. Set up the Supabase database

In your Supabase project, open the SQL editor and run `supabase/schema.sql`.
This creates the `subscribers`, `campaigns`, and `events` tables with the
indexes used by the app.

### 4. Run locally

```bash
npm start
```

Visit `http://localhost:3000`. The admin dashboard is at
`http://localhost:3000/admin`.

For auto-restart on file changes during development:

```bash
npm run dev
```

## API Endpoints

- `POST /api/subscribe` — create a subscriber (validates email, dedupes,
  tags by referral source, sends welcome email).
- `GET /api/count` — total subscriber count, cached 60s.
- `POST /api/event` — fire-and-forget analytics event logging.
- `POST /api/admin/export` — full subscriber list as JSON, protected by the
  `x-admin-key` header (must match `ADMIN_API_KEY`).
- Admin dashboard endpoints (`/api/admin/login`, `/subscribers`,
  `/export` (CSV), `/campaigns/send`) are protected by a session cookie set
  after logging in with `ADMIN_PASSWORD` at `/admin`.

## Deploying to Railway

1. Push this repository to GitHub (or connect it directly) and create a new
   Railway project from it. `railway.json` is already configured to run
   `node server/index.js` with Nixpacks.
2. In the Railway project's **Variables** tab, add every variable from
   `.env.example` with your real values, and set `NODE_ENV=production`.
3. Deploy. Railway will install dependencies and start the server
   automatically.
4. Confirm the site loads at the generated `*.up.railway.app` domain before
   connecting a custom domain.

## Connecting a Custom Domain

1. In the Railway project, go to the service's **Settings → Networking →
   Custom Domain** and add your domain (e.g. `casajuan.com`).
2. Railway will show a CNAME (or A/ALIAS) record to add at your DNS
   provider. Add that record and wait for propagation/SSL provisioning.
3. Once verified, Railway serves the app on your domain over HTTPS
   automatically.

## Sending a Campaign to All Subscribers

1. Log in at `/admin` with `ADMIN_PASSWORD`.
2. Scroll to **Send Campaign**, enter a subject and HTML body.
3. Click **Send to All Subscribers**, then confirm in the modal.
4. The campaign is recorded in the `campaigns` table and sent via Resend to
   every subscriber's email on file.

## Exporting the Subscriber List

- **From the dashboard**: click **Export CSV** on `/admin` (requires an
  active admin session) to download `casajuan-subscribers.csv`.
- **Programmatically**: `POST /api/admin/export` with header
  `x-admin-key: <ADMIN_API_KEY>` returns the full list as JSON.

## Notes

- The brand kit lists Champagne Gold as `#B99A5`, which is not a valid
  6-digit hex value. This build uses `#B99A56` (confirmed with the brand
  owner) as the working value — update `--champagne-gold` in
  `public/styles.css`, `public/admin.css`, and `server/services/email.js` if
  the true value differs.
- `public/assets/logo.png` and `public/assets/can-mockup.png` are
  placeholders — swap in final brand assets before launch.
