'use client';

import { useState } from 'react';
import { VideoRoom } from '@/components/VideoRoom';
import { MediaPermission } from '@/components/MediaPermission';

type AppState = 'join-form' | 'permission-request' | 'video-room';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('join-form');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputUserName, setInputUserName] = useState('');
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputRoomId.trim() || !inputUserName.trim()) {
      alert('Please enter both room ID and your name');
      return;
    }

    setRoomId(inputRoomId.trim());
    setUserName(inputUserName.trim());
    setAppState('permission-request');
  };

  const handlePermissionGranted = (stream: MediaStream) => {
    setMediaStream(stream);
    setPermissionError(null);
    setAppState('video-room');
  };

  const handlePermissionDenied = (error: string) => {
    setPermissionError(error);
    // Bleibe im Permission-Request State, damit User es nochmal versuchen kann
  };

  const handleLeaveRoom = () => {
    // Cleanup media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    setAppState('join-form');
    setRoomId('');
    setUserName('');
    setPermissionError(null);
  };

  const handleBackToForm = () => {
    setAppState('join-form');
    setPermissionError(null);
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInputRoomId(randomId);
  };

  // Permission Request State
  if (appState === 'permission-request') {
    return (
      <div className="relative">
        <MediaPermission
          onPermissionGranted={handlePermissionGranted}
          onPermissionDenied={handlePermissionDenied}
        />
        
        {/* Back Button */}
        <button
          onClick={handleBackToForm}
          className="absolute top-6 left-6 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition"
          title="Zurück zum Formular"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  // Video Room State
  if (appState === 'video-room') {
    return (
      <VideoRoom
        roomId={roomId}
        userName={userName}
        onLeaveRoom={handleLeaveRoom}
        initialStream={mediaStream}
      />
    );
  }

  // Join Form State (Default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Video Chat App
          </h1>
          <p className="text-gray-600">
            Connect with others through real-time video calls
          </p>

          {/* Permission Error Display */}
          {permissionError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-700">{permissionError}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label 
              htmlFor="userName" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name
            </label>
            <input
              id="userName"
              type="text"
              value={inputUserName}
              onChange={(e) => setInputUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="roomId" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Room ID
            </label>
            <div className="flex space-x-2">
              <input
                id="roomId"
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition font-medium text-gray-700"
                title="Generate random room ID"
              >
                🎲
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Create a new room or enter an existing room ID
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105"
          >
            🎥 Continue to Camera Setup
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Features:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Real-time video and audio calls</li>
            <li>• Screen sharing support</li>
            <li>• Multiple participants</li>
            <li>• No registration required</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
