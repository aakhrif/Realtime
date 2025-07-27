// Test Component für Multi-User ohne echte Kamera
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface TestUser {
  id: string;
  name: string;
  color: string;
}

interface TestModeProps {
  roomId: string;
  userName: string;
}

export const TestMode: React.FC<TestModeProps> = ({ roomId, userName }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<TestUser[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const colors = useMemo(() => ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'], []);
  const userColor = useMemo(() => colors[Math.floor(Math.random() * colors.length)], [colors]);

  const addEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [`[${timestamp}] ${event}`, ...prev.slice(0, 9)]);
  };

  // Fake Video Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = userColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw moving circle (fake video)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 30 + Math.sin(frame * 0.1) * 10;
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw user name
      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(userName, centerX, centerY + 5);
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [userName, userColor]);

  useEffect(() => {
    const newSocket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      addEvent(`✅ Connected: ${newSocket.id?.slice(0, 8)}`);
      
      // Auto-join room
      newSocket.emit('join-room', { room: roomId, name: userName });
      addEvent(`🚪 Joining room ${roomId}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      addEvent('❌ Disconnected');
    });

    newSocket.on('user-joined', ({ id, name }: { id: string; name: string }) => {
      addEvent(`👥 User joined: ${name}`);
      setUsers(prev => {
        const color = colors[prev.length % colors.length];
        return [...prev.filter(u => u.id !== id), { id, name, color }];
      });
    });

    newSocket.on('user-left', ({ id, name }: { id: string; name: string }) => {
      addEvent(`👋 User left: ${name}`);
      setUsers(prev => prev.filter(u => u.id !== id));
    });

    newSocket.on('room-users', (roomUsers: { id: string; name: string }[]) => {
      addEvent(`📋 Found ${roomUsers.length} existing users`);
      const coloredUsers = roomUsers.map((user, index) => ({
        ...user,
        color: colors[index % colors.length]
      }));
      setUsers(coloredUsers);
    });

    // WebRTC Events (simulated)
    newSocket.on('offer', ({ from }: { from: string }) => {
      addEvent(`📡 Offer from: ${from.slice(0, 8)}`);
    });

    newSocket.on('answer', ({ from }: { from: string }) => {
      addEvent(`📡 Answer from: ${from.slice(0, 8)}`);
    });

    newSocket.on('ice-candidate', ({ from }: { from: string }) => {
      addEvent(`🧊 ICE from: ${from.slice(0, 8)}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, userName, colors]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">🧪 Test Mode - Room: {roomId}</h1>
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            <span>•</span>
            <span>👤 {userName}</span>
            <span>•</span>
            <span>Total Users: {users.length + 1}</span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="mb-6">
          <div className={`grid gap-4 ${
            users.length === 0 ? 'grid-cols-1' : 
            users.length <= 2 ? 'grid-cols-2' : 
            'grid-cols-3'
          }`}>
            
            {/* Local User */}
            <div className="relative">
              <canvas 
                ref={canvasRef}
                width={320}
                height={240}
                className="w-full h-48 bg-gray-800 rounded-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                👤 {userName} (You)
              </div>
            </div>

            {/* Remote Users */}
            {users.map(user => (
              <div key={user.id} className="relative">
                <div 
                  className="w-full h-48 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: user.color }}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2 mx-auto">
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="text-white font-semibold">{user.name}</p>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  👤 {user.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Log */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">🔍 Real-time Events</h3>
          <div className="bg-black rounded p-3 font-mono text-sm text-green-400 h-32 overflow-y-auto">
            {events.length === 0 ? (
              <p>Waiting for events...</p>
            ) : (
              events.map((event, index) => (
                <div key={index}>{event}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 rounded-lg p-4">
          <h3 className="font-bold mb-2">📝 Test Instructions</h3>
          <ul className="text-sm space-y-1">
            <li>• Öffne mehrere Browser-Tabs mit der gleichen Room-ID</li>
            <li>• Verwende verschiedene Namen für jeden Tab</li>
            <li>• Beobachte die Events und User-Liste in Echtzeit</li>
            <li>• Simuliert WebRTC ohne echte Kamera/Mikrofon</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
