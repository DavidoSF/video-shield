import { useReviewState } from '../../state/ReviewContext';

export function ExportButton() {
  const { annotations, videoId, videoName } = useReviewState();

  function exportJson() {
    const payload = {
      videoId,
      videoName,
      exportDate: new Date().toISOString(),
      annotationCount: annotations.length,
      annotations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoId}-annotations.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="export-button" onClick={exportJson}>
      Export JSON
    </button>
  );
}
