'use client';

import { UserInfo } from '@/hooks/useSocket';

interface UserListProps {
  users: UserInfo[];
  currentUserId: string;
  currentUserName: string;
}

export const UserList: React.FC<UserListProps> = ({ 
  users, 
  currentUserId, 
  currentUserName 
}) => {
  const allUsers = [
    { id: currentUserId, name: currentUserName, room: '' }, // Current user
    ...users.filter(user => user.id !== currentUserId) // Other users
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
          <div
            key={user.id}
            className={`p-3 border-b border-gray-700 flex items-center space-x-3 ${
              user.id === currentUserId ? 'bg-blue-900 bg-opacity-30' : 'hover:bg-gray-700'
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              user.id === currentUserId ? 'bg-blue-500' : 'bg-gray-600'
            } text-white`}>
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {user.name}
                {user.id === currentUserId && (
                  <span className="text-blue-400 text-xs ml-1">(You)</span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                {/* Online Status */}
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-400 text-xs">Online</span>
              </div>
            </div>

            {/* Media Status Icons */}
            <div className="flex space-x-1">
              {/* Video Icon as Action Button */}
              <button
                className="w-5 h-5 text-gray-400 hover:text-blue-500 focus:outline-none cursor-pointer"
                title={user.id === currentUserId ? 'Toggle Camera' : 'Camera status'}
                onClick={user.id === currentUserId ? () => {/* TODO: Implement camera toggle */} : undefined}
                disabled={user.id !== currentUserId}
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </button>

              {/* Audio Icon as Action Button */}
              <button
                className="w-5 h-5 text-gray-400 hover:text-blue-500 focus:outline-none cursor-pointer"
                title={user.id === currentUserId ? 'Toggle Microphone' : 'Microphone status'}
                onClick={user.id === currentUserId ? () => {/* TODO: Implement mic toggle */} : undefined}
                disabled={user.id !== currentUserId}
              >
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
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
