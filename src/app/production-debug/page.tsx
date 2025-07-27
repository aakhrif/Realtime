'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ProductionDebugPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId] = useState('production-debug-room');
  const [userName, setUserName] = useState('');
  const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [joined, setJoined] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[PROD-DEBUG] ${msg}`); // Also log to browser console
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addLog('🔧 Initializing Socket.IO connection for PRODUCTION DEBUG...');
    
    const newSocket = io({
      path: '/api/socket', // Use regular socket.ts (not socket-prod.ts)
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
      addLog(`✅ Connected to production server: ${newSocket.id?.slice(0, 8)}`);
    });

    newSocket.on('connect_error', (error) => {
      addLog(`❌ Connection error: ${error.message}`);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      addLog(`❌ Disconnected: ${reason}`);
    });

    newSocket.on('user-joined', ({ id, name }: { id: string; name: string }) => {
      addLog(`👥 [EVENT] User joined: ${name} (${id.slice(0, 8)})`);
      setUsers(prev => {
        const filtered = prev.filter(u => u.id !== id);
        return [...filtered, { id, name }];
      });
    });

    newSocket.on('user-left', ({ id, name }: { id: string; name: string }) => {
      addLog(`👋 [EVENT] User left: ${name} (${id.slice(0, 8)})`);
      setUsers(prev => prev.filter(u => u.id !== id));
    });

    newSocket.on('room-users', (roomUsers: Array<{id: string, name: string}>) => {
      addLog(`📋 [EVENT] Received room users: ${roomUsers.length} users`);
      roomUsers.forEach(user => {
        addLog(`  👤 ${user.name} (${user.id.slice(0, 8)})`);
      });
      setUsers(roomUsers);
    });

    newSocket.on('error', (error: { message: string }) => {
      addLog(`💥 [ERROR] Server error: ${error.message}`);
    });

    return () => {
      addLog('🔌 Cleaning up socket connection...');
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    if (socket && userName.trim()) {
      addLog(`🚪 Joining room ${roomId} as ${userName}...`);
      socket.emit('join-room', { room: roomId, name: userName });
      setJoined(true);
    }
  };

  const debugRoomState = async () => {
    try {
      const response = await fetch('/api/debug');
      const debugInfo = await response.json();
      addLog('🔍 Debug API Response:');
      addLog(`  📊 Socket.IO: ${debugInfo.socketIO?.initialized ? 'Initialized' : 'Not Initialized'}`);
      addLog(`  🏠 Rooms: ${debugInfo.socketIO?.roomCount || 0}`);
      addLog(`  👥 Connections: ${debugInfo.socketIO?.socketCount || 0}`);
      addLog(`  🌍 Environment: ${debugInfo.environment?.NODE_ENV || 'unknown'}`);
      
      if (debugInfo.rooms?.length > 0) {
        debugInfo.rooms.forEach((room: any) => {
          addLog(`  🏠 Room ${room.roomId}: ${room.userCount} users`);
        });
      }
    } catch (err) {
      addLog(`❌ Debug API failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-red-400">
          🚨 PRODUCTION DEBUG MODE
        </h1>

        {/* Connection Status */}
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-semibold">
                {isConnected ? 'PRODUCTION CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="text-sm">
              Room: {roomId} • Users: {users.length + (joined ? 1 : 0)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {!joined && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-2">Join Room</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                />
                <button
                  onClick={joinRoom}
                  disabled={!isConnected || !userName.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded text-sm font-semibold"
                >
                  Join
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Debug Tools</h3>
            <button
              onClick={debugRoomState}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold"
            >
              Check Server State
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Instructions</h3>
            <div className="text-xs text-gray-400">
              <p>• Open on multiple devices</p>
              <p>• Use same room ID</p>
              <p>• Check console logs</p>
            </div>
          </div>
        </div>

        {/* Users Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="font-bold mb-3">👥 Users in Room ({users.length + (joined ? 1 : 0)})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {joined && (
                <div className="flex items-center space-x-3 p-2 bg-green-900 rounded">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="font-semibold">{userName} (You)</span>
                </div>
              )}
              {users.length === 0 && joined && (
                <div className="text-center text-red-400 py-4">
                  🚨 NO OTHER USERS DETECTED - THIS IS THE BUG!
                </div>
              )}
              {users.map(user => (
                <div key={user.id} className="flex items-center space-x-3 p-2 bg-gray-700 rounded">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>{user.name}</span>
                  <span className="text-xs text-gray-400">({user.id.slice(0, 8)})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Logs */}
          <div className="bg-black rounded-lg p-4">
            <h2 className="font-bold mb-3">📝 Production Event Logs</h2>
            <div className="font-mono text-xs text-green-400 h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p>Waiting for events...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Critical Production Info */}
        <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
          <h3 className="font-bold text-yellow-400 mb-2">🔥 PRODUCTION DEBUG CHECKLIST</h3>
          <ul className="text-sm space-y-1">
            <li>✅ Check browser console for WebSocket errors</li>
            <li>✅ Verify both devices connect to same Docker container</li>
            <li>✅ Check server logs: <code>docker-compose logs app</code></li>
            <li>✅ Test /api/debug endpoint shows multiple connections</li>
            <li>✅ Ensure no Redis connection errors blocking functionality</li>
            <li>✅ Verify CORS allows multiple device connections</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
