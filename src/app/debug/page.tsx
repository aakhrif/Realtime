'use client';

import { SocketTest } from '@/components/SocketTest';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          🐛 Socket.IO Debug
        </h1>
        <SocketTest />
      </div>
    </div>
  );
}
