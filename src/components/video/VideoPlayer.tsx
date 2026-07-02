import { useEffect, useState, type RefObject } from 'react';
import Hls from 'hls.js';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import { formatTimestamp } from '../../utils/time';

type VideoPlayerProps = {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  streamixSession: string;
};

const KEY_SERVER_URL = 'https://localhost:3001';

async function getStreamixToken(streamixSession: string): Promise<string> {
  const response = await fetch(`${KEY_SERVER_URL}/token`, {
    method: 'GET',
    headers: {
      'X-Streamix-Session': streamixSession,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.token) {
    throw new Error('Token response does not contain a token');
  }

  return data.token;
}

export function VideoPlayer({ src, videoRef, streamixSession }: VideoPlayerProps) {
  const { currentTime, duration } = useReviewState();
  const dispatch = useReviewDispatch();
  const [secureStatus, setSecureStatus] = useState('Preparing video...');

  const isHlsSource = src.endsWith('.m3u8');

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !isHlsSource) {
      return;
    }

    let hls: Hls | null = null;
    let cancelled = false;

    async function setupSecureHls() {
      try {
        setSecureStatus('Requesting temporary token...');

        const token = await getStreamixToken(streamixSession);

        if (cancelled || !video) {
          return;
        }

        setSecureStatus('Token received. Loading secure HLS stream...');

        if (Hls.isSupported()) {
          hls = new Hls({
            xhrSetup: (xhr: XMLHttpRequest, url: string) => {
              if (url.startsWith(`${KEY_SERVER_URL}/key`)) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              }
            },
          });

          hls.loadSource(src);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setSecureStatus('Secure HLS stream loaded');
          });

          hls.on(Hls.Events.KEY_LOADED, () => {
            setSecureStatus('AES key delivered with valid token');
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              setSecureStatus('Secure video error. Check token/key-server.');
            }
          });

          return;
        }

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
          setSecureStatus('Native HLS mode');
          return;
        }

        setSecureStatus('HLS is not supported by this browser');
      } catch (error) {
        console.error(error);
        setSecureStatus('Could not load secure HLS stream');
      }
    }

    setupSecureHls();

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, videoRef, isHlsSource, streamixSession]);

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
          console.error('Video could not be loaded.');
          setSecureStatus('Video could not be loaded');
        }}
      >
        {!isHlsSource && <source src={src} type="video/mp4" />}
        Your browser does not support the video tag.
      </video>

      <div className="video-meta">
        <span>Current time: {formatTimestamp(currentTime)}</span>
        <span>Duration: {formatTimestamp(duration)}</span>
      </div>

      {isHlsSource && (
        <div className="video-meta">
          <span>Security: {secureStatus}</span>
        </div>
      )}
    </section>
  );
}
