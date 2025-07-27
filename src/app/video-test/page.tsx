'use client';

import { useState } from 'react';
import { VideoRoomV2 } from '@/components/VideoRoomV2';

export default function VideoTestPage() {
  const [roomId, setRoomId] = useState('video-test-room'); 
  const [userName, setUserName] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);

  const joinRoom = () => {
    if (roomId.trim() && userName.trim()) {
      setIsInRoom(true);
    }
  };

  const leaveRoom = () => {
    setIsInRoom(false);
  };

  if (isInRoom) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="bg-red-900 text-white p-2 text-center font-bold">
          🧪 ECHTE WEBRTC VIDEO-KOMPONENTE TEST
        </div>
        <VideoRoomV2 
          roomId={roomId} 
          userName={userName} 
          onLeaveRoom={leaveRoom}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-red-400">
          🎥 ECHTE WebRTC Video Test
        </h1>
        
        <div className="bg-yellow-900 p-3 rounded mb-4 text-sm">
          <strong>⚠️ Wichtig:</strong> Das ist der ECHTE VideoRoom-Test mit WebRTC!
          <br />Nicht wie /test (nur Socket.IO)
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="video-test-room"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Video Tester"
            />
          </div>
          
          <button
            onClick={joinRoom}
            disabled={!roomId.trim() || !userName.trim()}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 p-3 rounded-lg font-semibold transition-colors"
          >
            🎥 Join ECHTE Video Room
          </button>
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Kamera/Mikrofon Berechtigung erforderlich</p>
            <p>• Öffne auf 2 Geräten mit gleichem Room ID</p>
            <p>• Schaue Browser Console für WebRTC Logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
