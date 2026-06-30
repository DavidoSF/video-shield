import type { ToolType } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

const tools: Array<{ value: ToolType; label: string }> = [
  { value: 'select', label: 'Select' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' },
  { value: 'text', label: 'Text' },
  { value: 'freehand', label: 'Freehand' },
  { value: 'delete', label: 'Delete' },
];

export function AnnotationToolbar() {
  const { activeTool } = useReviewState();
  const dispatch = useReviewDispatch();

  return (
    <div className="toolbar" aria-label="Annotation toolbar">
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
    </div>
  );
}
