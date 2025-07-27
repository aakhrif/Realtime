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
  // @ts-expect-error - NextJS Pages API socket server access
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    
    // @ts-expect-error - NextJS Pages API socket server access  
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // User joins a room
      socket.on('join-room', async ({ room, name }: { room: string; name: string }) => {
        console.log(`${name} (${socket.id}) joining room: ${room}`);
        
        // Leave previous room if any
        const user = users.get(socket.id);
        if (user && user.room) {
          socket.leave(user.room);
          const roomUsers = rooms.get(user.room);
          if (roomUsers) {
            roomUsers.delete(socket.id);
            // Redis cleanup for production
            await RoomManager.removeUserFromRoom(user.room, socket.id).catch(console.error);
          }
        }

        // Join new room
        socket.join(room);
        const userInfo: UserInfo = { id: socket.id, name, room };
        users.set(socket.id, userInfo);
        
        // Track in local memory (development) and Redis (production)
        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room)?.add(socket.id);
        
        // Redis: User registrieren für Production
        await RoomManager.addUserToRoom(room, socket.id, socket.id).catch(console.error);
        await ConnectionStats.incrementConnection(room).catch(console.error);

        // Notify others in the room about the new user
        socket.to(room).emit('user-joined', {
          id: socket.id,
          name
        });

        // Send current room users to the new user (excluding themselves)
        const currentUsers = Array.from(rooms.get(room) || [])
          .map(socketId => users.get(socketId))
          .filter(user => user && user.id !== socket.id)
          .map(user => ({ id: user!.id, name: user!.name }));
        
        socket.emit('room-users', currentUsers);
        
        console.log(`✅ User ${name} joined room ${room}. Total users in room: ${rooms.get(room)?.size || 0}`);
        console.log(`📋 Sending ${currentUsers.length} existing users to new user:`, currentUsers);
      });

      // WebRTC Signaling
      socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
        console.log(`Offer from ${socket.id} to ${to}`);
        socket.to(to).emit('offer', {
          from: socket.id,
          offer
        });
      });

      socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
        console.log(`Answer from ${socket.id} to ${to}`);
        socket.to(to).emit('answer', {
          from: socket.id,
          answer
        });
      });

      socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidate }) => {
        socket.to(to).emit('ice-candidate', {
          from: socket.id,
          candidate
        });
      });

      // Chat messages
      socket.on('chat-message', ({ message }: { message: string }) => {
        const user = users.get(socket.id);
        if (user) {
          io.to(user.room).emit('chat-message', {
            id: socket.id,
            name: user.name,
            message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        const user = users.get(socket.id);
        if (user) {
          // Redis cleanup for production
          await RoomManager.removeUserFromRoom(user.room, socket.id).catch(console.error);
          
          // Notify others in the room that user left
          socket.to(user.room).emit('user-left', {
            id: socket.id,
            name: user.name
          });

          // Clean up local tracking
          const roomUsers = rooms.get(user.room);
          if (roomUsers) {
            roomUsers.delete(socket.id);
            if (roomUsers.size === 0) {
              rooms.delete(user.room);
              console.log(`🗑️ Room ${user.room} deleted (empty)`);
            } else {
              console.log(`👋 User ${user.name} left room ${user.room}. Remaining users: ${roomUsers.size}`);
            }
          }
          
          users.delete(socket.id);
        }
      });
    });

    // @ts-expect-error - NextJS Pages API socket server access
    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
