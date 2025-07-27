'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type a message..." 
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Simple typing indicator logic
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (value.length === 0 && isTyping) {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-16 bg-gray-800 border-t border-gray-700 px-4 flex items-center space-x-3">
      {/* Emoji Button (placeholder for future) */}
      <button 
        className="text-gray-400 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-700"
        title="Add emoji"
        disabled={disabled}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Message Input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={disabled ? "Chat disabled" : placeholder}
          disabled={disabled}
          className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-800 disabled:text-gray-500"
          maxLength={500}
        />
        
        {/* Character count */}
        {message.length > 400 && (
          <div className="absolute -top-6 right-0 text-xs text-gray-400">
            {message.length}/500
          </div>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors flex items-center justify-center"
        title="Send message"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </button>

      {/* File Upload Button (placeholder for future) */}
      <button 
        className="text-gray-400 hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-700"
        title="Attach file"
        disabled={disabled}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
