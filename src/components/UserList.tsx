
"use client";
import React, { useRef, useEffect } from "react";
// ...existing code...
import type { PeerConnection } from "@/hooks/useWebRTC";

interface User {
  id: string;
  name: string;
  room?: string;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  peers: Map<string, PeerConnection>;
  localStream?: MediaStream | null;
}

interface UserListItemProps {
  user: User;
  currentUserId: string;
  stream?: MediaStream | null;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, currentUserId, stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Prüfe, ob ein aktives Video-Track vorhanden und enabled ist
  const isVideoActive = !!stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

  return (
    <div className="relative w-full h-40 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 shadow">
      {/* Cam-Vorschau für jeden User */}
      <video
        ref={videoRef}
        autoPlay
        muted
        className="w-full h-full object-cover rounded-lg bg-black"
        style={{ display: isVideoActive ? 'block' : 'none' }}
      />
      {/* Kamera aus Overlay */}
      {!isVideoActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camera-off.svg" alt="Camera off" width={64} height={64} className="mb-2 opacity-80" />
          <div className="text-white text-center">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-gray-400">Kamera aus</p>
          </div>
        </div>
      )}
      {/* Overlay: User-Info-Leiste am unteren Rand */}
      <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 flex items-center px-3 py-2 text-xs space-x-2 rounded-b-lg">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${user.id === currentUserId ? "bg-blue-500" : "bg-gray-600"} text-white mr-2`}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-white font-medium truncate">{user.name}</span>
        <span title="Star" className="text-yellow-400">⭐</span>
        <span title="Rockstar" className="text-pink-400">🎸</span>
        {user.id === currentUserId && <span className="text-blue-400 ml-1">(You)</span>}
        <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
        <span className="text-gray-400">Online</span>
      </div>
    </div>
  );
};

export const UserList: React.FC<UserListProps> = ({ users, currentUserId, peers, localStream }) => {
  return (
    <div className="w-full h-full bg-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-semibold text-sm">
          Online Users ({users.length})
        </h3>
      </div>
      {/* User List */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col space-y-4 p-2">
        {users.map((user) => (
          <UserListItem
            key={user.id}
            user={user}
            currentUserId={currentUserId}
            stream={user.id === currentUserId ? localStream : peers.get(user.id)?.stream}
          />
        ))}
      </div>
    </div>
  );
}
