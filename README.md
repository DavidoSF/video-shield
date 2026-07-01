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
http://localhost:5173?user=Mohamad
```

For a second reviewer, open another tab/window:

```txt
http://localhost:5173?user=Reviewer2
```

Both windows connect to the same review room. Create an annotation in one window and it should appear live in the other window.

## Demo video

The app currently loads:

```txt
public/videos/flower.mp4
```

You can change the video source in `src/components/review/ReviewPlayer.tsx`.

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
