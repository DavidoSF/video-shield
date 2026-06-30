import { useEffect, useRef } from 'react';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { createDemoAnnotation } from '../../utils/annotationFactory';

export function CanvasFreehandLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { activeTool, annotations, author, currentTime } = useReviewState();
  const dispatch = useReviewDispatch();

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

          ctx.beginPath();
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = annotation.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const [firstPoint, ...rest] = annotation.points;
          ctx.moveTo((firstPoint.x / 100) * rect.width, (firstPoint.y / 100) * rect.height);
          rest.forEach((point) => {
            ctx.lineTo((point.x / 100) * rect.width, (point.y / 100) * rect.height);
          });

          ctx.stroke();
        });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [annotations]);

  function handleClick() {
    if (activeTool !== 'freehand') return;

    const comment = window.prompt('Add a comment for this freehand note:', 'Freehand note') ?? '';
    const annotation = createDemoAnnotation({
      type: 'freehand',
      timestamp: currentTime,
      author,
      comment,
    });

    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }

  return (
    <canvas
      ref={canvasRef}
      className={activeTool === 'freehand' ? 'canvas-layer enabled' : 'canvas-layer'}
      onClick={handleClick}
      aria-label="Canvas freehand layer"
    />
  );
}
