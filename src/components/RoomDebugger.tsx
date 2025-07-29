// Debug Component für Multi-User Testing
'use client';

import { useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

// ...existing code...

export const RoomDebugger = ({ roomId }: { roomId: string }) => {
  const { roomUsers, joinRoom, isConnected } = useSocket();
  const [events, setEvents] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false); // New: Toggle for debug panel

  const addEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [`[${timestamp}] ${event}`, ...prev.slice(0, 19)]);
  };

  // Events werden weiterhin lokal gesammelt

  const handleJoinRoom = (userName: string) => {
    joinRoom(roomId, userName);
    addEvent(`🚪 Joining room ${roomId} as ${userName}`);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isExpanded ? (
        // Minimized: Just a small debug button
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Open Debug Panel"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>
      ) : (
        // Expanded: Full debug panel
        <div className="w-80 bg-white rounded-lg shadow-lg p-4 text-xs">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">🐛 Room Debug: {roomId}</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
              title="Minimize Debug Panel"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="mb-2">
            <div className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <div className="mb-3">
            <h4 className="font-semibold">Users in Room ({roomUsers.length}):</h4>
            {roomUsers.length === 0 ? (
              <p className="text-gray-500">No users</p>
            ) : (
              <ul className="text-xs">
                {roomUsers.map(user => (
                  <li key={user.id} className="truncate">
                    👤 {user.name} ({user.id.slice(0, 8)}...)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3">
            <button 
              onClick={() => handleJoinRoom(`User-${Math.floor(Math.random() * 1000)}`)}
              className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs"
              disabled={!isConnected}
            >
              Join as Random User
            </button>
          </div>

          <div>
            <h4 className="font-semibold mb-1">Recent Events:</h4>
            <div className="bg-black text-green-400 p-2 rounded text-xs h-32 overflow-y-auto font-mono">
              {events.length === 0 ? (
                <p>No events yet...</p>
              ) : (
                events.map((event, index) => (
                  <div key={index}>{event}</div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
