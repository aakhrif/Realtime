
import React, { useState } from 'react';
import { ChatArea } from './ChatArea';
import { ChatInput } from './ChatInput';
import { useWebRTC } from '@/hooks/useWebRTC';

  interface VideoRoomMobileProps {
    roomId: string;
    userName: string;
    onLeaveRoom: () => void;
    initialStream?: MediaStream | null;
    mediaEnabled?: boolean;
  }

// Mobile-optimiertes Room-Layout
export const VideoRoomMobile: React.FC<VideoRoomMobileProps> = ({
  roomId,
  userName,
  onLeaveRoom,
  initialStream = null,
  mediaEnabled = true,
}) => {
  // WebRTC Hook (ohne Socket für Demo, ggf. anpassen)
  const {
    localStream,
    peers
  } = useWebRTC(roomId, userName, null, initialStream, mediaEnabled);

  // Typen lokal definieren, falls kein Import möglich
  type ChatMessage = {
    id: string;
    name: string;
    message: string;
    timestamp: string;
  };
  type UserInfo = {
    id: string;
    name: string;
    room: string;
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userList, setUserList] = useState<UserInfo[]>([]);
  const [socketReady, setSocketReady] = useState(false);

  // Socket.IO Setup für User-Events
  React.useEffect(() => {
    let socket: import('socket.io-client').Socket | null = null;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 800;

    const connectSocket = async () => {
      const ioClient = (await import('socket.io-client')).default;
      socket = ioClient({ path: '/api/socket', transports: ['websocket', 'polling'] });

      socket.on('connect', () => setSocketReady(true));
      socket.on('disconnect', () => setSocketReady(false));

      // Fehler-Handler für Verbindungsprobleme
      socket.on('connect_error', (err: Error) => {
        setSocketReady(false);
        if (err && err.message && err.message.includes('server error')) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              socket?.disconnect();
              connectSocket();
            }, retryDelay);
          } else {
            // Optional: User-Feedback nach zu vielen Fehlversuchen
            // z.B. setRoomState('error');
          }
        }
      });

      // Join Room beim Mount (nutze Props)
      socket.emit('join-room', { room: roomId, name: userName });

      // Initiale User-Liste
      socket.on('room-users', (users: { id: string; name: string }[]) => {
        setUserList(users.map(u => ({ ...u, room: roomId })));
      });
      // User joined
      socket.on('user-joined', (user: { id: string; name: string }) => {
        setUserList((prev: UserInfo[]) => {
          if (prev.find(u => u.id === user.id)) return prev;
          return [...prev, { ...user, room: roomId }];
        });
      });
      // User left
      socket.on('user-left', (user: { id: string; name: string }) => {
        setUserList((prev: UserInfo[]) => prev.filter(u => u.id !== user.id));
      });
    };
    connectSocket();

    // Cleanup
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [roomId, userName]);

  // Video-Streams: Eigenes Video + alle Peers
  const peerStreams = Array.from(peers.values()).map(p => ({ id: p.id, name: p.name, stream: p.stream }));
  // Aktives Video: Eigener Stream oder erster Peer
  const mainVideo = peerStreams.length > 0 ? peerStreams[0] : { id: 'local', name: userName, stream: localStream };
  const thumbnails = peerStreams.length > 1 ? peerStreams.slice(1) : [];

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
        <div className="text-white font-bold text-base truncate">Room: {roomId}</div>
        <button
          onClick={onLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
        >
          Leave
        </button>
      </div>

      {/* Split Layout: 25% Video, 75% Chat */}
      <div className="flex-1 flex flex-col">
        {/* Oben: Video (25%) */}
        <div className="flex-none relative" style={{ height: '25%' }}>
          <div className="w-full h-full flex items-center justify-center">
            <video
              className="w-full h-full object-cover bg-black rounded-lg shadow-lg"
              autoPlay
              playsInline
              muted
              ref={el => {
                if (el && mainVideo.stream) el.srcObject = mainVideo.stream;
              }}
            />
          </div>
          {/* UserList als kleine Rechtecke unten rechts */}
          <div className="absolute bottom-2 right-2 flex gap-2 z-20">
            {userList.slice(0, 4).map(user => (
              <div key={user.id} className="w-10 h-14 bg-gray-800 rounded-lg flex flex-col items-center justify-center shadow border-2 border-gray-700">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs mb-1">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-white text-[10px] truncate max-w-[2.2rem]">{user.name}</span>
              </div>
            ))}
            {userList.length > 4 && (
              <div className="w-10 h-14 bg-gray-700 rounded-lg flex items-center justify-center text-white text-xs">+{userList.length - 4}</div>
            )}
          </div>
        </div>
        {/* Unten: Chat (75%) */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-800 overflow-hidden" style={{ height: '75%' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="text-white font-bold">Chat</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatArea messages={chatMessages} />
          </div>
          <div className="border-t border-gray-800">
            <ChatInput onSendMessage={msg => setChatMessages(m => [
              ...m,
              {
                id: Date.now().toString(),
                name: userName,
                message: msg,
                timestamp: new Date().toISOString()
              }
            ])} />
          </div>
        </div>
      </div>
    </div>
  );
};
