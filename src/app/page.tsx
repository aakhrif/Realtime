'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputUserName, setInputUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputRoomId.trim() || !inputUserName.trim()) {
      alert('Please enter both room ID and your name');
      return;
    }

    setIsJoining(true);
    
    // Navigate to room with parameters
    const roomId = inputRoomId.trim();
    const userName = inputUserName.trim();
    
    router.push(`/room/${encodeURIComponent(roomId)}?name=${encodeURIComponent(userName)}`);
  };

  const generateRoomId = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setInputRoomId(randomId);
  };

  // Join Form State
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
              disabled={isJoining}
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
                disabled={isJoining}
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition font-medium text-gray-700 disabled:opacity-50"
                title="Generate random room ID"
                disabled={isJoining}
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
            disabled={isJoining}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-105 disabled:transform-none"
          >
            {isJoining ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Joining Room...
              </span>
            ) : (
              '🎥 Join Video Room'
            )}
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
