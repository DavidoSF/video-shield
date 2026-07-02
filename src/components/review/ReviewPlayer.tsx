import { useRef } from "react";
import { AnnotationToolbar } from "../toolbar/AnnotationToolbar";
import { CanvasFreehandLayer } from "../layers/CanvasFreehandLayer";
import { CommentsPanel } from "../comments/CommentsPanel";
import { ConnectionStatus } from "../realtime/ConnectionStatus";
import { RealtimeBridge } from "../realtime/RealtimeBridge";
import { SvgAnnotationLayer } from "../layers/SvgAnnotationLayer";
import { VideoPlayer } from "../video/VideoPlayer";
import { useAuth } from "../../auth/AuthContext";

export function ReviewPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { email, logout } = useAuth();

  return (
    <>
      <RealtimeBridge />
      <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Subject A</p>
          <h1>Augmented Review Player</h1>
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
