import { useRef, useState } from 'react';
import type { Annotation, Point } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

// ─── local types ──────────────────────────────────────────────────────────────

type DrawState =
  | { active: false }
  | { active: true; start: Point; current: Point };

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert absolute mouse coordinates to SVG-percentage space (0–100). */
function toPercent(clientX: number, clientY: number, rect: DOMRect): Point {
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
  };
}

/** Make a hex colour safe to embed in an SVG id attribute. */
function colorId(color: string): string {
  return color.replace(/[^a-zA-Z0-9]/g, '_');
}

// ─── component ────────────────────────────────────────────────────────────────

export function SvgAnnotationLayer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { activeTool, activeColor, annotations, author, currentTime, selectedAnnotationId } =
    useReviewState();
  const dispatch = useReviewDispatch();
  const [drawState, setDrawState] = useState<DrawState>({ active: false });

  const isDragTool = activeTool === 'arrow' || activeTool === 'rectangle' || activeTool === 'circle';
  const isActiveSvgTool = isDragTool || activeTool === 'text';
  // Enable pointer-events for all SVG-relevant tools so annotation elements stay clickable.
  const layerEnabled = isActiveSvgTool || activeTool === 'select' || activeTool === 'delete';

  const svgAnnotations = annotations.filter((a) => a.type !== 'freehand');

  // ─── coordinate helper ───────────────────────────────────────────────────────

  function getPoint(e: React.MouseEvent): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return toPercent(e.clientX, e.clientY, rect);
  }

  // ─── annotation click ────────────────────────────────────────────────────────

  function handleAnnotationClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (activeTool === 'delete') {
      dispatch({ type: 'DELETE_ANNOTATION', payload: id });
    } else {
      dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: id });
    }
  }

  // ─── drag-to-draw handlers ───────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!isDragTool) return;
    e.preventDefault();
    const pt = getPoint(e);
    setDrawState({ active: true, start: pt, current: pt });
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawState.active) return;
    // If the primary button was released outside the SVG, cancel drawing.
    if (!(e.buttons & 1)) {
      setDrawState({ active: false });
      return;
    }
    setDrawState({ ...drawState, current: getPoint(e) });
  }

  function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawState.active) return;
    const end = getPoint(e);

    // Guard: only handle the arrow tool in this phase.
    // Rectangle and circle are wired up in the next commit.
    if (activeTool !== 'arrow') {
      setDrawState({ active: false });
      return;
    }

    const comment = window.prompt('Add a comment (optional):', '') ?? '';

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'arrow',
      timestamp: currentTime,
      author,
      comment: comment.trim() || undefined,
      color: activeColor,
      createdAt: new Date().toISOString(),
      start: drawState.start,
      end,
    };

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setDrawState({ active: false });
  }

  // Clicking the SVG background with the select tool deselects everything.
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget) return;
    if (activeTool === 'select') {
      dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: null });
    }
  }

  // ─── live drag preview ───────────────────────────────────────────────────────

  const preview =
    drawState.active && activeTool === 'arrow'
      ? renderArrowPreview(drawState.start, drawState.current, activeColor)
      : null;

  // ─── cursor style ────────────────────────────────────────────────────────────

  const cursorStyle: React.CSSProperties = {
    cursor: isActiveSvgTool ? 'crosshair' : activeTool === 'delete' ? 'crosshair' : 'default',
  };

  // ─── collect unique colours used by arrow annotations ────────────────────────

  const arrowColors = Array.from(
    new Set(
      svgAnnotations
        .filter((a) => a.type === 'arrow')
        .map((a) => a.color),
    ),
  );

  return (
    <svg
      ref={svgRef}
      className={layerEnabled ? 'svg-layer enabled' : 'svg-layer'}
      style={cursorStyle}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleSvgClick}
      role="img"
      aria-label="SVG annotations layer"
    >
      <defs>
        {/* One arrow-head marker per colour so each arrow matches its own colour */}
        {arrowColors.map((c) => (
          <ArrowMarkerDef key={c} color={c} />
        ))}
        {/* Extra marker for the in-progress preview (same colour but separate id) */}
        {drawState.active && activeTool === 'arrow' && (
          <ArrowMarkerDef color={activeColor} preview />
        )}
      </defs>

      {/* ── Existing annotations ── */}
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
  );
}

// ─── arrow marker definition ──────────────────────────────────────────────────

function ArrowMarkerDef({ color, preview = false }: { color: string; preview?: boolean }) {
  const id = `arrowhead-${colorId(color)}${preview ? '-preview' : ''}`;
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

// ─── drag preview renderers ───────────────────────────────────────────────────

function renderArrowPreview(start: Point, current: Point, color: string) {
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={current.x}
      y2={current.y}
      stroke={color}
      strokeWidth="1.4"
      strokeDasharray="3 2"
      opacity={0.75}
      vectorEffect="non-scaling-stroke"
      markerEnd={`url(#arrowhead-${colorId(color)}-preview)`}
      pointerEvents="none"
    />
  );
}
