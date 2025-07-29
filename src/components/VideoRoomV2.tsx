'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useWebRTC } from '@/hooks/useWebRTC';
// ...existing code...
import { VideoControls } from '@/components/VideoControls';
import { RoomDebugger } from '@/components/RoomDebugger';
import { UserList } from '@/components/UserList';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';

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
  // Topic für den Raum
  const [topic] = useState<string>('Heutiges Thema: Gott und die Welt');
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected, currentRoom, roomUsers, error: socketError, joinRoom } = useSocket();
  
  // Chat state kommt jetzt aus Context
  const { chatMessages, sendChatMessage } = useSocket();

  // Room join logic (nur wenn Socket verbunden und Room noch nicht gejoint)
  useEffect(() => {
    if (isConnected && socket && currentRoom !== roomId) {
      joinRoom(roomId, userName);
    }
  }, [isConnected, socket, currentRoom, roomId, userName, joinRoom]);

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


  useEffect(() => {
    if (mediaEnabled) {
      setIsLoading(!localStream);
    } else {
      setIsLoading(false);
    }
  }, [localStream, mediaEnabled]);

  // Fehleranzeige bei Socket-Connect-Fehler
  if (socketError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verbindungsfehler</h1>
          <p className="text-gray-600 mb-6">{socketError}</p>
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
    sendChatMessage(message);
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6" style={{marginLeft: '300px'}}>
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-semibold">Room: {roomId}</h1>
          <div className="text-gray-400 text-sm">{topic}</div>
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
        <div className="flex flex-col border-r border-gray-700 bg-gray-900 max-w-sm w-[300px] min-w-[240px] h-screen fixed top-0 left-0 z-30">
          <UserList
            users={roomUsers.map(u => ({ id: u.id, name: u.name, room: roomId }))}
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
        <div className="flex-1 flex flex-col items-center justify-center px-2" style={{marginLeft: '300px'}}>
          <div className="flex-1 w-full max-w-screen-md flex flex-col relative mx-auto" style={{marginLeft: 'auto', marginRight: 'auto'}}>
            <div className="flex-1 overflow-y-auto">
              <ChatArea messages={chatMessages} extraBottomSpace />
            </div>
            <div className="border-t border-gray-700 bg-gray-900 h-16 px-0 flex-shrink-0 fixed bottom-8 left-1/2 w-full" style={{transform: 'translateX(-50%)', minWidth: '320px', maxWidth: '700px'}}>
              <div className="h-16 bg-gray-800 border-t border-gray-700 px-4 flex items-center space-x-3 w-full">
                <div className="flex-1 w-full">
                  <ChatInput 
                    onSendMessage={handleSendMessage}
                    disabled={!socket}
                  />
                </div>
              </div>
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
