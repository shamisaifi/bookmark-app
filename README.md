# Smart Bookmark Manager

A bookmark manager with Google auth and real-time updates.

**Live:** [your-app.vercel.app](https://your-app.vercel.app)
**Repo:** [GitHub](https://github.com/shamisaifi/bookmark-app)

## Stack
Next.js 16 · Supabase (Auth, Database, Realtime) · Tailwind CSS · Vercel

## Features
- Google OAuth (no email/password)
- Add & delete personal bookmarks
- Real-time sync across tabs on insert
- Private data per user via Row Level Security

## Problems & Solutions

**Google OAuth** — Redirect URI mismatch between Google Cloud Console and Supabase took time to debug. Fixed by correctly mapping the Supabase callback URL in Google Cloud and handling the code exchange in `/api/auth/callback`.

**Real-time deletes** — Supabase free tier doesn't send full row data on DELETE events, so real-time delete across tabs isn't possible without upgrading. Solved with optimistic UI removal instead — instant feedback, reliable.

**Duplicate inserts** — Real-time INSERT events were firing alongside manual state updates causing duplicates. Fixed with an existence check before updating state.

## Run Locally
```bash
npm install && npm run dev
```
Add `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```