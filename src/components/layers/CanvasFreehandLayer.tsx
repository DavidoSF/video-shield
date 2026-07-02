import { useEffect, useRef, useState } from "react";
import type { FreehandAnnotation, Point } from "../../types/annotation";
import { useReviewDispatch, useReviewState } from "../../state/ReviewContext";
import { createFreehandAnnotation } from "../../utils/annotationFactory";

// Selectable stroke widths offered by the freehand width picker.
const STROKE_WIDTH_PRESETS = [2, 4, 8];

// Translate every point of a freehand stroke by (dx, dy) percentage units.
function translateFreehand(
  a: FreehandAnnotation,
  dx: number,
  dy: number,
): FreehandAnnotation {
  return {
    ...a,
    points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    updatedAt: new Date().toISOString(),
  };
}

// A finished stroke awaiting its optional comment before being committed.
type PendingForm =
  | { visible: false }
  | { visible: true; points: Point[] };

// Default freehand stroke thickness (device-independent pixels).
const STROKE_WIDTH = 4;

// Minimum spacing between stored points (in percentage units). Pointer events
// fire far more often than we need; thinning keeps the JSON small without
// visibly changing the stroke.
const MIN_POINT_DISTANCE = 0.4;

// Trace a smooth path through the points using quadratic curves between segment
// midpoints (Catmull-Rom-style smoothing). Caller sets stroke style and calls
// stroke(). Points are in percentages; rect converts them to canvas pixels.
function buildSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  rect: DOMRect,
) {
  const px = (p: Point) => (p.x / 100) * rect.width;
  const py = (p: Point) => (p.y / 100) * rect.height;

  ctx.beginPath();
  ctx.moveTo(px(points[0]), py(points[0]));

  if (points.length === 2) {
    ctx.lineTo(px(points[1]), py(points[1]));
    return;
  }

  for (let i = 1; i < points.length - 1; i += 1) {
    const midX = (px(points[i]) + px(points[i + 1])) / 2;
    const midY = (py(points[i]) + py(points[i + 1])) / 2;
    ctx.quadraticCurveTo(px(points[i]), py(points[i]), midX, midY);
  }

  // Final leg to the last captured point.
  const last = points[points.length - 1];
  ctx.lineTo(px(last), py(last));
}

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
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  // Degenerate segment (a === b): fall back to point distance.
  const t =
    lenSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function CanvasFreehandLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    activeTool,
    activeColor,
    annotations,
    author,
    currentTime,
    selectedAnnotationId,
  } = useReviewState();
  const dispatch = useReviewDispatch();

  function isSameSecond(timestamp: number) {
    return Math.floor(timestamp) === Math.floor(currentTime);
  }

  // The stroke currently being drawn. Kept in a ref (not React state) so each
  // pointer-move paints directly to the canvas without re-rendering the tree.
  const strokeRef = useRef<Point[] | null>(null);

  // A completed stroke held on-screen while the user fills in its comment.
  const [form, setForm] = useState<PendingForm>({ visible: false });

  // Active pen thickness, chosen from the freehand width picker.
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTH);

  // Ids of strokes this client created, newest last — drives Ctrl+Z undo so we
  // only undo our own work, never another collaborator's stroke.
  const undoStackRef = useRef<string[]>([]);

  // Drag-to-move state for repositioning a stroke with the select tool.
  const moveRef = useRef<
    | { active: true; original: FreehandAnnotation; startPct: Point }
    | { active: false }
  >({ active: false });

  // Set when we claim a freehand select so the trailing click doesn't reach the
  // SVG layer beneath and clear the selection we just made.
  const suppressNextClickRef = useRef(false);

  // The selected annotation, if it's one of our freehand strokes.
  const selectedFreehand =
  (annotations.find(
    (a) =>
      a.id === selectedAnnotationId &&
      a.type === "freehand" &&
      isSameSecond(a.timestamp),
  ) as FreehandAnnotation | undefined) ?? null;

  // Mirror "is a freehand selected" into a ref so the tool-change effect can read
  // it without re-running every time the selection changes.
  const selectedIsFreehandRef = useRef(false);

  // Clear our freehand selection whenever the active tool changes. Scoped to
  // freehand so we never clear a selection owned by the SVG layer.
  useEffect(() => {
    if (selectedIsFreehandRef.current) {
      dispatch({ type: "SET_SELECTED_ANNOTATION", payload: null });
    }
  }, [activeTool, dispatch]);

  // Recolour the selected stroke from the single toolbar palette: when the
  // active colour changes while a freehand stroke is selected, apply it.
  const prevColorRef = useRef(activeColor);
  useEffect(() => {
    if (activeColor === prevColorRef.current) return;
    prevColorRef.current = activeColor;
    if (selectedFreehand) {
      dispatch({
        type: "MOVE_ANNOTATION",
        payload: {
          ...selectedFreehand,
          color: activeColor,
          updatedAt: new Date().toISOString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeColor, dispatch]);

  // Keep the ref in sync after every render (declared last so the tool-change
  // effect above still sees the previous value when the tool switches).
  useEffect(() => {
    selectedIsFreehandRef.current = !!selectedFreehand;
  });

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

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      annotations
        .filter(
          (annotation) =>
            annotation.type === "freehand" &&
            isSameSecond(annotation.timestamp),
        )
        .forEach((annotation) => {
          if (annotation.type !== "freehand" || annotation.points.length < 2)
            return;

          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Halo behind the selected stroke so it reads as "selected".
          if (annotation.id === selectedAnnotationId) {
            buildSmoothPath(ctx, annotation.points, rect);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = annotation.strokeWidth + 6;
            ctx.stroke();
          }

          buildSmoothPath(ctx, annotation.points, rect);
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.stroke();
        });

      // Keep the just-finished stroke visible while its comment form is open.
      if (form.visible && form.points.length >= 2) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        buildSmoothPath(ctx, form.points, rect);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [
    annotations,
    selectedAnnotationId,
    form,
    activeColor,
    strokeWidth,
    currentTime,
  ]);

  // Select / delete a freehand stroke by hit-testing against its points.
  // A window-level capture listener lets us claim the click only when it lands
  // on a stroke; otherwise the event falls through to the SVG layer beneath.
  useEffect(() => {
    if (activeTool !== "select" && activeTool !== "delete") return;

    function findHitFreehand(
      clientX: number,
      clientY: number,
    ): FreehandAnnotation | null {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      // Iterate top-most stroke first (last drawn wins on overlap).
      for (let i = annotations.length - 1; i >= 0; i -= 1) {
        const a = annotations[i];
        if (
          a.type !== "freehand" ||
          a.points.length < 2 ||
          !isSameSecond(a.timestamp)
        ) {
          continue;
        }
        const tolerance = a.strokeWidth / 2 + 6;
        for (let j = 0; j < a.points.length - 1; j += 1) {
          const p1 = a.points[j];
          const p2 = a.points[j + 1];
          const d = distanceToSegment(
            px,
            py,
            (p1.x / 100) * rect.width,
            (p1.y / 100) * rect.height,
            (p2.x / 100) * rect.width,
            (p2.y / 100) * rect.height,
          );
          if (d <= tolerance) return a;
        }
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      // Ignore interactions with the freehand controls panel.
      if ((e.target as HTMLElement | null)?.closest("[data-freehand-controls]"))
        return;

      const hit = findHitFreehand(e.clientX, e.clientY);
      if (!hit) return; // let SVG annotations underneath handle it

      // Claim the event so the SVG layer doesn't also act on this click.
      e.stopPropagation();

      if (activeTool === "delete") {
        dispatch({ type: "DELETE_ANNOTATION", payload: hit.id });
        return;
      }

      // select tool: select the stroke and begin a drag-to-move.
      // Suppress the trailing click so the SVG layer doesn't deselect it.
      suppressNextClickRef.current = true;
      dispatch({ type: "SET_SELECTED_ANNOTATION", payload: hit.id });
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      moveRef.current = {
        active: true,
        original: hit,
        startPct: toPercent(e.clientX, e.clientY, rect),
      };
    }

    function onClick(e: MouseEvent) {
      if (!suppressNextClickRef.current) return;
      suppressNextClickRef.current = false;
      e.stopPropagation(); // stop the SVG layer's empty-click deselect
    }

    function onPointerMove(e: PointerEvent) {
      const move = moveRef.current;
      if (!move.active) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cur = toPercent(e.clientX, e.clientY, rect);
      // Always translate from the ORIGINAL stroke by the total delta (drift-free).
      dispatch({
        type: "MOVE_ANNOTATION",
        payload: translateFreehand(
          move.original,
          cur.x - move.startPct.x,
          cur.y - move.startPct.y,
        ),
      });
    }

    function onPointerUp() {
      if (moveRef.current.active) moveRef.current = { active: false };
    }

    // Capture phase: runs before React's synthetic handlers on the SVG layer.
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [activeTool, annotations, dispatch, currentTime]);

  // Ctrl/Cmd+Z removes the most recent freehand stroke this client created.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key !== "z" && e.key !== "Z") || !(e.ctrlKey || e.metaKey)) return;
      // Don't hijack undo while typing in the comment form.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;

      const stack = undoStackRef.current;
      // Pop ids until we find one that still exists (skip already-deleted ones).
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (annotations.some((a) => a.id === id)) {
          e.preventDefault();
          dispatch({ type: "DELETE_ANNOTATION", payload: id });
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [annotations, dispatch]);

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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.beginPath();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo((from.x / 100) * rect.width, (from.y / 100) * rect.height);
    ctx.lineTo((to.x / 100) * rect.width, (to.y / 100) * rect.height);
    ctx.stroke();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (activeTool !== "freehand") return;
    if (form.visible) return; // don't start a new stroke while the form is open
    // Starting a new stroke clears any existing selection.
    if (selectedAnnotationId)
      dispatch({ type: "SET_SELECTED_ANNOTATION", payload: null });
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
    // Skip points too close to the last one to keep the stored stroke compact.
    if (Math.hypot(next.x - prev.x, next.y - prev.y) < MIN_POINT_DISTANCE)
      return;
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

    setForm({ visible: true, points: stroke });
  }

  function handlePointerCancel() {
    strokeRef.current = null;
  }

  function handleFormSubmit(comment: string) {
    if (!form.visible) return;
    const annotation = createFreehandAnnotation({
      points: form.points,
      strokeWidth,
      timestamp: currentTime,
      author,
      comment,
      color: activeColor,
    });
    dispatch({ type: "ADD_ANNOTATION", payload: annotation });
    undoStackRef.current.push(annotation.id); // track for Ctrl+Z undo
    setForm({ visible: false });
  }

  function handleFormCancel() {
    // Discard the pending stroke; the redraw effect clears it from the canvas.
    setForm({ visible: false });
  }

  function resizeSelected(width: number) {
    if (!selectedFreehand) return;
    dispatch({
      type: "MOVE_ANNOTATION",
      payload: {
        ...selectedFreehand,
        strokeWidth: width,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  // The width row controls the selected stroke when one is selected, otherwise
  // the pen width for new strokes.
  const widthValue = selectedFreehand
    ? selectedFreehand.strokeWidth
    : strokeWidth;
  const setWidth = (w: number) =>
    selectedFreehand ? resizeSelected(w) : setStrokeWidth(w);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={
          activeTool === "freehand" ? "canvas-layer enabled" : "canvas-layer"
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Canvas freehand layer"
      />

      {(activeTool === "freehand" || selectedFreehand) && (
        <div
          data-freehand-controls
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            background: "rgba(15, 23, 42, 0.85)",
            borderRadius: 8,
          }}
          role="group"
          aria-label={
            selectedFreehand ? "Selected stroke width" : "Freehand stroke width"
          }
        >
          {STROKE_WIDTH_PRESETS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              title={`Stroke width ${w}`}
              aria-label={`Stroke width ${w}`}
              aria-pressed={widthValue === w}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                cursor: "pointer",
                background: "#1e293b",
                border:
                  widthValue === w ? "2px solid #fff" : "1px solid #475569",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 16,
                  height: w,
                  borderRadius: w,
                  background: "#fff",
                }}
              />
            </button>
          ))}
        </div>
      )}

      {form.visible && (
        <FreehandCommentForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </>
  );
}

// Inline comment form for a freehand stroke — mirrors Dev B's SVG input form
// so the two layers feel identical. Rendered as a fixed overlay.
type FreehandCommentFormProps = {
  onSubmit: (comment: string) => void;
  onCancel: () => void;
};

function FreehandCommentForm({
  onSubmit,
  onCancel,
}: FreehandCommentFormProps) {
  const [comment, setComment] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(comment);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <form
      className="annotation-form"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <p className="annotation-form-title">New freehand</p>

      <input
        className="annotation-form-input"
        type="text"
        placeholder="Comment (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus
      />

      <div className="annotation-form-actions">
        <button type="submit" className="annotation-form-submit">
          Add
        </button>
        <button
          type="button"
          className="annotation-form-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
