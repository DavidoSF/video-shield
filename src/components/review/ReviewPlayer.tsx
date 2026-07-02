import { useRef } from "react";
import { AnnotationToolbar } from "../toolbar/AnnotationToolbar";
import { CanvasFreehandLayer } from "../layers/CanvasFreehandLayer";
import { CommentsPanel } from "../comments/CommentsPanel";
import { ConnectionStatus } from "../realtime/ConnectionStatus";
import { RealtimeBridge } from "../realtime/RealtimeBridge";
import { SvgAnnotationLayer } from "../layers/SvgAnnotationLayer";
import { VideoPlayer } from "../video/VideoPlayer";

type ReviewPlayerProps = {
  userName: string;
  streamixSession: string;
  onLogout: () => void;
};

export function ReviewPlayer({
  userName,
  streamixSession,
  onLogout,
}: ReviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <>
      <RealtimeBridge />

      <main className="app-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Subject A</p>
            <h1>Augmented Review Player</h1>
          </div>

          <div className="header-actions">
            <span className="reviewer-badge">Reviewer: {userName}</span>

            <ConnectionStatus />

            <button type="button" className="logout-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="review-layout">
          <div className="review-workspace">
            <AnnotationToolbar />

            <div className="review-main">
              <div className="video-area-wrapper">
                <div className="video-stage">
                  <VideoPlayer
                    src="https://localhost:8443/hls/video.m3u8"
                    videoRef={videoRef}
                    streamixSession={streamixSession}
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
