const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Hört auf allen Interfaces
const port = process.env.PORT || 3000;

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['polling'], // Force polling only
    allowEIO3: false,        // Disable Engine.IO v3 compatibility
    pingTimeout: 20000,      // Longer ping timeout
    pingInterval: 10000,     // Longer ping interval
    maxHttpBufferSize: 1e6,  // Limit buffer size
    allowRequest: (req, callback) => {
      // Log each connection attempt
      console.log('🔍 New connection attempt from:', req.socket.remoteAddress);
      callback(null, true);
    }
  });

  const users = new Map();
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
    console.log(`📊 Total connected users: ${io.sockets.sockets.size}`); // Use logical socket count
    console.log(`📊 Current rooms:`, Array.from(rooms.keys()));

    // User joins a room
    socket.on('join-room', async ({ room, name }) => {
      console.log(`🚪 ${name} (${socket.id}) joining room: ${room}`);
      console.log(`📊 Current users in memory:`, users.size);
      console.log(`📊 Current rooms in memory:`, rooms.size);
      
      try {
        // Leave previous room if any
        const user = users.get(socket.id);
        if (user && user.room) {
          socket.leave(user.room);
          const roomUsers = rooms.get(user.room);
          if (roomUsers) {
            roomUsers.delete(socket.id);
            // Notify others in previous room
            socket.to(user.room).emit('user-left', {
              id: socket.id,
              name: user.name
            });
          }
        }

        // Join new room
        socket.join(room);
        
        // Update user info
        const userInfo = { id: socket.id, name, room };
        users.set(socket.id, userInfo);
        
        // Update room info
        if (!rooms.has(room)) {
          rooms.set(room, new Set());
        }
        rooms.get(room).add(socket.id);

        // Notify user they joined successfully
        socket.emit('joined-room', { room, users: Array.from(rooms.get(room) || []) });
        
        // Notify others in room
        socket.to(room).emit('user-joined', userInfo);
        
        console.log(`✅ ${name} successfully joined room: ${room}`);
        console.log(`📊 Room ${room} now has ${rooms.get(room)?.size || 0} users:`, Array.from(rooms.get(room) || []));
        console.log(`📊 All rooms:`, Object.fromEntries(Array.from(rooms.entries()).map(([k, v]) => [k, Array.from(v)])));
        
      } catch (error) {
        console.error('❌ Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle WebRTC signaling
    socket.on('webrtc-offer', ({ offer, targetId, room }) => {
      console.log(`📡 Relaying offer from ${socket.id} to ${targetId} in room ${room}`);
      socket.to(targetId).emit('webrtc-offer', { offer, senderId: socket.id });
    });

    socket.on('webrtc-answer', ({ answer, targetId, room }) => {
      console.log(`📡 Relaying answer from ${socket.id} to ${targetId} in room ${room}`);
      socket.to(targetId).emit('webrtc-answer', { answer, senderId: socket.id });
    });

    socket.on('webrtc-ice-candidate', ({ candidate, targetId, room }) => {
      console.log(`🧊 Relaying ICE candidate from ${socket.id} to ${targetId} in room ${room}`);
      socket.to(targetId).emit('webrtc-ice-candidate', { candidate, senderId: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      console.log(`📊 Total connected users after disconnect: ${io.sockets.sockets.size}`);
      
      const user = users.get(socket.id);
      if (user && user.room) {
        console.log(`🚪 User ${user.name} left room: ${user.room}`);
        const roomUsers = rooms.get(user.room);
        if (roomUsers) {
          roomUsers.delete(socket.id);
          // Notify others in room
          socket.to(user.room).emit('user-left', {
            id: socket.id,
            name: user.name
          });
          
          console.log(`📊 Room ${user.room} now has ${roomUsers.size} users`);
          
          // Clean up empty rooms
          if (roomUsers.size === 0) {
            rooms.delete(user.room);
            console.log(`🗑️ Deleted empty room: ${user.room}`);
          }
        }
      }
      users.delete(socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`> Ready on http://0.0.0.0:${port}`);
    });
});
