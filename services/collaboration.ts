import { useState, useEffect } from 'react';

export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

export interface CollaborationEvent {
  id: string;
  type: 'cursor_move' | 'selection_change' | 'edit' | 'comment' | 'presence';
  userId: string;
  timestamp: Date;
  data: any;
  sessionId: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  position: { x: number; y: number };
  timestamp: Date;
  resolved: boolean;
  replies?: Comment[];
}

export interface CollaborationSession {
  id: string;
  name: string;
  users: CollaborationUser[];
  events: CollaborationEvent[];
  comments: Comment[];
  createdAt: Date;
  lastActivity: Date;
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private session: CollaborationSession | null = null;
  private user: CollaborationUser | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.eventHandlers.set('user_joined', []);
    this.eventHandlers.set('user_left', []);
    this.eventHandlers.set('cursor_moved', []);
    this.eventHandlers.set('comment_added', []);
    this.eventHandlers.set('comment_resolved', []);
    this.eventHandlers.set('session_updated', []);
    this.eventHandlers.set('connection_changed', []);
  }

  // Event handling
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Connection management
  public async connect(sessionId: string, user: Omit<CollaborationUser, 'lastSeen'>): Promise<void> {
    try {
      const wsUrl = this.getWebSocketUrl(sessionId);
      this.ws = new WebSocket(wsUrl);

      this.user = { ...user, lastSeen: new Date() };

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connection_changed', { connected: true });
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.emit('connection_changed', { connected: false });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('connection_changed', { connected: false, error });
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  private getWebSocketUrl(sessionId: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
    return `${wsProtocol}//${wsHost}/api/collaboration/${sessionId}`;
  }

  private authenticate(): void {
    if (this.ws && this.user) {
      this.send({
        type: 'auth',
        data: this.user
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.session && this.user) {
          this.connect(this.session.id, this.user);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', data: {} });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  // Message handling
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'session_update':
        this.session = message.data;
        this.emit('session_updated', this.session);
        break;
      case 'user_joined':
        this.emit('user_joined', message.data);
        break;
      case 'user_left':
        this.emit('user_left', message.data);
        break;
      case 'cursor_moved':
        this.emit('cursor_moved', message.data);
        break;
      case 'comment_added':
        this.emit('comment_added', message.data);
        break;
      case 'comment_resolved':
        this.emit('comment_resolved', message.data);
        break;
      case 'selection_changed':
        this.emit('selection_changed', message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Public methods
  public sendCursorMovement(x: number, y: number): void {
    this.send({
      type: 'cursor_move',
      data: { x, y }
    });
  }

  public sendSelectionChange(selection: any): void {
    this.send({
      type: 'selection_change',
      data: selection
    });
  }

  public addComment(content: string, position: { x: number; y: number }): void {
    this.send({
      type: 'add_comment',
      data: { content, position }
    });
  }

  public resolveComment(commentId: string): void {
    this.send({
      type: 'resolve_comment',
      data: { commentId }
    });
  }

  public sendEdit(editData: any): void {
    this.send({
      type: 'edit',
      data: editData
    });
  }

  public updatePresence(status: CollaborationUser['status']): void {
    if (this.user) {
      this.user.status = status;
      this.user.lastSeen = new Date();
      this.send({
        type: 'presence_update',
        data: { status }
      });
    }
  }

  // Session management
  public async createSession(name: string): Promise<CollaborationSession> {
    try {
      const response = await fetch('/api/collaboration/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const session = await response.json();
      this.session = session;
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  public async joinSession(sessionId: string): Promise<CollaborationSession> {
    try {
      const response = await fetch(`/api/collaboration/sessions/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Session not found');
      }

      const session = await response.json();
      this.session = session;
      return session;
    } catch (error) {
      console.error('Failed to join session:', error);
      throw error;
    }
  }

  public leaveSession(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.session = null;
    this.user = null;
  }

  public getSession(): CollaborationSession | null {
    return this.session;
  }

  public getCurrentUser(): CollaborationUser | null {
    return this.user;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Utility methods
  public generateUserColor(): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public formatLastSeen(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

export const collaborationService = new CollaborationService();

// React hook for collaboration
export const useCollaboration = () => {
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<CollaborationUser | null>(null);

  useEffect(() => {
    const handleConnectionChange = ({ connected }: { connected: boolean }) => {
      setIsConnected(connected);
    };

    const handleSessionUpdate = (newSession: CollaborationSession) => {
      setSession(newSession);
    };

    collaborationService.on('connection_changed', handleConnectionChange);
    collaborationService.on('session_updated', handleSessionUpdate);

    return () => {
      collaborationService.off('connection_changed', handleConnectionChange);
      collaborationService.off('session_updated', handleSessionUpdate);
    };
  }, []);

  return {
    session,
    isConnected,
    currentUser,
    connect: collaborationService.connect.bind(collaborationService),
    disconnect: collaborationService.leaveSession.bind(collaborationService),
    sendCursorMovement: collaborationService.sendCursorMovement.bind(collaborationService),
    addComment: collaborationService.addComment.bind(collaborationService),
    resolveComment: collaborationService.resolveComment.bind(collaborationService),
    sendEdit: collaborationService.sendEdit.bind(collaborationService),
    updatePresence: collaborationService.updatePresence.bind(collaborationService),
    createSession: collaborationService.createSession.bind(collaborationService),
    joinSession: collaborationService.joinSession.bind(collaborationService),
    on: collaborationService.on.bind(collaborationService),
    off: collaborationService.off.bind(collaborationService),
  };
};

export default collaborationService;
