'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { VideoRoom } from '@/components/VideoRoom';
import { MediaPermission } from '@/components/MediaPermission';

type RoomState = 'loading' | 'permission-request' | 'video-room' | 'error';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params.roomId as string;
  const userName = searchParams.get('name');
  
  const [roomState, setRoomState] = useState<RoomState>('loading');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    // Validate parameters
    if (!roomId || !userName) {
      setRoomState('error');
      return;
    }
    
    setRoomState('permission-request');
  }, [roomId, userName]);

  const handlePermissionGranted = (stream: MediaStream) => {
    setMediaStream(stream);
    setPermissionError(null);
    setRoomState('video-room');
  };

  const handlePermissionDenied = (error: string) => {
    setPermissionError(error);
  };

  const handleLeaveRoom = () => {
    // Cleanup media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    // Navigate back to home
    router.push('/');
  };

  const handleBackToHome = () => {
    // Cleanup any existing stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    router.push('/');
  };

  // Loading state
  if (roomState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (roomState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Room</h1>
          <p className="text-gray-600 mb-6">
            Room ID or username is missing. Please join a room properly.
          </p>
          <button
            onClick={handleBackToHome}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Permission Request State
  if (roomState === 'permission-request') {
    return (
      <div className="relative">
        <MediaPermission
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
        />
        
        {/* Header with room info and back button */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button
            onClick={handleBackToHome}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition"
            title="Zurück zur Startseite"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full">
            <span className="text-sm">Room: {roomId} | {userName}</span>
          </div>
        </div>

        {/* Permission Error Display */}
        {permissionError && (
          <div className="absolute bottom-6 left-6 right-6 p-4 bg-red-500 bg-opacity-90 text-white rounded-lg">
            <p className="text-sm">{permissionError}</p>
            <button
              onClick={handleBackToHome}
              className="mt-2 text-sm underline"
            >
              Zurück zur Startseite
            </button>
          </div>
        )}
      </div>
    );
  }

  // Video Room State
  if (roomState === 'video-room') {
    return (
      <VideoRoom
        roomId={roomId}
        userName={userName}
        onLeaveRoom={handleLeaveRoom}
        initialStream={mediaStream}
      />
    );
  }

  return null;
}
