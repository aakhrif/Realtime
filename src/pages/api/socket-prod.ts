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
  console.log(`🔵 Socket.IO API called: ${req.method} ${req.url} - ENV: ${process.env.NODE_ENV}`);
  
  // @ts-expect-error - NextJS Pages API socket server access
  if (!res.socket.server.io) {
    console.log('🔧 Initializing Socket.IO server for PRODUCTION...');
    
    // @ts-expect-error - NextJS Pages API socket server access  
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.id} - Total connections: ${io.sockets.sockets.size}`);

      // User joins a room
      socket.on('join-room', async ({ room, name }: { room: string; name: string }) => {
        console.log(`🚪 [PRODUCTION] ${name} (${socket.id}) joining room: ${room}`);
        
        try {
          // Leave previous room if any
          const user = users.get(socket.id);
          if (user && user.room) {
            console.log(`🔄 User leaving previous room: ${user.room}`);
            socket.leave(user.room);
            const roomUsers = rooms.get(user.room);
            if (roomUsers) {
              roomUsers.delete(socket.id);
              socket.to(user.room).emit('user-left', {
                id: socket.id,
                name: user.name
              });
              console.log(`👋 Notified users in ${user.room} about leave`);
            }
          }

          // Join new room
          await socket.join(room);
          console.log(`📥 Socket successfully joined room: ${room}`);
          
          // Store user info in memory
          const userInfo: UserInfo = { id: socket.id, name, room };
          users.set(socket.id, userInfo);
          
          // Track in local memory
          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room)?.add(socket.id);

          // Get room data from Socket.IO (PRIMARY SOURCE)
          const socketioRoom = io.sockets.adapter.rooms.get(room);
          const allSocketIds = Array.from(socketioRoom || []);
          
          console.log(`🔍 [PRODUCTION] Room ${room} state:`, {
            socketioRoomSize: allSocketIds.length,
            localMapSize: rooms.get(room)?.size || 0,
            allSocketIds: allSocketIds,
            totalServerConnections: io.sockets.sockets.size
          });

          // Build current users list from Socket.IO room data
          const currentUsers: { id: string; name: string }[] = [];
          for (const socketId of allSocketIds) {
            if (socketId !== socket.id) {
              const existingUser = users.get(socketId);
              if (existingUser) {
                currentUsers.push({ id: existingUser.id, name: existingUser.name });
              } else {
                currentUsers.push({ id: socketId, name: `User-${socketId.slice(0, 6)}` });
              }
            }
          }

          console.log(`📋 [PRODUCTION] Sending ${currentUsers.length} existing users to ${name}:`, currentUsers);
          
          // CRITICAL: Send existing users to new user FIRST
          socket.emit('room-users', currentUsers);

          // CRITICAL: Notify others about new user
          socket.to(room).emit('user-joined', {
            id: socket.id,
            name
          });
          
          console.log(`✅ [PRODUCTION] User ${name} successfully joined ${room}. Room total: ${allSocketIds.length}`);
          console.log(`🔔 [PRODUCTION] Sent user-joined event to ${allSocketIds.length - 1} other users`);
          
          // Redis operations (non-blocking, optional)
          if (process.env.NODE_ENV === 'production') {
            RoomManager.addUserToRoom(room, socket.id, name).catch(err => 
              console.warn('⚠️ Redis addUser failed (non-critical):', err.message)
            );
            ConnectionStats.incrementConnection(room).catch(err => 
              console.warn('⚠️ Redis stats failed (non-critical):', err.message)
            );
          }

        } catch (error) {
          console.error('❌ [PRODUCTION] CRITICAL ERROR in join-room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // WebRTC Signaling
      socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
        console.log(`📡 [PRODUCTION] Offer from ${socket.id} to ${to}`);
        socket.to(to).emit('offer', {
          from: socket.id,
          offer
        });
      });

      socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
        console.log(`📡 [PRODUCTION] Answer from ${socket.id} to ${to}`);
        socket.to(to).emit('answer', {
          from: socket.id,
          answer
        });
      });

      socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidate }) => {
        console.log(`🧊 [PRODUCTION] ICE candidate from ${socket.id} to ${to}`);
        socket.to(to).emit('ice-candidate', {
          from: socket.id,
          candidate
        });
      });

      // Chat messages
      socket.on('chat-message', ({ message }: { message: string }) => {
        const user = users.get(socket.id);
        if (user) {
          console.log(`💬 [PRODUCTION] Chat message from ${user.name} in ${user.room}`);
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
        console.log(`❌ [PRODUCTION] User disconnected: ${socket.id}`);
        
        const user = users.get(socket.id);
        if (user) {
          try {
            // Notify others in the room
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
                console.log(`🗑️ [PRODUCTION] Room ${user.room} deleted (empty)`);
              } else {
                console.log(`👋 [PRODUCTION] User ${user.name} left room ${user.room}. Remaining: ${roomUsers.size}`);
              }
            }
            
            users.delete(socket.id);
            
            // Check Socket.IO rooms
            const socketioRoom = io.sockets.adapter.rooms.get(user.room);
            const remainingCount = socketioRoom?.size || 0;
            console.log(`🔍 [PRODUCTION] Room ${user.room} after disconnect - Local: ${roomUsers?.size || 0}, SocketIO: ${remainingCount}`);
            
            // Redis cleanup (non-blocking)
            if (process.env.NODE_ENV === 'production') {
              RoomManager.removeUserFromRoom(user.room, socket.id).catch(err => 
                console.warn('⚠️ Redis cleanup failed (non-critical):', err.message)
              );
            }
            
          } catch (error) {
            console.error('❌ [PRODUCTION] Error in disconnect handler:', error);
          }
        }
      });
    });

    // @ts-expect-error - NextJS Pages API socket server access
    res.socket.server.io = io;
    console.log('✅ [PRODUCTION] Socket.IO server initialized successfully');
  } else {
    console.log('🔄 [PRODUCTION] Socket.IO server already initialized');
  }

  res.end();
};

export default ioHandler;
