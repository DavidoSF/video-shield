import { useEffect, useRef, useState } from "react";
import type { Annotation, Point } from "../../types/annotation";
import { useReviewDispatch, useReviewState } from "../../state/ReviewContext";

// ─── local types ──────────────────────────────────────────────────────────────

type DrawState =
  | { active: false }
  | { active: true; start: Point; current: Point };

// Active annotation being repositioned with the select tool.
type MoveState =
  | { active: false }
  | {
      active: true;
      annotationId: string;
      startSvg: Point;
      original: Annotation;
    };

// Partial geometry collected before the user fills in the comment / label.
type PartialData =
  | { type: "arrow"; start: Point; end: Point }
  | { type: "line"; start: Point; end: Point }
  | { type: "rectangle"; origin: Point; width: number; height: number }
  | { type: "circle"; center: Point; radius: number }
  | { type: "text"; position: Point };

type FormState =
  | { visible: false }
  | { visible: true; partial: PartialData; screenX: number; screenY: number };

// ─── helpers ──────────────────────────────────────────────────────────────────

function toPercent(clientX: number, clientY: number, rect: DOMRect): Point {
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
  };
}

function colorId(c: string): string {
  return c.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Translate every coordinate in an annotation by (dx, dy) percentage units. */
function applyDelta(
  annotation: Annotation,
  dx: number,
  dy: number,
): Annotation {
  const ts = new Date().toISOString();
  switch (annotation.type) {
    case "arrow":
    case "line":
      return {
        ...annotation,
        start: { x: annotation.start.x + dx, y: annotation.start.y + dy },
        end: { x: annotation.end.x + dx, y: annotation.end.y + dy },
        updatedAt: ts,
      };
    case "rectangle":
      return {
        ...annotation,
        origin: { x: annotation.origin.x + dx, y: annotation.origin.y + dy },
        updatedAt: ts,
      };
    case "circle":
      return {
        ...annotation,
        center: { x: annotation.center.x + dx, y: annotation.center.y + dy },
        updatedAt: ts,
      };
    case "text":
      return {
        ...annotation,
        position: {
          x: annotation.position.x + dx,
          y: annotation.position.y + dy,
        },
        updatedAt: ts,
      };
    case "freehand":
      return {
        ...annotation,
        points: annotation.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        updatedAt: ts,
      };
  }
}

// ─── main component ───────────────────────────────────────────────────────────

export function SvgAnnotationLayer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    activeTool,
    activeColor,
    annotations,
    author,
    currentTime,
    selectedAnnotationId,
  } = useReviewState();
  const dispatch = useReviewDispatch();

  const [drawState, setDrawState] = useState<DrawState>({ active: false });
  // Move state lives in a ref so native DOM listeners always read the current
  // value without stale-closure issues.
  const moveRef = useRef<MoveState>({ active: false });
  const [isMoving, setIsMoving] = useState(false);
  const [formState, setFormState] = useState<FormState>({ visible: false });

  // Register window-level native pointer listeners for drag-to-move.
  // Window-level ensures we never miss pointerup even when the cursor leaves
  // the SVG, and avoids React's synthetic-event / pointer-capture mismatch.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const move = moveRef.current;
      if (!move.active) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cur = toPercent(e.clientX, e.clientY, rect);
      dispatch({
        type: "MOVE_ANNOTATION",
        payload: applyDelta(
          move.original,
          cur.x - move.startSvg.x,
          cur.y - move.startSvg.y,
        ),
      });
    }

    function onUp() {
      if (!moveRef.current.active) return;
      moveRef.current = { active: false };
      setIsMoving(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dispatch]);

  const isDragTool =
    activeTool === "arrow" ||
    activeTool === "line" ||
    activeTool === "rectangle" ||
    activeTool === "circle";
  const isActiveSvgTool = isDragTool || activeTool === "text";
  // Disable the layer's pointer-events while the input form is open so
  // accidental clicks on the video don't start a second annotation.
  const layerEnabled =
    (isActiveSvgTool || activeTool === "delete") && !formState.visible;

  const svgAnnotations = annotations.filter(
    (a) =>
      a.type !== "freehand" &&
      Math.floor(a.timestamp) === Math.floor(currentTime),
  );

  // ─── coordinate helpers ───────────────────────────────────────────────────

  function svgPoint(e: React.PointerEvent | React.MouseEvent): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return toPercent(e.clientX, e.clientY, rect);
  }

  // ─── show the inline input form ───────────────────────────────────────────

  function openForm(partial: PartialData, clientX: number, clientY: number) {
    const formWidth = 260;
    const formHeight = 300;
    const gap = 5;

    let x = clientX + gap;
    let y = clientY - formHeight - gap;

    // If the form would go off the right side, place it to the left of the cursor.
    if (x + formWidth > window.innerWidth) {
      x = clientX - formWidth - gap;
    }

    // If the form would go too low, place it above the cursor.
    if (y + formHeight > window.innerHeight) {
      y = clientY - formHeight - gap;
    }

    setFormState({
      visible: true,
      partial,
      screenX: Math.max(gap, x),
      screenY: Math.max(gap, y),
    });
  }

  // ─── annotation pointer-down: delete click or start drag-to-move ─────────

  function handleAnnotationPointerDown(
    e: React.PointerEvent,
    annotation: Annotation,
  ) {
    e.stopPropagation();

    if (activeTool === "delete") {
      dispatch({ type: "DELETE_ANNOTATION", payload: annotation.id });
      return;
    }

    dispatch({ type: "SET_SELECTED_ANNOTATION", payload: annotation.id });

    if (formState.visible) return;

    moveRef.current = {
      active: true,
      annotationId: annotation.id,
      startSvg: svgPoint(e),
      original: annotation,
    };

    setIsMoving(true);
  }

  // ─── drag-to-draw — uses pointer capture so pointerup always fires ────────

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!isDragTool || formState.visible) return;
    e.preventDefault();
    // Capture the pointer: all future pointer events (including pointerup
    // when the mouse leaves the element) are routed to this SVG element.
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = svgPoint(e);
    setDrawState({ active: true, start: pt, current: pt });
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawState.active) return;
    setDrawState({ ...drawState, current: svgPoint(e) });
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawState.active) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const end = svgPoint(e);
    setDrawState({ active: false });

    if (activeTool === "arrow" || activeTool === "line") {
      openForm(
        { type: activeTool, start: drawState.start, end },
        e.clientX,
        e.clientY,
      );
    } else if (activeTool === "rectangle") {
      const x = Math.min(drawState.start.x, end.x);
      const y = Math.min(drawState.start.y, end.y);
      const w = Math.abs(end.x - drawState.start.x);
      const h = Math.abs(end.y - drawState.start.y);
      if (w < 0.5 || h < 0.5) return; // ignore accidental micro-clicks
      openForm(
        { type: "rectangle", origin: { x, y }, width: w, height: h },
        e.clientX,
        e.clientY,
      );
    } else if (activeTool === "circle") {
      const dx = end.x - drawState.start.x;
      const dy = end.y - drawState.start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius < 0.5) return;
      openForm(
        { type: "circle", center: drawState.start, radius },
        e.clientX,
        e.clientY,
      );
    }
  }

  // ─── click for text tool ─────────────────────────────────────────────────

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (formState.visible) return;

    if (activeTool === "text") {
      const pt = svgPoint(e);
      openForm({ type: "text", position: pt }, e.clientX, e.clientY);
      return;
    }

    if (e.target === e.currentTarget && activeTool === "select") {
      dispatch({ type: "SET_SELECTED_ANNOTATION", payload: null });
    }
  }

  // ─── form callbacks ───────────────────────────────────────────────────────

  function handleFormSubmit(comment: string, textContent?: string) {
    if (!formState.visible) return;

    const base = {
      id: crypto.randomUUID(),
      timestamp: currentTime,
      author,
      comment: comment.trim(),
      color: activeColor,
      createdAt: new Date().toISOString(),
    };

    const p = formState.partial;
    let annotation: Annotation;

    if (p.type === "arrow") {
      annotation = { ...base, type: "arrow", start: p.start, end: p.end };
    } else if (p.type === "line") {
      annotation = { ...base, type: "line", start: p.start, end: p.end };
    } else if (p.type === "rectangle") {
      annotation = {
        ...base,
        type: "rectangle",
        origin: p.origin,
        width: p.width,
        height: p.height,
      };
    } else if (p.type === "circle") {
      annotation = {
        ...base,
        type: "circle",
        center: p.center,
        radius: p.radius,
      };
    } else {
      annotation = {
        ...base,
        type: "text",
        position: p.position,
        text: textContent?.trim() || "Review note",
      };
    }

    dispatch({ type: "ADD_ANNOTATION", payload: annotation });
    setFormState({ visible: false });
  }

  function handleFormCancel() {
    setFormState({ visible: false });
  }

  // ─── live drag preview ────────────────────────────────────────────────────

  let preview: React.ReactNode = null;
  if (drawState.active) {
    if (activeTool === "arrow") {
      preview = renderArrowPreview(
        drawState.start,
        drawState.current,
        activeColor,
      );
    } else if (activeTool === "line") {
      preview = renderLinePreview(
        drawState.start,
        drawState.current,
        activeColor,
      );
    } else if (activeTool === "rectangle") {
      preview = renderRectPreview(
        drawState.start,
        drawState.current,
        activeColor,
      );
    } else if (activeTool === "circle") {
      preview = renderCirclePreview(
        drawState.start,
        drawState.current,
        activeColor,
      );
    }
  }

  const cursorStyle: React.CSSProperties = {
    cursor: isMoving
      ? "grabbing"
      : formState.visible
        ? "default"
        : isActiveSvgTool || activeTool === "delete"
          ? "crosshair"
          : "default",
  };

  const arrowColors = Array.from(
    new Set(
      svgAnnotations.filter((a) => a.type === "arrow").map((a) => a.color),
    ),
  );

  return (
    <>
      <svg
        ref={svgRef}
        className={layerEnabled ? "svg-layer enabled" : "svg-layer"}
        style={cursorStyle}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleSvgClick}
        role="img"
        aria-label="SVG annotations layer"
      >
        <defs>
          {arrowColors.map((c) => (
            <ArrowMarkerDef key={c} color={c} />
          ))}
          {drawState.active && activeTool === "arrow" && (
            <ArrowMarkerDef color={activeColor} preview />
          )}
        </defs>

        {svgAnnotations.map((annotation) => {
          const isSelected = annotation.id === selectedAnnotationId;
          // 'movable' adds the grab cursor when the select tool is active
          const cls = [
            "annotation",
            isSelected ? "selected" : "",
            activeTool !== "delete" ? "movable" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const onPD = (ev: React.PointerEvent) =>
            handleAnnotationPointerDown(ev, annotation);
          // Stop clicks on annotations from reaching the SVG's text-tool handler.
          const onCK = (ev: React.MouseEvent) => ev.stopPropagation();

          if (annotation.type === "arrow") {
            return (
              <line
                key={annotation.id}
                className={cls}
                x1={annotation.start.x}
                y1={annotation.start.y}
                x2={annotation.end.x}
                y2={annotation.end.y}
                stroke={annotation.color}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                markerEnd={`url(#arrowhead-${colorId(annotation.color)})`}
                onPointerDown={onPD}
                onClick={onCK}
              />
            );
          }

          if (annotation.type === "line") {
            return (
              <line
                key={annotation.id}
                className={cls}
                x1={annotation.start.x}
                y1={annotation.start.y}
                x2={annotation.end.x}
                y2={annotation.end.y}
                stroke={annotation.color}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                onPointerDown={onPD}
                onClick={onCK}
              />
            );
          }

          if (annotation.type === "rectangle") {
            return (
              <rect
                key={annotation.id}
                className={cls}
                x={annotation.origin.x}
                y={annotation.origin.y}
                width={annotation.width}
                height={annotation.height}
                fill="transparent"
                stroke={annotation.color}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                onPointerDown={onPD}
                onClick={onCK}
              />
            );
          }

          if (annotation.type === "circle") {
            return (
              <circle
                key={annotation.id}
                className={cls}
                cx={annotation.center.x}
                cy={annotation.center.y}
                r={annotation.radius}
                fill="transparent"
                stroke={annotation.color}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                onPointerDown={onPD}
                onClick={onCK}
              />
            );
          }

          if (annotation.type === "text") {
            return (
              <text
                key={annotation.id}
                className={cls}
                x={annotation.position.x}
                y={annotation.position.y}
                fill={annotation.color}
                fontSize="4"
                fontWeight="700"
                onPointerDown={onPD}
                onClick={onCK}
              >
                {annotation.text}
              </text>
            );
          }

          return null;
        })}

        {preview}
      </svg>

      {/* Inline input form — rendered outside the SVG as a fixed overlay so
          it is never clipped by the video-stage overflow:hidden */}
      {formState.visible && (
        <AnnotationInputForm
          annotationType={formState.partial.type}
          screenX={formState.screenX}
          screenY={formState.screenY}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </>
  );
}

// ─── arrow marker ─────────────────────────────────────────────────────────────

function ArrowMarkerDef({
  color,
  preview = false,
}: {
  color: string;
  preview?: boolean;
}) {
  const id = `arrowhead-${colorId(color)}${preview ? "-preview" : ""}`;
  return (
    <marker
      id={id}
      markerWidth="10"
      markerHeight="10"
      refX="8"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,6 L9,3 z" fill={color} stroke="none" />
    </marker>
  );
}

// ─── drag previews ────────────────────────────────────────────────────────────

const PREVIEW_PROPS = {
  strokeDasharray: "3 2" as const,
  opacity: 0.75,
  vectorEffect: "non-scaling-stroke" as const,
  pointerEvents: "none" as const,
};

function renderArrowPreview(start: Point, current: Point, color: string) {
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={current.x}
      y2={current.y}
      stroke={color}
      strokeWidth="1.4"
      markerEnd={`url(#arrowhead-${colorId(color)}-preview)`}
      {...PREVIEW_PROPS}
    />
  );
}

