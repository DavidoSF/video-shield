import { useRef } from "react";
import { AnnotationToolbar } from "../toolbar/AnnotationToolbar";
import { CanvasFreehandLayer } from "../layers/CanvasFreehandLayer";
import { CommentsPanel } from "../comments/CommentsPanel";
import { ConnectionStatus } from "../realtime/ConnectionStatus";
import { SvgAnnotationLayer } from "../layers/SvgAnnotationLayer";
import { VideoPlayer } from "../video/VideoPlayer";

export function ReviewPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Subject A</p>
          <h1>Augmented Review Player</h1>
        </div>

        <ConnectionStatus />
      </header>

      <section className="review-layout">
        <div className="review-workspace">
          <AnnotationToolbar />

          <div className="review-main">
            <div className="video-area-wrapper">
              <div className="video-stage">
                <VideoPlayer src="/videos/flower.mp4" videoRef={videoRef} />
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
  );
}
