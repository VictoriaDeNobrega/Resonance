import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoomHubConnection } from '../../../api/signalrClient';

export function useRoomSync(roomCode, username) {
  const connectionRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(1);
  const [messages, setMessages] = useState([]);
  const [queue, setQueue] = useState([]);
  const [playbackState, setPlaybackState] = useState({
    songUrl: '',
    songTitle: '',
    songArtist: '',
    currentTimeMs: 0,
    isPlaying: false
  });
  const [voteSkipStatus, setVoteSkipStatus] = useState({
    votesCount: 0,
    requiredVotes: 1
  });

  useEffect(() => {
    if (!roomCode || !username) return;

    const connection = createRoomHubConnection();
    connectionRef.current = connection;

    connection.on('OnPlaybackSynced', (data) => {
      setPlaybackState((prev) => ({
        ...prev,
        songUrl: data.songUrl || prev.songUrl,
        songTitle: data.songTitle || prev.songTitle,
        songArtist: data.songArtist || prev.songArtist,
        currentTimeMs: data.currentTimeMs,
        isPlaying: data.isPlaying
      }));
    });

    connection.on('OnMessageReceived', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    connection.on('OnQueueUpdated', (newQueue) => {
      if (newQueue) setQueue(newQueue);
    });

    connection.on('OnUserJoined', (joinedUser, count) => {
      setOnlineUsersCount(count);
      setMessages((prev) => [
        ...prev,
        { senderName: 'Sistema', message: `${joinedUser} se unió a la sala`, timestamp: 'Ahora', isSystem: true }
      ]);
    });

    connection.on('OnUserLeft', (leftUser, count) => {
      setOnlineUsersCount(count);
      setMessages((prev) => [
        ...prev,
        { senderName: 'Sistema', message: `${leftUser} salió de la sala`, timestamp: 'Ahora', isSystem: true }
      ]);
    });

    connection.on('OnVoteSkipUpdated', (status) => {
      setVoteSkipStatus(status);
    });

    connection.on('OnSongSkipped', () => {
      setMessages((prev) => [
        ...prev,
        { senderName: 'Sistema', message: '¡Canción saltada por votación mayoritaria!', timestamp: 'Ahora', isSystem: true }
      ]);
      setVoteSkipStatus({ votesCount: 0, requiredVotes: 1 });
    });

    async function startConnection() {
      try {
        await connection.start();
        setIsConnected(true);
        await connection.invoke('JoinRoom', roomCode, username);
      } catch (err) {
        console.error('Error al conectar con SignalR:', err);
      }
    }

    startConnection();

    return () => {
      if (connection) {
        connection.invoke('LeaveRoom', roomCode, username).catch(() => {});
        connection.stop();
      }
    };
  }, [roomCode, username]);

  const emitPlaybackSync = useCallback((syncData) => {
    if (connectionRef.current && isConnected) {
      connectionRef.current.invoke('SyncPlayback', {
        roomCode,
        ...syncData
      }).catch(console.error);
    }
  }, [roomCode, isConnected]);

  const emitSendMessage = useCallback((text) => {
    if (connectionRef.current && isConnected && text.trim()) {
      connectionRef.current.invoke('SendMessage', roomCode, username, text).catch(console.error);
    }
  }, [roomCode, username, isConnected]);

  const emitAddToQueue = useCallback((song) => {
    if (connectionRef.current && isConnected) {
      connectionRef.current.invoke('AddToQueue', roomCode, song).catch(console.error);
    }
  }, [roomCode, isConnected]);

  const emitVoteSkip = useCallback(() => {
    if (connectionRef.current && isConnected) {
      connectionRef.current.invoke('VoteSkip', roomCode, username).catch(console.error);
    }
  }, [roomCode, username, isConnected]);

  return {
    isConnected,
    onlineUsersCount,
    messages,
    queue,
    playbackState,
    setPlaybackState,
    voteSkipStatus,
    emitPlaybackSync,
    emitSendMessage,
    emitAddToQueue,
    emitVoteSkip
  };
}
