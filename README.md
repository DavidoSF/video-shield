# Augmented Review Player — Developer A Starter

This is the Developer A base for the Augmented Review Player project.

Developer A owns:

- React/Vite project setup
- Main app layout
- Video player core
- Current timestamp tracking
- Shared annotation state
- Active tool state
- Selected annotation state
- Integration shell for SVG, Canvas, comments, WebSocket, and JSON export

## Requirements

Use Node.js 20.19+ or 22.12+.

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Demo video

The app expects this file:

```txt
public/videos/demo.mp4
```

A short generated demo video is already included. You can replace it with your team's own video later.

## Team integration notes

- Developer B should replace `SvgAnnotationLayer.tsx` demo click logic with real pointer drawing for arrows, rectangles, circles, and text.
- Developer C should replace `CanvasFreehandLayer.tsx` demo click logic with real pointer-based freehand drawing.
- Developer D can keep using `annotations` from `ReviewContext` for comments and export.
- Developer E can dispatch `UPSERT_REMOTE_ANNOTATION`, `DELETE_ANNOTATION`, and `SET_CONNECTION_STATUS` from WebSocket events.
