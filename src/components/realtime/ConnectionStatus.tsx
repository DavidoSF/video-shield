import { useReviewState } from '../../state/ReviewContext';

export function ConnectionStatus() {
  const { connectionStatus } = useReviewState();

  return (
    <div className={`connection-status ${connectionStatus}`}>
      <span className="status-dot" />
      WebSocket: {connectionStatus}
    </div>
  );
}
