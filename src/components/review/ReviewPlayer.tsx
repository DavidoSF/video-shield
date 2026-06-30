import { useRef } from 'react';
import { AnnotationToolbar } from '../toolbar/AnnotationToolbar';
import { CanvasFreehandLayer } from '../layers/CanvasFreehandLayer';
import { CommentsPanel } from '../comments/CommentsPanel';
import { ConnectionStatus } from '../realtime/ConnectionStatus';
import { ExportButton } from '../export/ExportButton';
import { SvgAnnotationLayer } from '../layers/SvgAnnotationLayer';
import { VideoPlayer } from '../video/VideoPlayer';

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

      <AnnotationToolbar />

      <section className="review-layout">
        <div className="video-area-wrapper">
          <div className="video-stage">
            <VideoPlayer src="/videos/demo.mp4" videoRef={videoRef} />
            <SvgAnnotationLayer />
            <CanvasFreehandLayer />
          </div>
        </div>

        <div className="side-panel">
          <ExportButton />
          <CommentsPanel videoRef={videoRef} />
        </div>
      </section>
    </main>
  );
}
