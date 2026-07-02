import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { initialReviewState, reviewReducer } from './reviewReducer';
import type { ReviewAction, ReviewState } from './reviewReducer';
import type { Annotation } from '../types/annotation';

export type LocalSyncEvent =
  | { type: 'annotation:upsert'; annotation: Annotation }
  | { type: 'annotation:delete'; annotationId: string };

export const LOCAL_SYNC_EVENT = 'video-shield:local-sync';

const ReviewStateContext = createContext<ReviewState | null>(null);
const ReviewDispatchContext = createContext<React.Dispatch<ReviewAction> | null>(null);

function getLocalSyncEvent(action: ReviewAction, state: ReviewState): LocalSyncEvent | null {
  switch (action.type) {
    case 'ADD_ANNOTATION':
    case 'MOVE_ANNOTATION':
      return { type: 'annotation:upsert', annotation: action.payload };

    case 'UPDATE_ANNOTATION_COMMENT':
    case 'UPDATE_COMMENT': {
      const current = state.annotations.find((annotation) => annotation.id === action.payload.id);
      if (!current) return null;

      return {
        type: 'annotation:upsert',
        annotation: {
          ...current,
          comment: action.payload.comment,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'DELETE_ANNOTATION':
      if (action.meta?.remote) return null;
      return { type: 'annotation:delete', annotationId: action.payload };

    default:
      return null;
  }
}

export function ReviewProvider({ children }: PropsWithChildren) {
  const [state, rawDispatch] = useReducer(reviewReducer, initialReviewState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const dispatch = useCallback<React.Dispatch<ReviewAction>>((action) => {
    const syncEvent = action.meta?.remote ? null : getLocalSyncEvent(action, stateRef.current);

    rawDispatch(action);

    if (syncEvent) {
      window.dispatchEvent(new CustomEvent<LocalSyncEvent>(LOCAL_SYNC_EVENT, { detail: syncEvent }));
    }
  }, []);

  const memoizedState = useMemo(() => state, [state]);

  return (
    <ReviewStateContext.Provider value={memoizedState}>
      <ReviewDispatchContext.Provider value={dispatch}>{children}</ReviewDispatchContext.Provider>
    </ReviewStateContext.Provider>
  );
}

export function useReviewState() {
  const state = useContext(ReviewStateContext);

  if (!state) {
    throw new Error('useReviewState must be used inside ReviewProvider');
  }

  return state;
}

export function useReviewDispatch() {
  const dispatch = useContext(ReviewDispatchContext);

  if (!dispatch) {
    throw new Error('useReviewDispatch must be used inside ReviewProvider');
  }

  return dispatch;
}
