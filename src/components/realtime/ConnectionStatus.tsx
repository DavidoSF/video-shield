import { useReviewState } from '../../state/ReviewContext';

export function ConnectionStatus() {
  const { connectionStatus, connectedUsers, author } = useReviewState();

  return (
    <div className={`connection-status ${connectionStatus}`}>
      <span className="status-dot" />
      <span>WebSocket: {connectionStatus}</span>
      {connectionStatus === 'connected' && (
        <span className="status-users">· {connectedUsers} user{connectedUsers === 1 ? '' : 's'} · {author}</span>
      )}
    </div>
  );
}
