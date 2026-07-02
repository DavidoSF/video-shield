import type { Annotation } from '../types/annotation';

export type PresenceUser = {
  clientId: string;
  author: string;
};

export type OutgoingRealtimeMessage =
  | {
      type: 'hello';
      roomId: string;
      clientId: string;
      author: string;
    }
  | {
      type: 'annotation:upsert';
      roomId: string;
      clientId: string;
      author: string;
      annotation: Annotation;
    }
  | {
      type: 'annotation:delete';
      roomId: string;
      clientId: string;
      author: string;
      annotationId: string;
    };

export type IncomingRealtimeMessage =
  | {
      type: 'welcome' | 'hello:ack';
      roomId: string;
      clientId: string;
      author: string;
      serverTime?: string;
    }
  | {
      type: 'presence';
      roomId: string;
      count: number;
      users: PresenceUser[];
      serverTime?: string;
    }
  | {
      type: 'annotation:upsert';
      roomId: string;
      clientId: string;
      author: string;
      annotation: Annotation;
      serverTime?: string;
    }
  | {
      type: 'annotation:delete';
      roomId: string;
      clientId: string;
      author: string;
      annotationId: string;
      serverTime?: string;
    }
  | {
      type: 'error';
      message: string;
      serverTime?: string;
    };
