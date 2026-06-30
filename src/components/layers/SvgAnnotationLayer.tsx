import { useMemo } from 'react';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { createDemoAnnotation } from '../../utils/annotationFactory';

export function SvgAnnotationLayer() {
  const { activeTool, annotations, author, currentTime, selectedAnnotationId } = useReviewState();
  const dispatch = useReviewDispatch();
  const isDrawingSvgTool = ['arrow', 'rectangle', 'circle', 'text'].includes(activeTool);

  const svgAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.type !== 'freehand'),
    [annotations],
  );

  function handleSvgClick() {
    if (!['arrow', 'rectangle', 'circle', 'text'].includes(activeTool)) {
      return;
    }

    const comment = window.prompt('Add a comment for this annotation:', 'Check this moment') ?? '';
    const annotation = createDemoAnnotation({
      type: activeTool as 'arrow' | 'rectangle' | 'circle' | 'text',
      timestamp: currentTime,
      author,
      comment,
    });

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }

  return (
    <svg
      className={isDrawingSvgTool ? 'svg-layer enabled' : 'svg-layer'}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      onClick={handleSvgClick}
      role="img"
      aria-label="SVG annotations layer"
    >
      <defs>
        <marker
          id="arrow-head"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
        </marker>
      </defs>

      {svgAnnotations.map((annotation) => {
        const isSelected = annotation.id === selectedAnnotationId;
        const commonProps = {
          key: annotation.id,
          className: isSelected ? 'annotation selected' : 'annotation',
          onClick: (event: React.MouseEvent) => {
            event.stopPropagation();
            dispatch({ type: 'SET_SELECTED_ANNOTATION', payload: annotation.id });
          },
        };

        if (annotation.type === 'arrow') {
          return (
            <line
              {...commonProps}
              x1={annotation.start.x}
              y1={annotation.start.y}
              x2={annotation.end.x}
              y2={annotation.end.y}
              stroke={annotation.color}
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#arrow-head)"
            />
          );
        }

        if (annotation.type === 'rectangle') {
          return (
            <rect
              {...commonProps}
              x={annotation.origin.x}
              y={annotation.origin.y}
              width={annotation.width}
              height={annotation.height}
              fill="transparent"
              stroke={annotation.color}
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        if (annotation.type === 'circle') {
          return (
            <circle
              {...commonProps}
              cx={annotation.center.x}
              cy={annotation.center.y}
              r={annotation.radius}
              fill="transparent"
              stroke={annotation.color}
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
            />
          );
        }

        if (annotation.type === 'text') {
          return (
            <text
              {...commonProps}
              x={annotation.position.x}
              y={annotation.position.y}
              fill={annotation.color}
              fontSize="4"
              fontWeight="700"
            >
              {annotation.text}
            </text>
          );
        }

        return null;
      })}
    </svg>
  );
}
