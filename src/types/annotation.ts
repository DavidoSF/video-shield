export type ToolType = 'select' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'delete';

export type AnnotationType = Exclude<ToolType, 'select' | 'delete'>;

export type Point = {
  x: number; // percentage from 0 to 100
  y: number; // percentage from 0 to 100
};

export type BaseAnnotation = {
  id: string;
  type: AnnotationType;
  timestamp: number; // seconds in the video
  comment?: string;
  author?: string;
  color: string;
  createdAt: string;
  updatedAt?: string;
};

export type ArrowAnnotation = BaseAnnotation & {
  type: 'arrow';
  start: Point;
  end: Point;
};

export type RectangleAnnotation = BaseAnnotation & {
  type: 'rectangle';
  origin: Point;
  width: number; // percentage of video width
  height: number; // percentage of video height
};

export type CircleAnnotation = BaseAnnotation & {
  type: 'circle';
  center: Point;
  radius: number; // percentage of the smallest video dimension
};

export type TextAnnotation = BaseAnnotation & {
  type: 'text';
  position: Point;
  text: string;
};

export type FreehandAnnotation = BaseAnnotation & {
  type: 'freehand';
  points: Point[];
  strokeWidth: number;
};

export type Annotation =
  | ArrowAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | TextAnnotation
  | FreehandAnnotation;
