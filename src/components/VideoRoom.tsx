'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoControls } from '@/components/VideoControls';
import { RoomDebugger } from '@/components/RoomDebugger';

interface VideoRoomProps {
  roomId: string;
  userName: string;
  onLeaveRoom: () => void;
  initialStream?: MediaStream | null;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({
  roomId,
  userName,
  onLeaveRoom,
  initialStream = null
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 VideoRoom: Initializing Socket.IO connection...');
    
    const newSocket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ VideoRoom: Socket connected:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ VideoRoom: Socket disconnected');
    });

    newSocket.on('error', (err) => {
      console.error('❌ VideoRoom: Socket error:', err);
    });

    return () => {
      console.log('🔌 VideoRoom: Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

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
  } = useWebRTC(roomId, userName, socket, initialStream);

  useEffect(() => {
    if (localStream) {
      setIsLoading(false);
    }
  }, [localStream]);

  const handleScreenShare = async () => {
    try {
      await getScreenShare();
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  };

  const peerArray = Array.from(peers.values());

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Room: {roomId}</h1>
          <p className="text-gray-400">Welcome, {userName}!</p>
          {error && (
            <div className="mt-2 p-3 bg-red-600 text-white rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Setting up your camera and microphone...</p>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {!isLoading && (
          <div className="mb-6">
            <div className={`grid gap-4 ${
              peerArray.length === 0 ? 'grid-cols-1 max-w-md mx-auto' :
              peerArray.length === 1 ? 'grid-cols-1 lg:grid-cols-2' :
              peerArray.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'
            }`}>
              {/* Local Video */}
              <div className="aspect-video">
                <VideoPlayer
                  stream={localStream}
                  isLocal={true}
                  userName={userName}
                  className="h-full"
                />
              </div>

              {/* Remote Videos */}
              {peerArray.map((peer) => (
                <div key={peer.id} className="aspect-video">
                  <VideoPlayer
                    stream={peer.stream || null}
                    userName={peer.name}
                    className="h-full"
                  />
                </div>
              ))}
            </div>

            {/* Participants Count */}
            <div className="text-center mt-4">
              <p className="text-gray-400 text-sm">
                {peerArray.length + 1} participant{peerArray.length === 0 ? '' : 's'} in the room
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        {!isLoading && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
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

        {/* Instructions */}
        {peerArray.length === 0 && !isLoading && (
          <div className="text-center text-gray-400 mt-8">
            <p className="mb-2">You&apos;re the first one in the room!</p>
            <p className="text-sm">Share the room ID with others to start the video call.</p>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <RoomDebugger roomId={roomId} />
    </div>
  );
};
