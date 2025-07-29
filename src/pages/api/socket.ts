import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { RoomManager, ConnectionStats } from '../../lib/redis';

export interface UserInfo {
  id: string;
  name: string;
  room: string;
}

const users = new Map<string, UserInfo>();
const rooms = new Map<string, Set<string>>();

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`🔵 Socket.IO API called: ${req.method} ${req.url}`);
  
  // @ts-expect-error - NextJS Pages API socket server access
  if (!res.socket.server.io) {
    console.log('🔧 Initializing Socket.IO server...');
    
    // @ts-expect-error - NextJS Pages API socket server access  
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket', // Zurück zum Next.js API Route Pfad
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      // --- WebRTC Signalisierung ---
      socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
        console.log(`[SIGNAL] Offer von ${socket.id} zu ${to}`);
        socket.to(to).emit('offer', { from: socket.id, offer });
      });

      socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
        console.log(`[SIGNAL] Answer von ${socket.id} zu ${to}`);
        socket.to(to).emit('answer', { from: socket.id, answer });
      });

      socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidate }) => {
        console.log(`[SIGNAL] ICE von ${socket.id} zu ${to}`);
        socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
      });

      // --- Chat ---
      socket.on('chat-message', ({ message }: { message: string }) => {
        const { room, name } = socket.data || {};
        if (room && name) {
          const chatMsg = {
            id: socket.id,
            name,
            message,
            timestamp: new Date().toISOString()
          };
          io.sockets.in(room).emit('chat-message', chatMsg);
          console.log(`[CHAT] ${name} (${socket.id}) -> ${room}: ${message}`);
        }
      });
      // --- Basis-Raum-Events ---
      // User tritt einem Raum bei
      socket.on('join-room', ({ room, name }: { room: string; name: string }) => {
        console.log(`[EVENT] join-room: ${name} (${socket.id}) -> ${room}`);
        // User-Tracking
        if (!socket.data) socket.data = {};
        socket.data.name = name;
        socket.data.room = room;
        socket.join(room);

        // Sende die User-Liste an alle User im Raum, inklusive sich selbst
        const ioNS = socket.nsp;
        const roomObj = ioNS.adapter.rooms.get(room);
        if (roomObj) {
          // Baue die vollständige User-Liste
          const userList: { id: string; name: string }[] = [];
          for (const socketId of roomObj) {
            const s = ioNS.sockets.get(socketId);
            userList.push({ id: socketId, name: s?.data?.name || `User-${String(socketId).slice(0, 6)}` });
          }
          // Sende die Liste an alle User im Raum
          for (const targetSocketId of roomObj) {
            ioNS.sockets.get(targetSocketId)?.emit('room-users', userList);
            console.log(`[EVENT] room-users -> ${targetSocketId}:`, userList);
          }
        }
        // Informiere andere User im Raum
        socket.to(room).emit('user-joined', { id: socket.id, name });
      });

      // User verlässt den Raum (explizit oder bei Disconnect)
      socket.on('leave-room', () => {
        const { room, name } = socket.data || {};
        if (room) {
          socket.leave(room);
          socket.to(room).emit('user-left', { id: socket.id, name });
          console.log(`[EVENT] user-left: ${name} (${socket.id}) -> ${room}`);
        }
      });

      socket.on('disconnect', () => {
        const { room, name } = socket.data || {};
        if (room) {
          socket.leave(room);
          socket.to(room).emit('user-left', { id: socket.id, name });
          console.log(`[EVENT] disconnect/user-left: ${name} (${socket.id}) -> ${room}`);
        }
      });
      console.log(`✅ User connected: ${socket.id}`);

      // ...Events entfernt. Hier können die Events schrittweise wieder hinzugefügt werden...
    });

    // @ts-expect-error - NextJS Pages API socket server access
    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
