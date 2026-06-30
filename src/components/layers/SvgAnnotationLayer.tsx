import { useRef, useState } from 'react';
import type { Annotation, Point } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

// ─── local types ──────────────────────────────────────────────────────────────

type DrawState =
  | { active: false }
  | { active: true; start: Point; current: Point };

// Partial geometry collected before the user fills in the comment / label.
type PartialData =
  | { type: 'arrow'; start: Point; end: Point }
  | { type: 'rectangle'; origin: Point; width: number; height: number }
  | { type: 'circle'; center: Point; radius: number }
  | { type: 'text'; position: Point };

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
  return c.replace(/[^a-zA-Z0-9]/g, '_');
}

// ─── main component ───────────────────────────────────────────────────────────

export function SvgAnnotationLayer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeTool, activeColor, annotations, author, currentTime, selectedAnnotationId } =
    useReviewState();
  const dispatch = useReviewDispatch();

  const [drawState, setDrawState] = useState<DrawState>({ active: false });
  const [formState, setFormState] = useState<FormState>({ visible: false });

  const isDragTool = activeTool === 'arrow' || activeTool === 'rectangle' || activeTool === 'circle';
  const isActiveSvgTool = isDragTool || activeTool === 'text';
  // Disable the layer's pointer-events while the input form is open so
  // accidental clicks on the video don't start a second annotation.
  const layerEnabled =
    (isActiveSvgTool || activeTool === 'select' || activeTool === 'delete') && !formState.visible;

  const svgAnnotations = annotations.filter((a) => a.type !== 'freehand');

  // ─── coordinate helpers ───────────────────────────────────────────────────

  function svgPoint(e: React.PointerEvent | React.MouseEvent): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return toPercent(e.clientX, e.clientY, rect);
  }

  function toScreen(p: Point): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: rect.left + (p.x / 100) * rect.width,
      y: rect.top + (p.y / 100) * rect.height,
    };
  }

  // ─── show the inline input form ───────────────────────────────────────────

  function openForm(partial: PartialData, anchor: Point) {
    const s = toScreen(anchor);
    setFormState({
      visible: true,
      partial,
      // Keep the form inside the viewport
      screenX: Math.min(s.x + 10, window.innerWidth - 260),
      screenY: Math.min(s.y + 10, window.innerHeight - 150),
    });
  }

  // ─── annotation click (select / delete) ──────────────────────────────────

  function handleAnnotationClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (activeTool === 'delete') {
      dispatch({ type: 'DELETE_ANNOTATION', payload: id });
    } else {
      dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: id });
    }
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

    if (activeTool === 'arrow') {
      openForm({ type: 'arrow', start: drawState.start, end }, end);
    } else if (activeTool === 'rectangle') {
      const x = Math.min(drawState.start.x, end.x);
      const y = Math.min(drawState.start.y, end.y);
      const w = Math.abs(end.x - drawState.start.x);
      const h = Math.abs(end.y - drawState.start.y);
      if (w < 0.5 || h < 0.5) return; // ignore accidental micro-clicks
      openForm({ type: 'rectangle', origin: { x, y }, width: w, height: h }, end);
    } else if (activeTool === 'circle') {
      const dx = end.x - drawState.start.x;
      const dy = end.y - drawState.start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius < 0.5) return;
      openForm({ type: 'circle', center: drawState.start, radius }, end);
    }
  }

  // ─── click for text tool ─────────────────────────────────────────────────

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (formState.visible) return;

    if (activeTool === 'text') {
      const pt = svgPoint(e);
      openForm({ type: 'text', position: pt }, pt);
      return;
    }

    if (e.target === e.currentTarget && activeTool === 'select') {
      dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: null });
    }
  }

  // ─── form callbacks ───────────────────────────────────────────────────────

  function handleFormSubmit(comment: string, textContent?: string) {
    if (!formState.visible) return;

    const base = {
      id: crypto.randomUUID(),
      timestamp: currentTime,
      author,
      comment: comment.trim() || undefined,
      color: activeColor,
      createdAt: new Date().toISOString(),
    };

    const p = formState.partial;
    let annotation: Annotation;

    if (p.type === 'arrow') {
      annotation = { ...base, type: 'arrow', start: p.start, end: p.end };
    } else if (p.type === 'rectangle') {
      annotation = { ...base, type: 'rectangle', origin: p.origin, width: p.width, height: p.height };
    } else if (p.type === 'circle') {
      annotation = { ...base, type: 'circle', center: p.center, radius: p.radius };
    } else {
      annotation = {
        ...base,
        type: 'text',
        position: p.position,
        text: textContent?.trim() || 'Review note',
      };
    }

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setFormState({ visible: false });
  }

  function handleFormCancel() {
    setFormState({ visible: false });
  }

  // ─── live drag preview ────────────────────────────────────────────────────

  let preview: React.ReactNode = null;
  if (drawState.active) {
    if (activeTool === 'arrow') {
      preview = renderArrowPreview(drawState.start, drawState.current, activeColor);
    } else if (activeTool === 'rectangle') {
      preview = renderRectPreview(drawState.start, drawState.current, activeColor);
    } else if (activeTool === 'circle') {
      preview = renderCirclePreview(drawState.start, drawState.current, activeColor);
    }
  }

  const cursorStyle: React.CSSProperties = {
    cursor: formState.visible ? 'default' : isActiveSvgTool || activeTool === 'delete' ? 'crosshair' : 'default',
  };

  const arrowColors = Array.from(
    new Set(svgAnnotations.filter((a) => a.type === 'arrow').map((a) => a.color)),
  );

  return (
    <>
      <svg
        ref={svgRef}
        className={layerEnabled ? 'svg-layer enabled' : 'svg-layer'}
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
          {drawState.active && activeTool === 'arrow' && (
            <ArrowMarkerDef color={activeColor} preview />
          )}
        </defs>

        {svgAnnotations.map((annotation) => {
          const isSelected = annotation.id === selectedAnnotationId;
          const cls = isSelected ? 'annotation selected' : 'annotation';
          const onClick = (ev: React.MouseEvent) => handleAnnotationClick(ev, annotation.id);

          if (annotation.type === 'arrow') {
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
                onClick={onClick}
              />
            );
          }

          if (annotation.type === 'rectangle') {
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
                onClick={onClick}
              />
            );
          }

          if (annotation.type === 'circle') {
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
                onClick={onClick}
              />
            );
          }

          if (annotation.type === 'text') {
            return (
              <text
                key={annotation.id}
                className={cls}
                x={annotation.position.x}
                y={annotation.position.y}
                fill={annotation.color}
                fontSize="4"
                fontWeight="700"
                onClick={onClick}
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

function ArrowMarkerDef({ color, preview = false }: { color: string; preview?: boolean }) {
  const id = `arrowhead-${colorId(color)}${preview ? '-preview' : ''}`;
  return (
    <marker id={id} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill={color} stroke="none" />
    </marker>
  );
}

// ─── drag previews ────────────────────────────────────────────────────────────

const PREVIEW_PROPS = {
  strokeDasharray: '3 2' as const,
  opacity: 0.75,
  vectorEffect: 'non-scaling-stroke' as const,
  pointerEvents: 'none' as const,
};

function renderArrowPreview(start: Point, current: Point, color: string) {
  return (
    <line
      x1={start.x} y1={start.y} x2={current.x} y2={current.y}
      stroke={color} strokeWidth="1.4"
      markerEnd={`url(#arrowhead-${colorId(color)}-preview)`}
      {...PREVIEW_PROPS}
    />
  );
}

function renderRectPreview(start: Point, current: Point, color: string) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  return (
    <rect
      x={x} y={y}
      width={Math.abs(current.x - start.x)}
      height={Math.abs(current.y - start.y)}
      fill="transparent" stroke={color} strokeWidth="1.4"
      {...PREVIEW_PROPS}
    />
  );
}

function renderCirclePreview(start: Point, current: Point, color: string) {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return (
    <circle
      cx={start.x} cy={start.y} r={Math.sqrt(dx * dx + dy * dy)}
      fill="transparent" stroke={color} strokeWidth="1.4"
      {...PREVIEW_PROPS}
    />
  );
}

// ─── inline annotation input form ────────────────────────────────────────────

type AnnotationInputFormProps = {
  annotationType: PartialData['type'];
  screenX: number;
  screenY: number;
  onSubmit: (comment: string, textContent?: string) => void;
  onCancel: () => void;
};

function AnnotationInputForm({ annotationType, screenX, screenY, onSubmit, onCancel }: AnnotationInputFormProps) {
  const [comment, setComment] = useState('');
  const [labelText, setLabelText] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(comment, annotationType === 'text' ? labelText : undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
  }

  return (
    <form
      className="annotation-form"
      style={{ left: screenX, top: screenY }}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <p className="annotation-form-title">
        {annotationType === 'text' ? 'Text label' : `New ${annotationType}`}
      </p>

      {annotationType === 'text' && (
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
        autoFocus={annotationType !== 'text'}
      />

      <div className="annotation-form-actions">
        <button type="submit" className="annotation-form-submit">Add</button>
        <button type="button" className="annotation-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
