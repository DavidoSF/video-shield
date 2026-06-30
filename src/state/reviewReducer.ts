import type { Annotation, ToolType } from '../types/annotation';

export type ReviewState = {
  videoId: string;
  videoName: string;
  currentTime: number;
  duration: number;
  activeTool: ToolType;
  selectedAnnotationId: string | null;
  annotations: Annotation[];
  author: string;
  connectionStatus: 'offline' | 'connecting' | 'connected';
};

export type ReviewAction =
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: ToolType }
  | { type: 'SET_SELECTED_ANNOTATION'; payload: string | null }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPSERT_REMOTE_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION_COMMENT'; payload: { id: string; comment: string } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: ReviewState['connectionStatus'] };

export const initialReviewState: ReviewState = {
  videoId: 'demo-review-video',
  videoName: 'demo.mp4',
  currentTime: 0,
  duration: 0,
  activeTool: 'select',
  selectedAnnotationId: null,
  annotations: [],
  author: 'Developer A',
  connectionStatus: 'offline',
};

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_DURATION':
      return { ...state, duration: action.payload };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };

    case 'SET_SELECTED_ANNOTATION':
      return { ...state, selectedAnnotationId: action.payload };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        selectedAnnotationId: action.payload.id,
      };

    case 'UPSERT_REMOTE_ANNOTATION': {
      const exists = state.annotations.some((item) => item.id === action.payload.id);
      return {
        ...state,
        annotations: exists
          ? state.annotations.map((item) => (item.id === action.payload.id ? action.payload : item))
          : [...state.annotations, action.payload],
      };
    }

    case 'UPDATE_ANNOTATION_COMMENT':
      return {
        ...state,
        annotations: state.annotations.map((item) =>
          item.id === action.payload.id
            ? { ...item, comment: action.payload.comment, updatedAt: new Date().toISOString() }
            : item,
        ),
      };

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((item) => item.id !== action.payload),
        selectedAnnotationId:
          state.selectedAnnotationId === action.payload ? null : state.selectedAnnotationId,
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    default:
      return state;
  }
}
