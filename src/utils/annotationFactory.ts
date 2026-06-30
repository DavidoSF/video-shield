import type { Annotation, AnnotationType, FreehandAnnotation, Point } from '../types/annotation';

type CreateAnnotationOptions = {
  type: AnnotationType;
  timestamp: number;
  author: string;
  comment?: string;
  color?: string;
};

const defaultColor = '#f97316';

function baseAnnotation(options: CreateAnnotationOptions) {
  return {
    id: crypto.randomUUID(),
    type: options.type,
    timestamp: options.timestamp,
    comment: options.comment?.trim() || undefined,
    author: options.author,
    color: options.color ?? defaultColor,
    createdAt: new Date().toISOString(),
  };
}

type CreateFreehandOptions = {
  points: Point[];
  strokeWidth: number;
  timestamp: number;
  author: string;
  comment?: string;
  color?: string;
};

/** Build a freehand annotation from captured stroke points (Dev C). */
export function createFreehandAnnotation(options: CreateFreehandOptions): FreehandAnnotation {
  return {
    id: crypto.randomUUID(),
    type: 'freehand',
    points: options.points,
    strokeWidth: options.strokeWidth,
    timestamp: options.timestamp,
    comment: options.comment?.trim() || undefined,
    author: options.author,
    color: options.color ?? defaultColor,
    createdAt: new Date().toISOString(),
  };
}

export function createDemoAnnotation(options: CreateAnnotationOptions): Annotation {
  const base = baseAnnotation(options);

  switch (options.type) {
    case 'arrow':
      return {
        ...base,
        type: 'arrow',
        start: { x: 20, y: 30 },
        end: { x: 55, y: 45 },
      };

    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        origin: { x: 35, y: 30 },
        width: 25,
        height: 20,
      };

    case 'circle':
      return {
        ...base,
        type: 'circle',
        center: { x: 50, y: 50 },
        radius: 12,
      };

    case 'text':
      return {
        ...base,
        type: 'text',
        position: { x: 44, y: 25 },
        text: options.comment?.trim() || 'Review note',
      };

    case 'freehand': {
      const points: Point[] = [
        { x: 30, y: 60 },
        { x: 34, y: 56 },
        { x: 40, y: 58 },
        { x: 48, y: 54 },
        { x: 57, y: 59 },
      ];

      return {
        ...base,
        type: 'freehand',
        points,
        strokeWidth: 4,
      };
    }
  }
}
