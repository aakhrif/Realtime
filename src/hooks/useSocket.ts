import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface UserInfo {
id: string;
name: string;
room: string;
mediaState?: {
  video: boolean;
  audio: boolean;
};
}

export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: string;
  type?: 'error' | 'info';
}

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinRoom = (room: string, name: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-room', { room, name });
    }
  };

  const sendOffer = (to: string, offer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      socketRef.current.emit('offer', { to, offer });
    }
  };

  const sendAnswer = (to: string, answer: RTCSessionDescriptionInit) => {
    if (socketRef.current) {
      socketRef.current.emit('answer', { to, answer });
    }
  };

  const sendIceCandidate = (to: string, candidate: RTCIceCandidate) => {
    if (socketRef.current) {
      socketRef.current.emit('ice-candidate', { to, candidate });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat-message', { message });
    }
  };

  const onUserJoined = (callback: (user: UserInfo) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user-joined', callback);
    }
  };

  const onUserLeft = (callback: (user: UserInfo) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user-left', callback);
    }
  };

  const onRoomUsers = (callback: (users: UserInfo[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on('room-users', callback);
    }
  };

  const onOffer = (callback: (data: { from: string; offer: RTCSessionDescriptionInit }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('offer', callback);
    }
  };

  const onAnswer = (callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('answer', callback);
    }
  };

  const onIceCandidate = (callback: (data: { from: string; candidate: RTCIceCandidate }) => void) => {
    if (socketRef.current) {
      socketRef.current.on('ice-candidate', callback);
    }
  };

  const onChatMessage = (callback: (message: ChatMessage) => void) => {
    if (socketRef.current) {
      socketRef.current.on('chat-message', callback);
    }
  };

  const removeAllListeners = () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
    }
  };

  return {
    socket: socketRef.current,
    joinRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendChatMessage,
    onUserJoined,
    onUserLeft,
    onRoomUsers,
    onOffer,
    onAnswer,
    onIceCandidate,
    onChatMessage,
    removeAllListeners
  };
};
