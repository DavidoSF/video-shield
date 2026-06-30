import { createContext, useContext, useMemo, useReducer } from 'react';
import type { PropsWithChildren } from 'react';
import { initialReviewState, reviewReducer } from './reviewReducer';
import type { ReviewAction, ReviewState } from './reviewReducer';

const ReviewStateContext = createContext<ReviewState | null>(null);
const ReviewDispatchContext = createContext<React.Dispatch<ReviewAction> | null>(null);

export function ReviewProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reviewReducer, initialReviewState);

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
