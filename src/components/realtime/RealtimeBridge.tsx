import { useEffect, useMemo, useRef } from 'react';
import { LOCAL_SYNC_EVENT } from '../../state/ReviewContext';
import type { LocalSyncEvent } from '../../state/ReviewContext';
import { useReviewDispatch, useReviewState } from '../../state/ReviewContext';
import type { IncomingRealtimeMessage, OutgoingRealtimeMessage } from '../../realtime/protocol';

const DEFAULT_WS_URL = 'ws://localhost:8081';

function getOrCreateClientId() {
  const storageKey = 'video-shield-client-id';
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

function getAuthorName(clientId: string) {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('user')?.trim();
  if (fromUrl) {
    window.localStorage.setItem('video-shield-author', fromUrl);
    return fromUrl;
  }

  const saved = window.localStorage.getItem('video-shield-author')?.trim();
  return saved || `Reviewer-${clientId.slice(0, 4)}`;
}

function parseRealtimeMessage(raw: MessageEvent<string>): IncomingRealtimeMessage | null {
  try {
    return JSON.parse(raw.data) as IncomingRealtimeMessage;
  } catch (error) {
    console.error('[ws] could not parse message', error);
    return null;
  }
}

export function RealtimeBridge() {
  const { videoId } = useReviewState();
  const dispatch = useReviewDispatch();

  const clientId = useMemo(getOrCreateClientId, []);
  const author = useMemo(() => getAuthorName(clientId), [clientId]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    dispatch({ type: 'SET_AUTHOR', payload: author, meta: { remote: true } });
  }, [author, dispatch]);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_WS_URL || DEFAULT_WS_URL;
    const url = new URL(baseUrl);
    url.searchParams.set('roomId', videoId);
    url.searchParams.set('clientId', clientId);
    url.searchParams.set('author', author);

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting', meta: { remote: true } });

    const socket = new WebSocket(url.toString());
    socketRef.current = socket;

    function send(message: OutgoingRealtimeMessage) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }

    socket.addEventListener('open', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected', meta: { remote: true } });
      send({ type: 'hello', roomId: videoId, clientId, author });
    });

    socket.addEventListener('close', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline', meta: { remote: true } });
      dispatch({ type: 'SET_CONNECTED_USERS', payload: 0, meta: { remote: true } });
    });

    socket.addEventListener('error', () => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'offline', meta: { remote: true } });
    });

    socket.addEventListener('message', (event) => {
      const message = parseRealtimeMessage(event as MessageEvent<string>);
      if (!message) return;

      if ('clientId' in message && message.clientId === clientId) return;

      if (message.type === 'presence') {
        dispatch({ type: 'SET_CONNECTED_USERS', payload: message.count, meta: { remote: true } });
        return;
      }

      if (message.type === 'annotation:upsert') {
        dispatch({
          type: 'UPSERT_REMOTE_ANNOTATION',
          payload: message.annotation,
          meta: { remote: true },
        });
        return;
      }

      if (message.type === 'annotation:delete') {
        dispatch({
          type: 'DELETE_ANNOTATION',
          payload: message.annotationId,
          meta: { remote: true },
        });
      }
    });

    function handleLocalSync(event: Event) {
      const detail = (event as CustomEvent<LocalSyncEvent>).detail;
      if (!detail) return;

      if (detail.type === 'annotation:upsert') {
        send({
          type: 'annotation:upsert',
          roomId: videoId,
          clientId,
          author,
          annotation: detail.annotation,
        });
        return;
      }

      if (detail.type === 'annotation:delete') {
        send({
          type: 'annotation:delete',
          roomId: videoId,
          clientId,
          author,
          annotationId: detail.annotationId,
        });
      }
    }

    window.addEventListener(LOCAL_SYNC_EVENT, handleLocalSync);

    return () => {
      window.removeEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
      socket.close();
      socketRef.current = null;
    };
  }, [author, clientId, dispatch, videoId]);

  return null;
}