function renderLinePreview(start: Point, current: Point, color: string) {
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={current.x}
      y2={current.y}
      stroke={color}
      strokeWidth="1.4"
      {...PREVIEW_PROPS}
    />
  );
}

function renderRectPreview(start: Point, current: Point, color: string) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  return (
    <rect
      x={x}
      y={y}
      width={Math.abs(current.x - start.x)}
      height={Math.abs(current.y - start.y)}
      fill="transparent"
      stroke={color}
      strokeWidth="1.4"
      {...PREVIEW_PROPS}
    />
  );
}

function renderCirclePreview(start: Point, current: Point, color: string) {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return (
    <circle
      cx={start.x}
      cy={start.y}
      r={Math.sqrt(dx * dx + dy * dy)}
      fill="transparent"
      stroke={color}
      strokeWidth="1.4"
      {...PREVIEW_PROPS}
    />
  );
}

// ─── inline annotation input form ────────────────────────────────────────────

type AnnotationInputFormProps = {
  annotationType: PartialData["type"];
  screenX: number;
  screenY: number;
  onSubmit: (comment: string, textContent?: string) => void;
  onCancel: () => void;
};

function AnnotationInputForm({
  annotationType,
  screenX,
  screenY,
  onSubmit,
  onCancel,
}: AnnotationInputFormProps) {
  const [comment, setComment] = useState("");
  const [labelText, setLabelText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(comment, annotationType === "text" ? labelText : undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <form
      className="annotation-form"
      style={{ left: screenX, top: screenY }}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <p className="annotation-form-title">
        {annotationType === "text" ? "Text label" : `New ${annotationType}`}
      </p>

      {annotationType === "text" && (
        <input
          className="annotation-form-input"
          type="text"
          placeholder="Label text…"
          value={labelText}
          onChange={(e) => setLabelText(e.target.value)}
          autoFocus
        />
      )}

      <input
        className="annotation-form-input"
        type="text"
        placeholder="Comment (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus={annotationType !== "text"}
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
