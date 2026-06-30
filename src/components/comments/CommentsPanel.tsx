import type { RefObject } from 'react';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { formatTimestamp } from '../../utils/time';

type CommentsPanelProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function CommentsPanel({ videoRef }: CommentsPanelProps) {
  const { annotations } = useReviewState();
  const dispatch = useReviewDispatch();

  function jumpToTimestamp(timestamp: number) {
    if (!videoRef.current) return;

    videoRef.current.currentTime = timestamp;
    videoRef.current.pause();
    dispatch({ type: 'SET_CURRENT_TIME', payload: timestamp });
  }

  return (
    <aside className="comments-panel" aria-label="Timestamped comments">
      <div className="panel-header">
        <h2>Review Notes</h2>
        <span>{annotations.length} annotation{annotations.length === 1 ? '' : 's'}</span>
      </div>

      {annotations.length === 0 ? (
        <p className="empty-state">Select a tool, click on the video area, and create your first timestamped annotation.</p>
      ) : (
        <ul className="comment-list">
          {annotations.map((annotation) => (
            <li key={annotation.id} className="comment-card">
              <button
                type="button"
                className="timestamp-button"
                onClick={() => jumpToTimestamp(annotation.timestamp)}
              >
                {formatTimestamp(annotation.timestamp)}
              </button>
              <div>
                <strong>{annotation.type}</strong>
                {annotation.author && <small>By {annotation.author}</small>}
                <p>{annotation.comment || 'No comment added.'}</p>
              </div>
              <button
                type="button"
                className="delete-button"
                onClick={() => dispatch({ type: 'DELETE_ANNOTATION', payload: annotation.id })}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
