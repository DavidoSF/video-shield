import type { ToolType } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

const tools: Array<{ value: ToolType; label: string }> = [
  { value: 'select', label: 'Select' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'rectangle', label: 'Rect' },
  { value: 'circle', label: 'Circle' },
  { value: 'text', label: 'Text' },
  { value: 'freehand', label: 'Freehand' },
  { value: 'delete', label: 'Delete' },
];

const COLOR_PALETTE: Array<{ value: string; label: string }> = [
  { value: '#f97316', label: 'Orange' },
  { value: '#38bdf8', label: 'Sky Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#fbbf24', label: 'Amber' },
  { value: '#ffffff', label: 'White' },
];

export function AnnotationToolbar() {
  const { activeTool, activeColor } = useReviewState();
  const dispatch = useReviewDispatch();

  return (
    <div className="toolbar" role="toolbar" aria-label="Annotation toolbar">
      {tools.map((tool) => (
        <button
          key={tool.value}
          type="button"
          className={activeTool === tool.value ? 'tool-button active' : 'tool-button'}
          onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.value })}
        >
          {tool.label}
        </button>
      ))}

      {/* Visual separator between tools and colour swatches */}
      <span className="toolbar-sep" aria-hidden="true" />

      {COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          className={activeColor === c.value ? 'color-swatch active' : 'color-swatch'}
          style={{ '--swatch-color': c.value } as React.CSSProperties}
          onClick={() => dispatch({ type: 'SET_ACTIVE_COLOR', payload: c.value })}
          aria-label={`${c.label} annotation colour`}
          title={c.label}
        />
      ))}
    </div>
  );
}
