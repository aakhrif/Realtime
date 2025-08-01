
// ...original code restored...
'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MediaPermission } from '@/components/MediaPermission';
import { VideoRoomV2 } from '@/components/VideoRoomV2';
import { VideoRoomMobile } from '@/components/VideoRoomMobile';
import { useDevice } from '@/contexts/DeviceContext';
import SocketManager from '@/lib/socketManager';

type RoomState = 'loading' | 'permission-request' | 'video-room' | 'error';

export default function RoomPage() {
  const { device } = useDevice();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomId = params?.roomId as string;
  const userName = searchParams?.get('name');
  
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

  const handleEnterWithoutMedia = () => {
    // Enter room without media stream
    setMediaStream(null);
    setPermissionError(null);
    setRoomState('video-room');
  };

  const handleLeaveRoom = () => {
    // Cleanup media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    // Socket sofort disconnecten, damit andere User es sehen
    if (typeof window !== 'undefined') {
      SocketManager.disconnect();
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
    // Socket-Status aus globalem Window holen (wird von VideoRoomMobile gesetzt)
    const isSocketReady = typeof window !== 'undefined' ? (window as any).__videoRoomMobileSocketReady === true : false;
    return (
      <div className="relative">
        <MediaPermission
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
          onEnterWithoutMedia={handleEnterWithoutMedia}
          isSocketReady={isSocketReady}
        />

        {/*
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
        */}

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
  // Beispiel: Sprache aus Room-Stats, hier als Platzhalter 'ar' oder 'en'
  // In der echten App: Hole language aus Room-Stats/Context
  const roomLanguage = 'ar'; // z.B. 'ar' für Arabisch, 'en' für Englisch

  if (roomState === 'video-room') {
    if (device === 'mobile') {
      return (
        <VideoRoomMobile
          roomId={roomId}
          userName={userName!}
          onLeaveRoom={handleLeaveRoom}
          mediaEnabled={!!mediaStream}
          // language={roomLanguage}
        />
      );
    }
    return (
      <VideoRoomV2
        roomId={roomId}
        userName={userName!}
        onLeaveRoom={handleLeaveRoom}
        mediaEnabled={!!mediaStream}
        language={roomLanguage}
      />
    );
  }

  return null;
}
