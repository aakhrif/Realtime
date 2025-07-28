'use client';

import { VideoPlayer } from '@/components/VideoPlayer';
import { PeerConnection } from '@/hooks/useWebRTC';

interface VideoGridProps {
  localStream: MediaStream | null;
  peers: Map<string, PeerConnection>;
  userName: string;
  isLoading?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ 
  localStream, 
  peers, 
  userName,
  isLoading = false 
}) => {
  const peerArray = Array.from(peers.values());
  const totalParticipants = peerArray.length + 1;

  // Calculate grid layout based on participant count
  const getGridClass = () => {
    if (peerArray.length === 0) return 'grid-cols-1 max-w-md mx-auto';
    if (peerArray.length === 1) return 'grid-cols-1 lg:grid-cols-2';
    if (peerArray.length <= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Setting up your camera and microphone...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-900 p-6">
      {/* Video Grid */}
      <div className="h-full flex flex-col">
        {/* Main Video Area */}
        <div className="flex-1 flex items-center justify-center">
          <div className={`grid gap-4 w-full h-full ${getGridClass()}`}>
            {/* Local Video */}
            <div className="aspect-video relative">
              <VideoPlayer
                stream={localStream}
                isLocal={true}
                userName={userName}
                className="h-full w-full rounded-lg overflow-hidden"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                You
              </div>
            </div>

            {/* Remote Videos */}
            {peerArray.map((peer) => (
              <div key={peer.id} className="aspect-video relative">
                <VideoPlayer
                  stream={peer.stream || null}
                  userName={peer.name}
                  className="h-full w-full rounded-lg overflow-hidden"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {peer.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participants Info */}
        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm">
            {totalParticipants} participant{totalParticipants === 1 ? '' : 's'} in the room
          </p>
        </div>

        {/* Empty State Message */}
        {peerArray.length === 0 && (
          <div className="text-center text-gray-400 mt-4">
            <p className="mb-2">You&apos;re the first one in the room!</p>
            <p className="text-sm">Share the room ID with others to start the video call.</p>
          </div>
        )}
      </div>
    </div>
  );
};
