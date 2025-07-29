'use client';

import type { ChatMessage } from '@/contexts/SocketContext';
import { useEffect, useRef, useState } from 'react';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  extraBottomSpace?: boolean;
}
export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading = false,
  extraBottomSpace = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Scroll-Handler für Toggle-Button
  useEffect(() => {
    const scrollEl = messagesScrollRef.current;
    if (!scrollEl) return;
    const handle = () => {
      // 20px Toleranz
      setAtBottom(scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 20);
    };
    scrollEl.addEventListener('scroll', handle);
    // Initial prüfen
    handle();
    return () => scrollEl.removeEventListener('scroll', handle);
  }, [messagesScrollRef]);

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
    // scrollbereich
    <div className={`flex-1 bg-gray-900 relative p-1 ${extraBottomSpace ? 'pb-28' : ''}`}>
      {/* Verbotene Zone oben, reserviert */}
      <div style={{ height: '40rem' }} />
      {/* Scroll-to-Top Button */}
      <div className="absolute left-0 right-0 top-0">
        {messages.length > 10 && (
          <div className="sticky top-0 z-30 flex justify-center pointer-events-auto" style={{paddingTop: '10.5rem'}}>
            {!atBottom ? (
              <button
                onClick={() => {
                  if (messagesScrollRef.current) {
                    messagesScrollRef.current.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: 'smooth' });
                  }
                }}
                className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs shadow hover:bg-gray-600 transition mt-2 cursor-pointer"
                type="button"
              >
                ↓ Neue Nachrichten anzeigen
              </button>
            ) : (
              <button
                onClick={() => {
                  if (messagesScrollRef.current) {
                    messagesScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="bg-gray-700 text-white px-3 py-1 rounded-full text-xs shadow hover:bg-gray-600 transition mt-2 cursor-pointer"
                type="button"
              >
                ↑ Alte Nachrichten anzeigen
              </button>
            )}
          </div>
        )}
        <div ref={messagesTopRef} style={{height: '2.5rem'}} />
      </div>
      {/* Nachrichtenliste startet exakt unterhalb der verbotenen Zone */}
      <div ref={messagesScrollRef} className="absolute left-0 right-0 scrollbar-hide" style={{ top: '16rem', bottom: 0, overflowY: 'auto' }}>
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
          <div className="space-y-4 flex flex-col">
            {Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Messages for this date (ohne Date-Separator) */}
                <div className="space-y-2 flex flex-col">
                  {dateMessages.map((message) => (
                    <div
                      key={message.id}
                      className="group"
                    >
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
                          {(typeof message.name === 'string' && message.name.length > 0)
                            ? message.name.charAt(0).toUpperCase()
                            : '?'}
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
    </div>
  );
}
