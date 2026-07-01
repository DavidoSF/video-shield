import type { Annotation, ToolType } from "../types/annotation";

type ActionMeta = {
  remote?: boolean;
};

export type ReviewState = {
  videoId: string;
  videoName: string;
  currentTime: number;
  duration: number;
  activeTool: ToolType;
  activeColor: string;
  selectedAnnotationId: string | null;
  annotations: Annotation[];
  author: string;
  connectionStatus: "offline" | "connecting" | "connected";
  connectedUsers: number;
};

export type ReviewAction =
  | { type: "SET_CURRENT_TIME"; payload: number; meta?: ActionMeta }
  | { type: "SET_DURATION"; payload: number; meta?: ActionMeta }
  | { type: "SET_ACTIVE_TOOL"; payload: ToolType; meta?: ActionMeta }
  | { type: "SET_ACTIVE_COLOR"; payload: string; meta?: ActionMeta }
  | { type: "SET_SELECTED_ANNOTATION"; payload: string | null; meta?: ActionMeta }
  | { type: "ADD_ANNOTATION"; payload: Annotation; meta?: ActionMeta }
  | { type: "UPSERT_REMOTE_ANNOTATION"; payload: Annotation; meta?: ActionMeta }
  | {
      type: "UPDATE_ANNOTATION_COMMENT";
      payload: { id: string; comment: string };
      meta?: ActionMeta;
    }
  | {
      type: "UPDATE_COMMENT";
      payload: {
        id: string;
        comment: string;
      };
      meta?: ActionMeta;
    }
  | { type: "MOVE_ANNOTATION"; payload: Annotation; meta?: ActionMeta }
  | { type: "DELETE_ANNOTATION"; payload: string; meta?: ActionMeta }
  | { type: "SET_CONNECTION_STATUS"; payload: ReviewState["connectionStatus"]; meta?: ActionMeta }
  | { type: "SET_CONNECTED_USERS"; payload: number; meta?: ActionMeta }
  | { type: "SET_AUTHOR"; payload: string; meta?: ActionMeta };

export const initialReviewState: ReviewState = {
  videoId: "demo-review-video",
  videoName: "demo.mp4",
  currentTime: 0,
  duration: 0,
  activeTool: "select",
  activeColor: "#f97316",
  selectedAnnotationId: null,
  annotations: [],
  author: "Reviewer",
  connectionStatus: "offline",
  connectedUsers: 0,
};

export function reviewReducer(
  state: ReviewState,
  action: ReviewAction,
): ReviewState {
  switch (action.type) {
    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.payload };

    case "SET_DURATION":
      return { ...state, duration: action.payload };

    case "SET_ACTIVE_TOOL":
      return { ...state, activeTool: action.payload };

    case "SET_ACTIVE_COLOR":
      return { ...state, activeColor: action.payload };

    case "SET_SELECTED_ANNOTATION":
      return { ...state, selectedAnnotationId: action.payload };

    case "ADD_ANNOTATION":
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        selectedAnnotationId: action.payload.id,
      };

    case "UPSERT_REMOTE_ANNOTATION": {
      const exists = state.annotations.some(
        (item) => item.id === action.payload.id,
      );
      return {
        ...state,
        annotations: exists
          ? state.annotations.map((item) =>
              item.id === action.payload.id ? action.payload : item,
            )
          : [...state.annotations, action.payload],
      };
    }

    case "UPDATE_ANNOTATION_COMMENT":
      return {
        ...state,
        annotations: state.annotations.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                comment: action.payload.comment,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      };

    case "UPDATE_COMMENT":
      return {
        ...state,
        annotations: state.annotations.map((annotation) =>
          annotation.id === action.payload.id
            ? {
                ...annotation,
                comment: action.payload.comment,
                updatedAt: new Date().toISOString(),
              }
            : annotation,
        ),
      };

    case "MOVE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        ),
      };

    case "DELETE_ANNOTATION":
      return {
        ...state,
        annotations: state.annotations.filter(
          (item) => item.id !== action.payload,
        ),
        selectedAnnotationId:
          state.selectedAnnotationId === action.payload
            ? null
            : state.selectedAnnotationId,
      };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };

    case "SET_CONNECTED_USERS":
      return { ...state, connectedUsers: action.payload };

    case "SET_AUTHOR":
      return { ...state, author: action.payload };

    default:
      return state;
  }
}
