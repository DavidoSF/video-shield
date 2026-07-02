import { useMemo } from "react";
import type { RefObject } from "react";
import { useReviewDispatch, useReviewState } from "../../state/ReviewContext";
import { formatTimestamp } from "../../utils/time";

type TimelineMarkersProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
};

function formatType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function TimelineMarkers({ videoRef }: TimelineMarkersProps) {
  const { annotations, currentTime, duration } = useReviewState();
  const dispatch = useReviewDispatch();

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const progressPercent = hasDuration
    ? Math.min(100, (currentTime / duration) * 100)
    : 0;

  // Sorted so overlapping markers render deterministically.
  const markers = useMemo(
    () =>
      [...annotations]
        .filter((a) => Number.isFinite(a.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp),
    [annotations]
  );

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;

    const clamped = Math.max(0, Math.min(seconds, duration || seconds));
    video.currentTime = clamped;
    dispatch({ type: "SET_CURRENT_TIME", payload: clamped });
  }

  function handleTrackClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!hasDuration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  }

  return (
    <div className="timeline">
      <div
        className="timeline-track"
        role="slider"
        aria-label="Video timeline with annotation markers"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration) || 0}
        aria-valuenow={Math.floor(currentTime) || 0}
        aria-valuetext={`${formatTimestamp(currentTime)} of ${formatTimestamp(duration)}`}
        tabIndex={0}
        onClick={handleTrackClick}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            seekTo(currentTime + 5);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            seekTo(currentTime - 5);
          }
        }}
      >
        <div className="timeline-progress" style={{ width: `${progressPercent}%` }} />
        <div className="timeline-playhead" style={{ left: `${progressPercent}%` }} />

        {hasDuration &&
          markers.map((annotation) => {
            const left = Math.min(100, (annotation.timestamp / duration) * 100);
            const comment = annotation.comment?.trim();
            const tooltip = `${formatType(annotation.type)} · ${formatTimestamp(
              annotation.timestamp
            )}${comment ? ` — ${comment}` : ""}`;

            return (
              <button
                key={annotation.id}
                type="button"
                className="timeline-marker"
                style={{
                  left: `${left}%`,
                  "--marker-color": annotation.color,
                } as React.CSSProperties}
                title={tooltip}
                aria-label={`Jump to ${tooltip}`}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(annotation.timestamp);
                }}
              />
            );
          })}
      </div>

      <div className="timeline-meta">
        <span>{formatTimestamp(currentTime)}</span>
        <span className="timeline-marker-count">
          {markers.length} marker{markers.length === 1 ? "" : "s"}
        </span>
        <span>{formatTimestamp(duration)}</span>
      </div>
    </div>
  );
}
