// Socket.IO Connection Test
'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const SocketTest = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    addLog('🔄 Initializing Socket.IO...');
    
    // Force Socket.IO initialization
    fetch('/api/socket', { method: 'GET' })
      .then(() => {
        addLog('✅ API Route called successfully');
        
        const newSocket = io({
          path: '/api/socket',
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });

        newSocket.on('connect', () => {
          addLog(`✅ Socket connected: ${newSocket.id}`);
          setStatus('Connected');
          setSocket(newSocket);
        });

        newSocket.on('connect_error', (error) => {
          addLog(`❌ Connection error: ${error.message}`);
          setStatus('Error');
        });

        newSocket.on('disconnect', (reason) => {
          addLog(`❌ Disconnected: ${reason}`);
          setStatus('Disconnected');
        });

        return () => {
          newSocket.disconnect();
        };
      })
      .catch(err => {
        addLog(`❌ API Route failed: ${err.message}`);
      });
  }, []);

  const testJoinRoom = () => {
    if (socket) {
      addLog('🚪 Testing room join...');
      socket.emit('join-room', { room: 'test-room-123', name: 'TestUser' });
      
      socket.on('room-users', (users) => {
        addLog(`📋 Room users: ${users.length}`);
      });

      socket.on('user-joined', ({ name }) => {
        addLog(`👥 User joined: ${name}`);
      });
    }
  };

  return (
    <div className="p-6 bg-gray-800 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">🔧 Socket.IO Debug Test</h2>
      
      <div className="mb-4">
        <div className={`inline-block w-4 h-4 rounded-full mr-2 ${
          status === 'Connected' ? 'bg-green-500' : 
          status === 'Error' ? 'bg-red-500' : 'bg-yellow-500'
        }`}></div>
        <span className="font-semibold">Status: {status}</span>
      </div>

      <button 
        onClick={testJoinRoom}
        disabled={status !== 'Connected'}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded mb-4"
      >
        Test Room Join
      </button>

      <div className="bg-black p-3 rounded font-mono text-sm h-48 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-400">Waiting for logs...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
};
