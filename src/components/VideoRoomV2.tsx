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
import SocketManager from '@/lib/socketManager';

interface VideoRoomV2Props {
  roomId: string;
  userName: string;
  onLeaveRoom: () => void;
  initialStream?: MediaStream | null;
  mediaEnabled?: boolean;
  language?: string;
}

export const VideoRoomV2: React.FC<VideoRoomV2Props> = ({
  roomId,
  userName,
  onLeaveRoom,
  initialStream = null,
  mediaEnabled = true,
  language = 'en',
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [roomUsers, setRoomUsers] = useState<UserInfo[]>([]);

  // Initialize socket connection using singleton
  useEffect(() => {
    console.log('🔌 VideoRoomV2: Getting socket from SocketManager...');
    setConnectError(null);
    SocketManager.getSocket()
      .then((socketInstance) => {
        console.log('✅ VideoRoomV2: Socket received from manager:', socketInstance.id);
        setSocket(socketInstance);
      })
      .catch((error) => {
        console.error('❌ VideoRoomV2: Failed to get socket:', error);
        setConnectError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
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
      // Systemnachricht für Beitritt
      setChatMessages(prev => [
        ...prev,
        {
          id: `system-join-${user.id}-${Date.now()}`,
          name: 'System',
          message: `${user.name} ist dem Raum beigetreten.`,
          timestamp: new Date().toISOString(),
          type: 'join',
        }
      ]);
    };

    const handleUserLeft = (user: UserInfo) => {
      console.log('👋 User left:', user);
      setRoomUsers(prev => prev.filter(u => u.id !== user.id));
      // Systemnachricht für Verlassen
      setChatMessages(prev => [
        ...prev,
        {
          id: `system-leave-${user.id}-${Date.now()}`,
          name: 'System',
          message: `${user.name} hat den Raum verlassen.`,
          timestamp: new Date().toISOString(),
          type: 'leave', // Markiere als Leave für rote Darstellung
        }
      ]);
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

  // Fehleranzeige bei Socket-Connect-Fehler
  if (connectError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verbindungsfehler</h1>
          <p className="text-gray-600 mb-6">{connectError}</p>
          <button
            onClick={onLeaveRoom}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

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
      <div className={`flex-1 flex overflow-hidden`}> 
        {/* UserList: immer links, schmale Sidebar */}
        <div className="flex flex-col border-r border-gray-700 bg-gray-900 max-w-xs w-[220px] min-w-[180px] relative">
          <UserList
            users={roomUsers}
            currentUserId={socket?.id || ''}
            peers={peers}
            localStream={localStream}
          />
          {!isLoading && (
            <div className="absolute bottom-0 left-0 w-full z-10">
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
        </div>
        {/* Chat-Bereich mittig, max-w-screen-md, Abstand minimiert */}
        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <div className="flex-1 w-full max-w-screen-md flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <ChatArea messages={chatMessages} />
            </div>
            <div className="border-t border-gray-700">
              <ChatInput 
                onSendMessage={handleSendMessage}
                disabled={!socket}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {/* {!isLoading && (
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
      )} */}

      {/* Debug Panel */}
      <RoomDebugger roomId={roomId} />
    </div>
  );
};
