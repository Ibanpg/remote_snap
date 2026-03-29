# NOCTURNE

A browser-based virtual club: DJs stream a **Snap Camera Kit** lens from the booth; guests watch over **WebRTC**, chat in real time (**Supabase**), and vote on sets. Leaderboards aggregate votes across sessions.

## Stack

| Area | Tech |
|------|------|
| UI | React 19, Vite 8, Tailwind CSS 4, React Router |
| Backend (data) | Supabase (Auth, Postgres, RLS, Realtime) |
| AR | [@snap/camera-kit](https://www.npmjs.com/package/@snap/camera-kit) (Camera Kit Web) |
| Live video | WebRTC; a small **Node** server (`server/signal.mjs`) exchanges SDP/ICE only — not the media path |

## Prerequisites

- **Node.js** 20+ recommended  
- A **Supabase** project ([supabase.com](https://supabase.com))  
- **Snap / Camera Kit** API token and a Lens published for **Camera Kit Web** ([Snap for Developers](https://developers.snap.com/camera-kit))

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd dj_set
npm install
cd web && npm install && cd ..
```

### 2. Supabase

1. Create a project and enable **Email** auth (Authentication → Providers).  
2. In the SQL editor, run the migration in `supabase/migrations/20260328120000_virtual_club.sql`.  
3. If `alter publication supabase_realtime add table` fails, enable **Realtime** for `session_comments` in the dashboard.  
4. Copy **Project URL** and **anon public key** (Settings → API).

### 3. Environment variables

Create `web/.env` (see `web/.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SNAP_API_TOKEN` | Camera Kit Web API token |
| `VITE_LENS_ID` | Lens ID from the Camera Kit portal |
| `VITE_LENS_GROUP_ID` | Lens Group ID for that lens |
| `VITE_SIGNAL_URL` | WebSocket URL for signaling (local: `ws://localhost:3001`) |

Restart the dev server after changing `.env`.

### 4. Run locally

From the repo root:

```bash
npm run dev
```

This starts:

- Vite on **http://localhost:5173**
- Signaling server on **port 3001** (override with `SIGNAL_PORT`)

Open the app, sign up, create a session, open the **DJ booth** to go live, and open the room URL as a viewer in another tab.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Web + signaling (development) |
| `npm run build` | Production build of `web/` → `web/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run signal` | Signaling server only |

## Project layout

```
dj_set/
├── server/signal.mjs      # WebRTC signaling (WebSocket)
├── supabase/migrations/   # Database schema + RLS
└── web/                   # React app (Vite)
```

## Deploying on Vercel

The repo includes **`vercel.json`**: install runs in the repo root **and** in `web/`, build uses the root `npm run build`, and output is **`web/dist`**.

1. Import the GitHub repo in Vercel (framework can stay “Other” or Vite — the JSON overrides install/build/output).  
2. Add **environment variables** in the Vercel project (Settings → Environment Variables) — same names as `web/.env.example`, all prefixed with `VITE_` as in local dev.  
3. **`VITE_SIGNAL_URL`**: the WebRTC signaling server is **not** serverless on Vercel. Deploy `server/signal.mjs` somewhere that keeps a long-lived WebSocket (e.g. [Railway](https://railway.app), [Fly.io](https://fly.io), [Render](https://render.com)) and set `VITE_SIGNAL_URL` to `wss://your-host` in production.  
4. Redeploy after changing env vars.

Client-side routes (e.g. `/session/:id`) rely on the SPA rewrite in `vercel.json`.

## Production notes

- Serve the **Vite build** over **HTTPS**.  
- Run the signaling server over **WSS** and point `VITE_SIGNAL_URL` at it.  
- For many viewers or strict NATs, add **TURN** and consider an **SFU** (e.g. LiveKit) instead of pure peer-to-peer from the DJ.  
- Never commit `web/.env` or API secrets.

## License

Private / use at your own discretion.
