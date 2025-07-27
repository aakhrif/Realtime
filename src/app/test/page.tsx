'use client';

import { useState } from 'react';
import { TestMode } from '@/components/TestMode';

export default function TestPage() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);

  const joinRoom = () => {
    if (roomId.trim() && userName.trim()) {
      setIsInRoom(true);
    }
  };

  if (isInRoom) {
    return <TestMode roomId={roomId} userName={userName} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">🧪 Multi-User Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="test-room-123"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Test User"
            />
          </div>
          
          <button
            onClick={joinRoom}
            disabled={!roomId.trim() || !userName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            Join Test Room
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>🔍 This is a test mode without real camera/microphone</p>
          <p>📱 Open multiple tabs with the same Room ID</p>
          <p>👥 Use different names to simulate multiple users</p>
        </div>
      </div>
    </div>
  );
}
