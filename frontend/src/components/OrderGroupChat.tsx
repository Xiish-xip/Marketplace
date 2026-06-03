import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../lib/socket';
import { useAuthStore } from '../lib/auth-store';
import { api } from '../lib/api-enhanced';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  content: string;
  attachments?: string[];
  timestamp: string;
}

interface OrderGroupChatProps {
  orderId: string;
  className?: string;
  maxHeight?: string;
  participantName?: string;
}

function OrderGroupChat({ orderId, className = '', maxHeight = '400px', participantName }: OrderGroupChatProps) {
  const { socket } = useSocket();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load past messages from the backend
  useEffect(() => {
    if (!orderId) return;
    setIsLoading(true);
    api
      .get(`/orders/${orderId}/messages`)
      .then((res) => {
        const raw = res.data?.data || res.data?.messages || [];
        const mapped: ChatMessage[] = raw.map((m: any) => ({
          id: m.id,
          senderId: m.senderId || m.sender?.id,
          senderName: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() || 'Unknown' : 'Unknown',
          senderRole: 'CUSTOMER',
          content: m.content,
          attachments: m.attachments ? (typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments) : [],
          timestamp: m.createdAt,
        }));
        setMessages(mapped);
      })
      .catch(() => {
        // Silently fail — chat works via WebSocket even without history endpoint
      })
      .finally(() => setIsLoading(false));
  }, [orderId]);

  // Join the order chat room on socket connect
  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join-order-chat', orderId);

    // Listen for new group chat messages
    const handleOrderChatMessage = (data: any) => {
      if (data.orderId === orderId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === data.id || (m.content === data.content && m.senderId === data.senderId && Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 1000))) {
            return prev;
          }
          return [...prev, {
            id: data.id || crypto.randomUUID(),
            senderId: data.senderId,
            senderName: data.senderName || 'Unknown',
            senderRole: data.senderRole || 'CUSTOMER',
            content: data.content,
            attachments: data.attachments,
            timestamp: data.timestamp,
          }];
        });
      }
    };

    // Listen for typing indicators
    const handleTypingIndicator = (data: any) => {
      if (data.orderId === orderId) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            const exists = prev.some((u) => u.userId === data.userId);
            if (!exists) return [...prev, { userId: data.userId, userName: data.userName || 'Someone' }];
            return prev;
          }
          return prev.filter((u) => u.userId !== data.userId);
        });
      }
    };

    socket.on('order-chat-message', handleOrderChatMessage);
    socket.on('order-chat-typing-indicator', handleTypingIndicator);

    return () => {
      socket.off('order-chat-message', handleOrderChatMessage);
      socket.off('order-chat-typing-indicator', handleTypingIndicator);
      socket.emit('leave-order-chat', orderId);
    };
  }, [socket, orderId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = useCallback(() => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socket || !user) return;

    const msgData = {
      orderId,
      senderId: user.id,
      senderName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
      senderRole: user.role || 'CUSTOMER',
      content: trimmed,
      attachments: [],
    };

    socket.emit('send-order-chat-message', msgData);

    // Optimistically add to messages
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        senderId: msgData.senderId,
        senderName: msgData.senderName,
        senderRole: msgData.senderRole,
        content: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);

    setNewMessage('');
    handleStopTyping();
  }, [newMessage, socket, user, orderId]);

  const handleTyping = useCallback(() => {
    if (!socket || !user) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('order-chat-typing', {
        orderId,
        userId: user.id,
        userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
        isTyping: true,
      });
    }
    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => handleStopTyping(), 2000);
  }, [socket, user, orderId, isTyping]);

  const handleStopTyping = useCallback(() => {
    if (!socket || !user || !isTyping) return;
    setIsTyping(false);
    socket.emit('order-chat-typing', {
      orderId,
      userId: user.id,
      isTyping: false,
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, user, orderId, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'DELIVERY': return 'Driver';
      case 'SELLER': return 'Seller';
      case 'CUSTOMER': return 'Customer';
      case 'ADMIN':
      case 'SUPER_ADMIN': return 'Admin';
      default: return role || 'User';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toUpperCase()) {
      case 'DELIVERY': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'SELLER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'CUSTOMER': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'ADMIN':
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const isOwnMessage = (msg: ChatMessage) => msg.senderId === user?.id;

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Order Chat</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          📦 Order #{orderId.slice(0, 8)}... — Chat with everyone involved in this order
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const showSender = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
            return (
              <div key={msg.id || idx} className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOwnMessage(msg) ? 'order-1' : 'order-2'}`}>
                  {showSender && (
                    <div className={`flex items-center gap-1.5 mb-1 ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(msg.senderRole)}`}>
                        {getRoleLabel(msg.senderRole)}
                      </span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {msg.senderName}
                      </span>
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-2xl ${
                    isOwnMessage(msg)
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${isOwnMessage(msg) ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {typingUsers.map((u) => u.userName).join(', ')} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleStopTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderGroupChat;