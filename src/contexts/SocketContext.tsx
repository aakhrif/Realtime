'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: string | null;
  roomUsers: User[];
  joinRoom: (roomId: string, userName: string) => void;
  leaveRoom: () => void;
  error: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const currentUserName = useRef<string>('');

  // Initialize socket connection (only once)
  useEffect(() => {
    console.log('🔌 SocketProvider: Initializing Socket.IO connection...');
    
    const newSocket = io({
      path: '/api/socket',
      transports: ['polling'],
      timeout: 20000,
      forceNew: true,
      upgrade: false
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ SocketProvider: Connected:', newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ SocketProvider: Disconnected');
      setIsConnected(false);
      setCurrentRoom(null);
      setRoomUsers([]);
    });

    newSocket.on('error', (err) => {
      console.error('❌ SocketProvider: Error:', err);
      setError(err.message || 'Socket connection error');
    });

    // Room events
    newSocket.on('joined-room', ({ room, users }: { room: string; users: string[] }) => {
      console.log(`✅ SocketProvider: Joined room ${room} with users:`, users);
      setCurrentRoom(room);
      setRoomUsers(users.map(id => ({ id, name: `User-${id.slice(-4)}` })));
      setError(null);
    });

    newSocket.on('user-joined', ({ id, name }: { id: string; name: string }) => {
      console.log(`👥 SocketProvider: User ${name} (${id}) joined`);
      setRoomUsers(prev => {
        if (prev.find(user => user.id === id)) return prev;
        return [...prev, { id, name }];
      });
    });

    newSocket.on('user-left', ({ id, name }: { id: string; name: string }) => {
      console.log(`👋 SocketProvider: User ${name} (${id}) left`);
      setRoomUsers(prev => prev.filter(user => user.id !== id));
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 SocketProvider: Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = (roomId: string, userName: string) => {
    if (!socket || !isConnected) {
      setError('Socket not connected');
      return;
    }

    console.log(`🚪 SocketProvider: Joining room ${roomId} as ${userName}`);
    currentUserName.current = userName;
    socket.emit('join-room', { room: roomId, name: userName });
  };

  const leaveRoom = () => {
    if (!socket || !currentRoom) return;

    console.log(`🚪 SocketProvider: Leaving room ${currentRoom}`);
    socket.emit('leave-room', { room: currentRoom });
    setCurrentRoom(null);
    setRoomUsers([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        currentRoom,
        roomUsers,
        joinRoom,
        leaveRoom,
        error,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
