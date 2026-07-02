import { useRef } from "react";
import { AnnotationToolbar } from "../toolbar/AnnotationToolbar";
import { CanvasFreehandLayer } from "../layers/CanvasFreehandLayer";
import { CommentsPanel } from "../comments/CommentsPanel";
import { ConnectionStatus } from "../realtime/ConnectionStatus";
import { RealtimeBridge } from "../realtime/RealtimeBridge";
import { SvgAnnotationLayer } from "../layers/SvgAnnotationLayer";
import { VideoPlayer } from "../video/VideoPlayer";
import { TimelineMarkers } from "../timeline/TimelineMarkers";
import { useAuth } from "../../auth/AuthContext";

export function ReviewPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { email, logout } = useAuth();

  return (
    <>
      <RealtimeBridge />
      <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <div className="brand-text">
            <h1>VideoShield</h1>
            <p className="brand-tagline">Secure collaborative video review</p>
          </div>
        </div>

        <div className="app-header-right">
          <ConnectionStatus />
          <div className="account-status">
            {email && <span className="account-email">{email}</span>}
            <button type="button" className="logout-button" onClick={logout}>
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      <section className="review-layout">
        <div className="review-workspace">
          <AnnotationToolbar />

          <div className="review-main">
            <div className="video-area-wrapper">
              <div className="video-stage">
                <VideoPlayer
                  src={import.meta.env.VITE_STREAMIX_HLS_URL ?? 'https://localhost:8443/hls/video.m3u8'}
                  videoRef={videoRef}
                />
                <SvgAnnotationLayer />
                <CanvasFreehandLayer />
              </div>

              <TimelineMarkers videoRef={videoRef} />
            </div>

            <div className="side-panel">
              <CommentsPanel videoRef={videoRef} />
            </div>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
