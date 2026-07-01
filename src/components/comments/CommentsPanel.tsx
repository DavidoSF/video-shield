import { useState } from "react";
import type { RefObject } from "react";
import { ExportButton } from "../export/ExportButton";
import { useReviewDispatch, useReviewState } from "../../state/ReviewContext";
import { formatTimestamp } from "../../utils/time";

type CommentsPanelProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

function formatType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function CommentsPanel({ videoRef }: CommentsPanelProps) {
  const { annotations } = useReviewState();
  const dispatch = useReviewDispatch();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");

  function jumpToTimestamp(timestamp: number) {
    if (!videoRef.current) return;

    videoRef.current.currentTime = timestamp;
    videoRef.current.pause();
    dispatch({ type: "SET_CURRENT_TIME", payload: timestamp });
  }

  function startEditing(annotationId: string, currentComment: string) {
    setEditingId(annotationId);
    setDraftComment(currentComment);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraftComment("");
  }

  function saveComment(annotationId: string) {
    dispatch({
      type: "UPDATE_COMMENT",
      payload: {
        id: annotationId,
        comment: draftComment.trim(),
      },
    });

    setEditingId(null);
    setDraftComment("");
  }

  return (
    <aside className="comments-panel" aria-label="Timestamped comments">
      <div className="panel-header">
        <div className="panel-title-group">
          <h2>Review Notes</h2>
          <span className="annotation-count">
            {annotations.length} annotation{annotations.length === 1 ? "" : "s"}
          </span>
        </div>

        <ExportButton />
      </div>

      {annotations.length === 0 ? (
        <p className="empty-state">
          No review notes yet. Pause the video, choose an annotation tool, draw
          on the video, and add a comment.
        </p>
      ) : (
        <ul className="comment-list">
          {annotations.map((annotation) => {
            const isEditing = editingId === annotation.id;
            const comment = annotation.comment ?? "";
            const hasComment = comment.trim().length > 0;

            return (
              <li
                key={annotation.id}
                className="comment-card"
                role="button"
                tabIndex={0}
                onClick={() => jumpToTimestamp(annotation.timestamp)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    jumpToTimestamp(annotation.timestamp);
                  }
                }}
              >
                <div className="comment-card-top">
                  <div className="comment-meta">
                    <span className="annotation-type">
                      {formatType(annotation.type)}
                    </span>

                    <span className="comment-time">
                      {formatTimestamp(annotation.timestamp)}
                    </span>
                  </div>

                  <div className="comment-actions">
                    {!isEditing && (
                      <button
                        type="button"
                        className="edit-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(annotation.id, comment);
                        }}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({
                          type: "DELETE_ANNOTATION",
                          payload: annotation.id,
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div
                    className="edit-comment-box"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      className="edit-comment-input"
                      value={draftComment}
                      onChange={(e) => setDraftComment(e.target.value)}
                      placeholder="Write a comment..."
                      autoFocus
                    />

                    <div className="edit-comment-actions">
                      <button
                        type="button"
                        className="save-comment-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveComment(annotation.id);
                        }}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="cancel-comment-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditing();
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={
                      hasComment ? "comment-text" : "comment-text muted-comment"
                    }
                  >
                    {hasComment ? comment : "No written comment yet."}
                  </p>
                )}

                {annotation.author && (
                  <p className="comment-author">By {annotation.author}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}