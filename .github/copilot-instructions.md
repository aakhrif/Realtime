# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js real-time video chat application with the following tech stack:
- **Frontend**: Next.js 15 with React, TypeScript, Tailwind CSS
- **Real-time Communication**: Socket.IO for signaling
- **Video/Audio**: WebRTC with simple-peer library
- **Room-based**: Users can join/leave video chat rooms

## Key Features
- Video and audio calling with WebRTC
- Screen sharing capabilities
- Room-based chat system
- Responsive design with Tailwind CSS
- TypeScript for type safety

## Architecture
- **API Routes**: Next.js API routes handle Socket.IO server
- **Custom Hooks**: React hooks for WebRTC and Socket.IO logic
- **Components**: Modular video chat components
- **Real-time Events**: Socket.IO events for user management and WebRTC signaling

## Guidelines
- Use TypeScript strictly with proper type definitions
- Follow React best practices with hooks and functional components
- Implement proper error handling for WebRTC connections
- Use Tailwind CSS for styling with responsive design
- Handle browser permissions for camera/microphone access
- Implement proper cleanup for WebRTC connections and socket listeners
