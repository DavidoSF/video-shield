import type { ReactNode } from 'react';
import type { ToolType } from '../../types/annotation';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';

type ToolItem = {
  value: ToolType;
  label: string;
  icon: ReactNode;
};

const tools: ToolItem[] = [
  { value: 'select', label: 'Select', icon: <SelectIcon /> },
  { value: 'arrow', label: 'Arrow', icon: <ArrowIcon /> },
  { value: 'line', label: 'Line', icon: <LineIcon /> },
  { value: 'rectangle', label: 'Rect', icon: <RectIcon /> },
  { value: 'circle', label: 'Circle', icon: <CircleIcon /> },
  { value: 'text', label: 'Text', icon: <TextIcon /> },
  { value: 'freehand', label: 'Draw', icon: <PenIcon /> },
  { value: 'delete', label: 'Delete', icon: <TrashIcon /> },
];

const COLOR_PALETTE: Array<{ value: string; label: string }> = [
  { value: '#3497bb', label: 'Theme Blue' },
  { value: '#f97316', label: 'Orange' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#ef4444', label: 'Red' },
  { value: '#a855f7', label: 'Purple' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#000000', label: 'Black' },
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
          aria-label={tool.label}
          aria-pressed={activeTool === tool.value}
          title={tool.label}
        >
          <span className="tool-icon" aria-hidden="true">
            {tool.icon}
          </span>
          <span className="tool-label">{tool.label}</span>
        </button>
      ))}

      <span className="toolbar-sep" aria-hidden="true" />

      {COLOR_PALETTE.map((c) => (
        <button
          key={c.value}
          type="button"
          className={activeColor === c.value ? 'color-swatch active' : 'color-swatch'}
          style={{ '--swatch-color': c.value } as React.CSSProperties}
          onClick={() => dispatch({ type: 'SET_ACTIVE_COLOR', payload: c.value })}
          aria-label={`${c.label} annotation colour`}
          aria-pressed={activeColor === c.value}
          title={c.label}
        />
      ))}
    </div>
  );
}

function SelectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 3l7 17 2-7 7-2L4 3z" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 19L19 5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 19L19 5" />
      <path d="M9 5h10v10" />
    </svg>
  );
}

function RectIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="6" width="14" height="12" rx="1" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 6h14" />
      <path d="M12 6v12" />
      <path d="M9 18h6" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20c4-1 5-3 6-6l7-7a2 2 0 0 1 3 3l-7 7c-3 1-5 2-6 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}