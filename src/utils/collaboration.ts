import { AgentWorkflow, WorkflowStep } from './agentWorkflow';
import { UserDocument } from '../db';

export interface CollaborationSession {
  id: string;
  name: string;
  type: 'workflow' | 'document' | 'chat';
  resourceId: string;
  participants: CollaborationParticipant[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationParticipant {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActive: Date;
  color: string;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  participantId: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'approve' | 'reject';
  data: any;
  timestamp: Date;
}

export interface CollaborationComment {
  id: string;
  sessionId: string;
  participantId: string;
  content: string;
  position?: { x: number; y: number };
  resolved: boolean;
  createdAt: Date;
}

// WebSocket-based collaboration manager
export class CollaborationManager {
  private ws: WebSocket | null = null;
  private sessions: Map<string, CollaborationSession> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private serverUrl: string, private userId: string, private userName: string) {}

  // Connect to collaboration server
  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(`${this.serverUrl}/collaboration`);
      
      this.ws.onopen = () => {
        console.log('Collaboration connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        console.log('Collaboration disconnected');
        this.emit('disconnected');
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Collaboration error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      throw error;
    }
  }

  // Create a new collaboration session
  async createSession(
    type: 'workflow' | 'document' | 'chat',
    resourceId: string,
    name: string
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: crypto.randomUUID(),
      name,
      type,
      resourceId,
      participants: [{
        id: this.userId,
        name: this.userName,
        role: 'owner',
        joinedAt: new Date(),
        lastActive: new Date(),
        color: this.getRandomColor(),
      }],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    this.sendMessage('create_session', session);
    return session;
  }

  // Join an existing session
  async joinSession(sessionId: string, role: 'editor' | 'viewer' = 'viewer'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant: CollaborationParticipant = {
      id: this.userId,
      name: this.userName,
      role,
      joinedAt: new Date(),
      lastActive: new Date(),
      color: this.getRandomColor(),
    };

    session.participants.push(participant);
    session.updatedAt = new Date();

    this.sendMessage('join_session', { sessionId, participant });
  }

  // Leave a session
  async leaveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.participants = session.participants.filter(p => p.id !== this.userId);
    session.updatedAt = new Date();

    if (session.participants.length === 0) {
      session.status = 'completed';
    }

    this.sendMessage('leave_session', { sessionId, participantId: this.userId });
  }

  // Send a collaboration event
  async sendEvent(sessionId: string, type: string, data: any): Promise<void> {
    const event: CollaborationEvent = {
      id: crypto.randomUUID(),
      sessionId,
      participantId: this.userId,
      type: type as any,
      data,
      timestamp: new Date(),
    };

    this.sendMessage('send_event', event);
  }

  // Add a comment to a session
  async addComment(sessionId: string, content: string, position?: { x: number; y: number }): Promise<void> {
    const comment: CollaborationComment = {
      id: crypto.randomUUID(),
      sessionId,
      participantId: this.userId,
      content,
      position,
      resolved: false,
      createdAt: new Date(),
    };

    this.sendMessage('add_comment', comment);
  }

  // Resolve a comment
  async resolveComment(commentId: string): Promise<void> {
    this.sendMessage('resolve_comment', { commentId });
  }

  // Get session participants
  getSessionParticipants(sessionId: string): CollaborationParticipant[] {
    const session = this.sessions.get(sessionId);
    return session?.participants || [];
  }

  // Get active sessions
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  // Subscribe to events
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // Unsubscribe from events
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Emit events to handlers
  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Handle incoming messages
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'session_created':
        this.sessions.set(data.session.id, data.session);
        this.emit('session_created', data.session);
        break;
      case 'participant_joined':
        this.emit('participant_joined', data);
        break;
      case 'participant_left':
        this.emit('participant_left', data);
        break;
      case 'event_received':
        this.emit('event_received', data.event);
        break;
      case 'comment_added':
        this.emit('comment_added', data.comment);
        break;
      case 'comment_resolved':
        this.emit('comment_resolved', data.commentId);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  // Send message to server
  private sendMessage(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  // Reconnect with exponential backoff
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // Generate random color for participant
  private getRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Disconnect from server
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Collaboration hooks for React components
export function useCollaboration(manager: CollaborationManager) {
  const [sessions, setSessions] = React.useState<CollaborationSession[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleSessionCreated = (session: CollaborationSession) => {
      setSessions(prev => [...prev, session]);
    };

    manager.on('connected', handleConnected);
    manager.on('disconnected', handleDisconnected);
    manager.on('session_created', handleSessionCreated);

    return () => {
      manager.off('connected', handleConnected);
      manager.off('disconnected', handleDisconnected);
      manager.off('session_created', handleSessionCreated);
    };
  }, [manager]);

  return { sessions, isConnected };
}