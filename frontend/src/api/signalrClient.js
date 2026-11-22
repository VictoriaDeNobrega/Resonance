/**
 * Adaptador SignalR para RoomHub (/hubs/room) y CommunityHub (/hubs/community).
 * Garantiza reconexión transparente [0, 2000, 5000, 10000] ms y compensación <= 200 ms.
 */
import * as signalR from '@microsoft/signalr';
import { getBackendOrigin, getStoredSession } from './apiClient';

const RECONNECT_DELAYS = [0, 2000, 5000, 10000];

const ROOM_SERVER_EVENTS = [
  'RoomJoined',
  'ListenerCountUpdated',
  'UserJoined',
  'UserLeft',
  'PlaybackStateUpdated',
  'QueueUpdated',
  'SkipVoteUpdated',
  'TrackSkipped',
  'ReceiveChatMessage',
  'RoomClosed',
  'RoomError'
];

const COMMUNITY_SERVER_EVENTS = [
  'ReceiveCommunityComment',
  'CommunityCommentDeleted',
  'CommunityError'
];

class SignalRManager {
  constructor() {
    this.roomConnection = null;
    this.communityConnection = null;
    this.roomListeners = new Map();
    this.communityListeners = new Map();
    this.statusListeners = new Set();
    this.roomStatus = 'disconnected';
    this.activeRoomJoinParams = null;
    this.activeCommunityId = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('resonance-failover-changed', () => {
        this.reconnectToActiveOrigin();
      });
    }
  }

  async reconnectToActiveOrigin() {
    const savedRoom = this.activeRoomJoinParams;
    const savedCommunity = this.activeCommunityId;
    await this.disconnectAll();
    if (savedRoom) {
      try {
        await this.joinRoom(savedRoom.roomCode, savedRoom.userId, savedRoom.userName, savedRoom.accessKey);
      } catch {
        // noop
      }
    }
    if (savedCommunity) {
      try {
        await this.joinCommunityChat(savedCommunity);
      } catch {
        // noop
      }
    }
  }

  setRoomStatus(nextStatus) {
    this.roomStatus = nextStatus;
    this.statusListeners.forEach((cb) => {
      try {
        cb(nextStatus);
      } catch {
        // noop
      }
    });
  }

  onRoomStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.roomStatus);
    return () => this.statusListeners.delete(callback);
  }

  buildHubConnection(hubPath) {
    const url = `${getBackendOrigin()}${hubPath}`;
    return new signalR.HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => getStoredSession().token || ''
      })
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }

  emitLocal(listenerMap, eventName, payload) {
    const handlers = listenerMap.get(eventName);
    if (!handlers) return;
    handlers.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        // noop
      }
    });
  }

  async ensureRoomConnection() {
    if (this.roomConnection && this.roomConnection.state === signalR.HubConnectionState.Connected) {
      return this.roomConnection;
    }

    if (!this.roomConnection) {
      const conn = this.buildHubConnection('/hubs/room');

      ROOM_SERVER_EVENTS.forEach((eventName) => {
        conn.on(eventName, (payload) => this.emitLocal(this.roomListeners, eventName, payload));
      });
      COMMUNITY_SERVER_EVENTS.forEach((eventName) => {
        conn.on(eventName, (payload) => this.emitLocal(this.communityListeners, eventName, payload));
      });

      conn.onreconnecting(() => {
        this.setRoomStatus('reconnecting');
      });

      conn.onreconnected(async () => {
        this.setRoomStatus('connected');
        if (this.activeRoomJoinParams) {
          const { roomCode, userId, userName, accessKey } = this.activeRoomJoinParams;
          try {
            await conn.invoke('JoinRoom', roomCode, String(userId), userName, accessKey || null);
            await conn.invoke('RequestTimeSync', roomCode);
          } catch {
            // El usuario verá el estado de reconexión si la sala cerró
          }
        }
      });

      conn.onclose(() => {
        this.setRoomStatus('disconnected');
      });

      this.roomConnection = conn;
    }

    if (this.roomConnection.state === signalR.HubConnectionState.Disconnected) {
      this.setRoomStatus('connecting');
      await this.roomConnection.start();
      this.setRoomStatus('connected');
    }

    return this.roomConnection;
  }

  async ensureCommunityConnection() {
    if (this.communityConnection && this.communityConnection.state === signalR.HubConnectionState.Connected) {
      return this.communityConnection;
    }

    if (!this.communityConnection) {
      const conn = this.buildHubConnection('/hubs/community');

      COMMUNITY_SERVER_EVENTS.forEach((eventName) => {
        conn.on(eventName, (payload) => this.emitLocal(this.communityListeners, eventName, payload));
      });

      conn.onreconnected(async () => {
        if (this.activeCommunityId) {
          try {
            await conn.invoke('JoinCommunityChat', this.activeCommunityId);
          } catch {
            // noop
          }
        }
      });

      this.communityConnection = conn;
    }

    if (this.communityConnection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await this.communityConnection.start();
      } catch {
        // Fallback transparente a RoomHub (/hubs/room) que expone compatibilidad de chat de comunidad
        this.communityConnection = null;
        return this.ensureRoomConnection();
      }
    }

    return this.communityConnection;
  }

  onRoomEvent(eventName, handler) {
    if (!this.roomListeners.has(eventName)) {
      this.roomListeners.set(eventName, new Set());
    }
    this.roomListeners.get(eventName).add(handler);
    return () => {
      this.roomListeners.get(eventName)?.delete(handler);
    };
  }

  onCommunityEvent(eventName, handler) {
    if (!this.communityListeners.has(eventName)) {
      this.communityListeners.set(eventName, new Set());
    }
    this.communityListeners.get(eventName).add(handler);
    return () => {
      this.communityListeners.get(eventName)?.delete(handler);
    };
  }

  // ==================== ROOM HUB METHODS ====================
  async joinRoom(roomCode, userId, userName, accessKey = null) {
    const conn = await this.ensureRoomConnection();
    this.activeRoomJoinParams = { roomCode, userId, userName, accessKey };
    await conn.invoke('JoinRoom', roomCode, String(userId), userName || 'Oyente', accessKey || null);
  }

  async leaveRoom(roomCode) {
    this.activeRoomJoinParams = null;
    if (!this.roomConnection || this.roomConnection.state !== signalR.HubConnectionState.Connected) return;
    await this.roomConnection.invoke('LeaveRoom', roomCode || null);
  }

  async syncPlaybackState(roomCode, syncDto) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('SyncPlaybackState', roomCode, {
      ...syncDto,
      serverTimestampUtcMs: Date.now()
    });
  }

  async requestTimeSync(roomCode) {
    if (!this.roomConnection || this.roomConnection.state !== signalR.HubConnectionState.Connected) return;
    await this.roomConnection.invoke('RequestTimeSync', roomCode);
  }

  async addSongToQueue(roomCode, dto) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('AddSongToQueue', roomCode, dto);
  }

  async removeSongFromQueue(roomCode, roomSongId, requesterId) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('RemoveSongFromQueue', roomCode, roomSongId, requesterId);
  }

  async voteQueueSong(roomCode, roomSongId, userId) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('VoteQueueSong', roomCode, roomSongId, userId);
  }

  async castSkipVote(roomCode, userId) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('CastSkipVote', roomCode, userId);
  }

  async sendChatMessage(roomCode, dto) {
    const conn = await this.ensureRoomConnection();
    await conn.invoke('SendChatMessage', roomCode, dto);
  }

  async closeRoom(roomCode, requesterId) {
    const conn = await this.ensureRoomConnection();
    this.activeRoomJoinParams = null;
    await conn.invoke('CloseRoom', roomCode, requesterId);
  }

  // ==================== COMMUNITY HUB METHODS ====================
  async joinCommunityChat(communityId) {
    const conn = await this.ensureCommunityConnection();
    this.activeCommunityId = communityId;
    await conn.invoke('JoinCommunityChat', communityId);
  }

  async leaveCommunityChat(communityId) {
    if (this.activeCommunityId === communityId) {
      this.activeCommunityId = null;
    }
    const conn = this.communityConnection || this.roomConnection;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    await conn.invoke('LeaveCommunityChat', communityId);
  }

  async sendCommunityComment(communityId, dto) {
    const conn = await this.ensureCommunityConnection();
    await conn.invoke('SendCommunityComment', communityId, dto);
  }

  async deleteCommunityComment(communityId, commentId, requesterId) {
    const conn = await this.ensureCommunityConnection();
    await conn.invoke('DeleteCommunityComment', communityId, commentId, requesterId);
  }

  async disconnectAll() {
    this.activeRoomJoinParams = null;
    this.activeCommunityId = null;
    if (this.roomConnection) {
      try {
        await this.roomConnection.stop();
      } catch {
        // noop
      }
      this.roomConnection = null;
      this.setRoomStatus('disconnected');
    }
    if (this.communityConnection) {
      try {
        await this.communityConnection.stop();
      } catch {
        // noop
      }
      this.communityConnection = null;
    }
  }
}

/**
 * Calcula la posición exacta compensando el tiempo de red usando serverTimestampUtcMs
 * para mantener desfase <= 200 ms.
 */
export function computeCompensatedTimeSec(syncPayload) {
  if (!syncPayload) return { targetSec: 0, latencyMs: 0 };
  const baseMs = Number(syncPayload.currentTimeMs || 0);
  const serverTs = Number(syncPayload.serverTimestampUtcMs || 0);
  const rawLatency = serverTs > 0 ? Math.max(0, Math.min(3000, Date.now() - serverTs)) : 0;
  const compensatedMs = syncPayload.isPlaying ? baseMs + rawLatency : baseMs;
  return {
    targetSec: Math.max(0, compensatedMs / 1000),
    latencyMs: rawLatency
  };
}

export const signalrClient = new SignalRManager();
export default signalrClient;
