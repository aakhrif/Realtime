
'use client';
import React from 'react';
import { UserInfo } from '@/hooks/useSocket';

interface UserListProps {
  users: UserInfo[];
  currentUserId: string;
}


export const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {

  // ...keine lokale Media-State mehr, alle User kommen aus props...
  const allUsers = [
    ...users
  ];

  return (
    <div className="w-full h-full bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm">
          Online Users ({allUsers.length})
        </h3>
      </div>
      {/* User List */}
      <div className="flex-1 overflow-y-auto flex flex-col space-y-4 p-2">
        {allUsers.map((user) => (
          <div key={user.id} className="relative w-full h-40 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 shadow">
            {/* Cam-Vorschau für jeden User */}
            <video autoPlay muted className="w-full h-full object-cover rounded-lg bg-black" />
            {/* Overlay: User-Info-Leiste am unteren Rand */}
            <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 flex items-center px-3 py-2 text-xs space-x-2 rounded-b-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${user.id === currentUserId ? 'bg-blue-500' : 'bg-gray-600'} text-white mr-2`}>{user.name.charAt(0).toUpperCase()}</div>
              <span className="text-white font-medium truncate">{user.name}</span>
              <span title="Star" className="text-yellow-400">⭐</span>
              <span title="Rockstar" className="text-pink-400">🎸</span>
              {user.id === currentUserId && <span className="text-blue-400 ml-1">(You)</span>}
              <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
              <span className="text-gray-400">Online</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
