'use client';

import { ChatMessage } from '@/hooks/useSocket';
import { useEffect, useRef } from 'react';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  messages, 
  isLoading = false 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('de-DE');
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 bg-gray-900 overflow-y-auto p-4">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-center">
            <div className="animate-pulse">Loading chat history...</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-center">
            <div className="text-4xl mb-4">💬</div>
            <div className="text-lg font-medium mb-2">No messages yet</div>
            <div className="text-sm">Start the conversation!</div>
          </div>
        </div>
      )}

      {/* Messages */}
      {!isLoading && messages.length > 0 && (
        <div className="space-y-4">
          {Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
                  {date}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages.map((message) => (
                  <div key={message.id} className="group">
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0
                          ${message.name === 'System'
                            ? message.type === 'error' || message.type === 'leave'
                              ? 'bg-rose-300' // sanftes Rot
                              : message.type === 'join'
                                ? 'bg-emerald-300' // sanftes Grün
                                : 'bg-gray-500'
                            : 'bg-blue-500'}
                        `}
                      >
                        {message.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span
                            className={`font-medium text-sm
                              ${message.name === 'System'
                                ? message.type === 'error' || message.type === 'leave'
                                  ? 'text-rose-500'
                                  : message.type === 'join'
                                    ? 'text-emerald-600'
                                    : 'text-gray-300'
                                : 'text-white'}
                            `}
                          >
                            {message.name}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>

                        {/* Message Text */}
                        <div
                          className={`text-sm break-words
                            ${message.name === 'System'
                              ? message.type === 'error' || message.type === 'leave'
                                ? 'text-rose-500'
                                : message.type === 'join'
                                  ? 'text-emerald-600'
                                  : 'text-gray-200'
                              : 'text-gray-200'}
                          `}
                        >
                          {message.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};
