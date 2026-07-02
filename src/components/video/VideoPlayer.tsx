import { useEffect } from 'react';
import type { RefObject } from 'react';
import Hls from 'hls.js';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { formatTimestamp } from '../../utils/time';
import { getStreamixToken, peekStreamixToken } from '../../streamix/streamixClient';

type VideoPlayerProps = {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
};

// Matches the key-server's /key route referenced by EXT-X-KEY in video.m3u8.
const KEY_REQUEST_MARKER = '/key';

export function VideoPlayer({ src, videoRef }: VideoPlayerProps) {
  const { currentTime, duration } = useReviewState();
  const dispatch = useReviewDispatch();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    async function setup() {
      // Fetch the temporary token before wiring up hls.js: xhrSetup below runs
      // synchronously, so the token must already be cached by the time a
      // /key request goes out.
      try {
        await getStreamixToken();
      } catch (error) {
        console.error('Streamix: unable to obtain temporary access token', error);
      }

      if (cancelled || !video) return;

      if (!Hls.isSupported()) {
        video.src = src;
        return;
      }

      hls = new Hls({
        xhrSetup: (xhr, url) => {
          if (url.includes(KEY_REQUEST_MARKER)) {
            const token = peekStreamixToken();
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          }
        },
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('Streamix HLS fatal error', data);
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    }

    setup();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src, videoRef]);

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
          console.error('Video could not be loaded. Check the Streamix HLS stream and key-server.');
        }}
      >
        Your browser does not support the video tag.
      </video>

      <div className="video-meta">
        <span>Current time: {formatTimestamp(currentTime)}</span>
        <span>Duration: {formatTimestamp(duration)}</span>
      </div>
    </section>
  );
}
