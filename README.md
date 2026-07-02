# Augmented Review Player — Video Shield

ESTIAM Hackathon — Subject A: Augmented Review Player.

This React app lets reviewers annotate a video with SVG shapes, Canvas freehand drawings, timestamped comments, real-time WebSocket synchronization, and JSON export.

## Implemented features

- React/Vite video review player
- Current video timestamp tracking
- SVG annotations: arrow, line, rectangle, circle, text label
- Canvas freehand drawing with stored point data
- Annotation comments with edit/delete
- Jump from comment to video timestamp
- JSON export with video metadata and annotations
- WebSocket collaboration server for multi-window / multi-user sync
- Connection status and connected-user count

## Requirements

Use Node.js 20.19+ or 22.12+.

## Run locally

Open two terminals.

Terminal 1 — WebSocket server:

```bash
npm install
npm run ws
```

Terminal 2 — React app:

```bash
npm run dev
```

Open:

```txt
http://localhost:5173?user=Reviewer1
```

For a second reviewer, open another tab/window:

```txt
http://localhost:5173?user=Reviewer2
```

Both windows connect to the same review room. Create an annotation in one window and it should appear live in the other window.

## Demo video

The player now loads the STREAMIX secure HLS stream instead of a raw `.mp4`
(see [Security integration: STREAMIX](#security-integration-streamix) below).
You can still change the source in `src/components/review/ReviewPlayer.tsx`
if you need to point at a different `.m3u8`.

## Security integration: STREAMIX

The video-security team's brique (`../STREAMIX`) protects playback:

- the video is served as an AES-128-encrypted HLS stream, not a `.mp4`;
- the AES key is only handed out by their key-server if the request carries a
  valid temporary token;
- every key request (granted or denied) is logged.

This app is wired up as follows:

- `src/auth/authClient.ts` calls the key-server's real
  `POST /auth/login` (email + password, checked against a local SQLite DB,
  bcrypt-hashed) and keeps the returned session token in module memory only.
- `src/streamix/streamixClient.ts` exchanges that session token for a
  temporary HLS key token via `GET /token` (`Authorization: Bearer
  <session token>`), also kept in memory only — never in the URL, never in
  `video.m3u8`, never in storage.
- `src/components/video/VideoPlayer.tsx` uses `hls.js` to load
  `video.m3u8`. Its `xhrSetup` hook adds `Authorization: Bearer <token>` to
  the `/key` request that hls.js makes when it hits the stream's
  `EXT-X-KEY` tag.
- Logging out (button in the app header) clears both tokens.

Config (see `.env.example`, copy to `.env`):

- `VITE_STREAMIX_HLS_URL` — defaults to `https://localhost:8443/hls/video.m3u8`
- `VITE_STREAMIX_AUTH_LOGIN_URL` — defaults to `https://localhost:3001/auth/login`
- `VITE_STREAMIX_TOKEN_URL` — defaults to `https://localhost:3001/token`

To run it end-to-end:

1. In `../STREAMIX`, follow its README (`.\start.ps1`, or the manual
   `docker compose up -d` + `node .\backend\key-server\server.js`) to bring
   up nginx (HLS on `:8443`) and the key-server (`:3001`). The key-server
   auto-seeds a demo account (`DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in its
   `.env`, defaults to `demo@streamix.local` / `StreamixDemo123!`) with
   access to `VIDEO_ID` in its local SQLite DB (`backend/key-server/data/streamix.db`).
2. Accept the self-signed localhost certificate in your browser once (visit
   `https://localhost:8443` and `https://localhost:3001` directly) —
   otherwise the browser silently blocks the HLS/token requests.
3. `npm run dev` here, open the app, and log in with the demo account (or
   `POST /auth/register` a new one — it's auto-granted access to `VIDEO_ID`
   for demo purposes). The player fetches a session token, exchanges it for
   an HLS key token, and starts playing.

Real auth is now in place end to end (login → session JWT → per-user video
access check → HLS key token). Remaining gap: `/auth/register` auto-grants
access to the demo video for any new signup, which is fine for a hackathon
demo but would need an approval/invite step in production.

## WebSocket protocol

The local server runs on:

```txt
ws://localhost:8081
```

Supported events:

- `annotation:upsert` — create/update an annotation or comment
- `annotation:delete` — delete an annotation everywhere
- `presence` — update connected-user count

## Dev E demo checklist

1. Start `npm run ws`.
2. Start `npm run dev`.
3. Open two browser windows with different `?user=` values.
4. Confirm the header says `WebSocket: connected` and shows 2 users.
5. Draw an arrow in window 1.
6. Confirm it appears in window 2.
7. Edit a comment in window 2.
8. Confirm the update appears in window 1.
9. Delete an annotation in one window.
10. Confirm it disappears in the other window.
11. Export JSON and open the file to prove the structured deliverable.

## Team integration notes

- Developer A owns the app shell, video player, global state, and integration.
- Developer B owns SVG annotations.
- Developer C owns Canvas freehand drawing.
- Developer D owns comments, timestamps, and JSON export.
- Developer E owns WebSocket real-time collaboration and final testing.
