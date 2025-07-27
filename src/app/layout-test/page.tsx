'use client';

import { useState } from 'react';
import { VideoRoomV2 } from '@/components/VideoRoomV2';

export default function LayoutTestPage() {
  const [roomId, setRoomId] = useState('layout-test-room'); 
  const [userName, setUserName] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [joinWithoutMedia, setJoinWithoutMedia] = useState(false); // New option

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
      <VideoRoomV2 
        roomId={roomId} 
        userName={userName} 
        onLeaveRoom={leaveRoom}
        mediaEnabled={!joinWithoutMedia} // Pass media setting
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-400">
          🧪 NEW LAYOUT TEST
        </h1>
        
        <div className="bg-green-900 p-3 rounded mb-4 text-sm">
          <strong>✨ Neu:</strong> Vertikale User-Liste + Chat-Area + Video-Grid Layout!
          <br />Test das neue UI-Konzept
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="layout-test-room"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Layout Tester"
            />
          </div>

          {/* Media Option */}
          <div className="flex items-center space-x-3">
            <input
              id="joinWithoutMedia"
              type="checkbox"
              checked={joinWithoutMedia}
              onChange={(e) => setJoinWithoutMedia(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="joinWithoutMedia" className="text-sm">
              Join without camera/microphone (viewer only)
            </label>
          </div>
          
          <button
            onClick={joinRoom}
            disabled={!roomId.trim() || !userName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-3 rounded-lg font-semibold transition-colors"
          >
            🎨 Test New Layout
          </button>
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>• Neues Layout: Video + Chat + User-Liste</p>
            <p>• Öffne mehrere Tabs zum Testen</p>
            <p>• 💡 <strong>Neu:</strong> Tritt ohne Kamera/Mikro bei (CPU-schonend)</p>
            <p>• Nutze echte Kamera/Mikrofon oder nur als Zuschauer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
