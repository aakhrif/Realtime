#!/bin/sh

# Start Socket.IO Server im Hintergrund
echo "🚀 Starting Socket.IO Server on port 3001..."
node src/server/socket-server.js &

# Start Next.js App
echo "🚀 Starting Next.js App on port 3000..."
node server.js
