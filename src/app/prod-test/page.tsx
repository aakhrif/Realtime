'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ProdTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId] = useState('prod-test-room');
  const [userName, setUserName] = useState('');
  const [users, setUsers] = useState<Array<{id: string, name: string}>>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [joined, setJoined] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 14)]);
  };

  useEffect(() => {
    const newSocket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setSocket(newSocket);
      addLog(`✅ Connected: ${newSocket.id?.slice(0, 8)}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      addLog('❌ Disconnected');
    });

    newSocket.on('user-joined', ({ id, name }: { id: string; name: string }) => {
      addLog(`👥 User joined: ${name}`);
      setUsers(prev => [...prev.filter(u => u.id !== id), { id, name }]);
    });

    newSocket.on('user-left', ({ id, name }: { id: string; name: string }) => {
      addLog(`👋 User left: ${name}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    });

    newSocket.on('room-users', (roomUsers: Array<{id: string, name: string}>) => {
      addLog(`📋 Room users: ${roomUsers.length}`);
      setUsers(roomUsers);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRoom = () => {
    if (socket && userName.trim()) {
      socket.emit('join-room', { room: roomId, name: userName });
      setJoined(true);
      addLog(`🚪 Joining ${roomId} as ${userName}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🚀 Production Multi-User Test
        </h1>

        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-semibold">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span>•</span>
            <span>Room: {roomId}</span>
            <span>•</span>
            <span>Users: {users.length + (joined ? 1 : 0)}</span>
          </div>
        </div>

        {/* Join Form */}
        {!joined && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex space-x-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={joinRoom}
                disabled={!isConnected || !userName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold"
              >
                Join Room
              </button>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="font-bold mb-3">👥 Users in Room ({users.length + (joined ? 1 : 0)})</h2>
          <div className="space-y-2">
            {joined && (
              <div className="flex items-center space-x-3 p-2 bg-blue-900 rounded">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-semibold">{userName} (You)</span>
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

        {/* Debug Logs */}
        <div className="bg-black rounded-lg p-4">
          <h2 className="font-bold mb-3">📝 Real-time Events</h2>
          <div className="font-mono text-sm text-green-400 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p>Waiting for events...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 rounded-lg p-4">
          <h3 className="font-bold mb-2">🧪 Production Test Instructions</h3>
          <ul className="text-sm space-y-1">
            <li>• Öffne mehrere Browser-Tabs/Fenster mit dieser Seite</li>
            <li>• Verwende verschiedene Namen aber gleichen Room</li>
            <li>• In Production: Teste auf verschiedenen Geräten/Netzwerken</li>
            <li>• Beobachte die Events - alle User sollten erscheinen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
