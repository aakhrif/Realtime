'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useWebRTC } from '@/hooks/useWebRTC';
import { ChatMessage, UserInfo } from '@/hooks/useSocket';
import { VideoControls } from '@/components/VideoControls';
import { RoomDebugger } from '@/components/RoomDebugger';
import { UserList } from '@/components/UserList';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { VideoGrid } from '@/components/VideoGrid';
import SocketManager from '@/lib/socketManager';

interface VideoRoomV2Props {
  roomId: string;
  userName: string;
  onLeaveRoom: () => void;
  initialStream?: MediaStream | null;
  mediaEnabled?: boolean; // New: Allow joining without media
}

export const VideoRoomV2: React.FC<VideoRoomV2Props> = ({
  roomId,
  userName,
  onLeaveRoom,
  initialStream = null,
  mediaEnabled = true // Default: try to get media
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomUsers, setRoomUsers] = useState<UserInfo[]>([]);

  // Initialize socket connection using singleton
  useEffect(() => {
    console.log('🔌 VideoRoomV2: Getting socket from SocketManager...');
    
    SocketManager.getSocket()
      .then((socketInstance) => {
        console.log('✅ VideoRoomV2: Socket received from manager:', socketInstance.id);
        setSocket(socketInstance);
      })
      .catch((error) => {
        console.error('❌ VideoRoomV2: Failed to get socket:', error);
      });

    return () => {
      console.log('🔌 VideoRoomV2: Component unmounting - keeping socket alive');
      // Don't disconnect - let SocketManager handle it
    };
  }, []);

  // Always call useWebRTC hook, but pass null socket if not ready
  const {
    localStream,
    peers,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    error,
    toggleVideo,
    toggleAudio,
    getScreenShare,
    stopScreenShare
  } = useWebRTC(roomId, userName, socket, initialStream, mediaEnabled);

  // Setup chat event listeners
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (message: ChatMessage) => {
      console.log('💬 New chat message:', message);
      setChatMessages(prev => [...prev, message]);
    };

    const handleUserJoined = (user: UserInfo) => {
      console.log('👥 User joined:', user);
      setRoomUsers(prev => {
        // Avoid duplicates
        const exists = prev.find(u => u.id === user.id);
        if (exists) return prev;
        return [...prev, user];
      });
    };

    const handleUserLeft = (user: UserInfo) => {
      console.log('👋 User left:', user);
      setRoomUsers(prev => prev.filter(u => u.id !== user.id));
    };

    const handleRoomUsers = (users: UserInfo[]) => {
      console.log('📋 Room users update:', users);
      setRoomUsers(users);
    };

    // Register event listeners
    socket.on('chat-message', handleChatMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('room-users', handleRoomUsers);

    // Cleanup
    return () => {
      socket.off('chat-message', handleChatMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('room-users', handleRoomUsers);
    };
  }, [socket]);

  useEffect(() => {
    if (mediaEnabled) {
      setIsLoading(!localStream);
    } else {
      setIsLoading(false);
    }
  }, [localStream, mediaEnabled]);

  const handleScreenShare = async () => {
    try {
      await getScreenShare();
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  };

  const handleSendMessage = (message: string) => {
    if (socket) {
      console.log('📤 Sending message:', message);
      socket.emit('chat-message', { message });
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-semibold">Room: {roomId}</h1>
          <div className="text-gray-400 text-sm">Welcome, {userName}!</div>
        </div>
        <div className="flex items-center space-x-2">
          {error && (
            <div className="text-red-400 text-sm mr-4">
              {error}
            </div>
          )}
          <button
            onClick={onLeaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
      {/* Left Side: Video Grid */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
          </div>
        ) : (
          <VideoGrid
            localStream={localStream}
            peers={peers}
            userName={userName}
            isLoading={false}
          />
        )}
      </div>

        {/* Right Side: User List & Chat */}
        <div className="w-80 flex flex-col border-l border-gray-700">
          {/* User List */}
          <div className="h-64 border-b border-gray-700">
            <UserList
              users={roomUsers}
              currentUserId={socket?.id || ''}
              currentUserName={userName}
            />
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <ChatArea messages={chatMessages} />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={!socket}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      {!isLoading && (
        <div id="video-controls-bar" className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <VideoControls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            isScreenSharing={isScreenSharing}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onStartScreenShare={handleScreenShare}
            onStopScreenShare={stopScreenShare}
            onLeaveCall={onLeaveRoom}
          />
        </div>
      )}

      {/* Debug Panel */}
      <RoomDebugger roomId={roomId} />
    </div>
  );
};
