
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
    <div className="w-full h-64 bg-gray-800 border-b border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm">
          Online Users ({allUsers.length})
        </h3>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {allUsers.map((user) => (
          user.id === currentUserId ? (
            <div key={user.id} className="relative w-full h-full flex items-center justify-center">
              {/* Cam-Vorschau nimmt gesamte Fläche ein */}
              <video autoPlay muted className="w-full h-full object-cover rounded-lg border border-blue-400 shadow-lg bg-black" />
              {/* Overlay: User-Info-Leiste am unteren Rand */}
              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-60 flex items-center px-3 py-2 text-xs space-x-2 rounded-b-lg">
                <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold bg-blue-500 text-white mr-2">{user.name.charAt(0).toUpperCase()}</div>
                <span className="text-white font-medium truncate">{user.name}</span>
                <span title="Star" className="text-yellow-400">⭐</span>
                <span title="Rockstar" className="text-pink-400">🎸</span>
                <span className="text-blue-400 ml-1">(You)</span>
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                <span className="text-gray-400">Online</span>
              </div>
            </div>
          ) : (
            <div
              key={user.id}
              className={`p-3 border-b border-gray-700 flex items-center space-x-3 hover:bg-gray-700`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-600 text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate flex items-center space-x-2">
                  <span>{user.name}</span>
                  <span title="Star" className="text-yellow-400 text-lg">⭐</span>
                  <span title="Rockstar" className="text-pink-400 text-lg">🎸</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400 text-xs">Online</span>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="text-gray-400 text-xs text-center">
          Room participants
        </div>
      </div>
    </div>
  );
};
