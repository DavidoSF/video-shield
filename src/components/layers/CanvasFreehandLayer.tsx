import { useEffect, useRef } from 'react';
import type { FreehandAnnotation, Point } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

// Default freehand stroke thickness (device-independent pixels).
const STROKE_WIDTH = 4;

// Same percentage-coordinate helper Dev B uses in the SVG layer, so freehand
// strokes stay aligned with the video and with SVG annotations on resize.
function toPercent(clientX: number, clientY: number, rect: DOMRect): Point {
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
  };
}

// Shortest distance (in pixels) from point p to the segment a–b.
function distanceToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  // Degenerate segment (a === b): fall back to point distance.
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function CanvasFreehandLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { activeTool, activeColor, annotations, author, currentTime, selectedAnnotationId } =
    useReviewState();
  const dispatch = useReviewDispatch();

  // The stroke currently being drawn. Kept in a ref (not React state) so each
  // pointer-move paints directly to the canvas without re-rendering the tree.
  const strokeRef = useRef<Point[] | null>(null);

  // Redraw every committed freehand stroke from saved data. Re-runs whenever the
  // annotation list changes and recomputes pixel positions from percentages on
  // resize, so strokes stay aligned with the video.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      annotations
        .filter((annotation) => annotation.type === 'freehand')
        .forEach((annotation) => {
          if (annotation.type !== 'freehand' || annotation.points.length < 2) return;

          const trace = () => {
            ctx.beginPath();
            const [firstPoint, ...rest] = annotation.points;
            ctx.moveTo((firstPoint.x / 100) * rect.width, (firstPoint.y / 100) * rect.height);
            rest.forEach((point) => {
              ctx.lineTo((point.x / 100) * rect.width, (point.y / 100) * rect.height);
            });
          };

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Halo behind the selected stroke so it reads as "selected".
          if (annotation.id === selectedAnnotationId) {
            trace();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = annotation.strokeWidth + 6;
            ctx.stroke();
          }

          trace();
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.stroke();
        });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [annotations, selectedAnnotationId]);

  // Select / delete a freehand stroke by hit-testing against its points.
  // A window-level capture listener lets us claim the click only when it lands
  // on a stroke; otherwise the event falls through to the SVG layer beneath.
  useEffect(() => {
    if (activeTool !== 'select' && activeTool !== 'delete') return;

    function findHitFreehand(clientX: number, clientY: number) {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // Iterate top-most stroke first (last drawn wins on overlap).
      for (let i = annotations.length - 1; i >= 0; i -= 1) {
        const a = annotations[i];
        if (a.type !== 'freehand' || a.points.length < 2) continue;
        const tolerance = a.strokeWidth / 2 + 6;
        for (let j = 0; j < a.points.length - 1; j += 1) {
          const p1 = a.points[j];
          const p2 = a.points[j + 1];
          const d = distanceToSegment(
            px, py,
            (p1.x / 100) * rect.width, (p1.y / 100) * rect.height,
            (p2.x / 100) * rect.width, (p2.y / 100) * rect.height,
          );
          if (d <= tolerance) return a;
        }
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      const hit = findHitFreehand(e.clientX, e.clientY);
      if (!hit) return; // let SVG annotations underneath handle it

      // Claim the event so the SVG layer doesn't also act on this click.
      e.stopPropagation();
      if (activeTool === 'delete') {
        dispatch({ type: 'DELETE_ANNOTATION', payload: hit.id });
      } else {
        dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: hit.id });
      }
    }

    // Capture phase: runs before React's synthetic handlers on the SVG layer.
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [activeTool, annotations, dispatch]);

  // Convert a pointer event to percentage coordinates against the canvas.
  function eventToPercent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return toPercent(e.clientX, e.clientY, rect);
  }

  // Paint a single segment live as the user drags. Uses CSS-pixel coordinates;
  // the context transform (set in resizeCanvas) scales them to device pixels.
  function drawSegment(from: Point, to: Point) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.beginPath();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo((from.x / 100) * rect.width, (from.y / 100) * rect.height);
    ctx.lineTo((to.x / 100) * rect.width, (to.y / 100) * rect.height);
    ctx.stroke();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== 'freehand') return;
    e.preventDefault();
    // Capture the pointer so we keep receiving move/up even off the canvas.
    e.currentTarget.setPointerCapture(e.pointerId);
    strokeRef.current = [eventToPercent(e)];
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const prev = stroke[stroke.length - 1];
    const next = eventToPercent(e);
    stroke.push(next);
    drawSegment(prev, next);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = strokeRef.current;
    if (!stroke) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    strokeRef.current = null;

    // Ignore taps that produced no real line.
    if (stroke.length < 2) return;

    const annotation: FreehandAnnotation = {
      id: crypto.randomUUID(),
      type: 'freehand',
      points: stroke,
      strokeWidth: STROKE_WIDTH,
      timestamp: currentTime,
      author,
      color: activeColor,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }

  function handlePointerCancel() {
    strokeRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={activeTool === 'freehand' ? 'canvas-layer enabled' : 'canvas-layer'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label="Canvas freehand layer"
    />
  );
}
