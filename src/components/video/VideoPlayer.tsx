import type { RefObject } from 'react';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { formatTimestamp } from '../../utils/time';

type VideoPlayerProps = {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export function VideoPlayer({ src, videoRef }: VideoPlayerProps) {
  const { currentTime, duration } = useReviewState();
  const dispatch = useReviewDispatch();

  return (
    <section className="video-card" aria-label="Video player">
      <video
        ref={videoRef}
        className="review-video"
        controls
        preload="metadata"
        onTimeUpdate={(event) => {
          dispatch({ type: 'SET_CURRENT_TIME', payload: event.currentTarget.currentTime });
        }}
        onLoadedMetadata={(event) => {
          dispatch({ type: 'SET_DURATION', payload: event.currentTarget.duration });
        }}
        onError={() => {
          console.error('Video could not be loaded. Check public/videos/demo.mp4');
        }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="video-meta">
        <span>Current time: {formatTimestamp(currentTime)}</span>
        <span>Duration: {formatTimestamp(duration)}</span>
      </div>
    </section>
  );
}
