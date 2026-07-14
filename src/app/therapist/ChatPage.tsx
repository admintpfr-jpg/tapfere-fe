import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Shield, MessageSquare, ChevronRight, ArrowLeft, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '../../lib/socket';
import { toast } from 'react-toastify';

const formatMsgDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender: { id: string; name: string; displayName?: string; avatar?: string };
}

interface Conversation {
  id: string;
  therapist: { id: string; name: string; displayName?: string; avatar?: string; email?: string };
  client: { id: string; name: string; displayName?: string; avatar?: string; email: string; role?: string };
  messages: Message[];
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function TherapistChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'patients' | 'admin'>('patients');

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    socket.connect();

    // Re-join all rooms on every (re)connect so messages arrive without having to click a conversation
    socket.on('connect', () => {
      conversationsRef.current.forEach(conv => socket.emit('joinRoom', conv.id));
    });

    socket.on('newMessage', (message: Message) => {
      if (activeConvRef.current && message.conversationId === activeConvRef.current.id) {
        setMessages(prev => [...prev, message]);
      }
      setConversations(prev => prev.map(c =>
        c.id === message.conversationId ? { ...c, messages: [message] } : c
      ));
    });

    fetchConversations().then(data => {
      data.forEach((conv: Conversation) => socket.emit('joinRoom', conv.id));
    });

    return () => {
      socket.off('connect');
      socket.off('newMessage');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${apiUrl}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConversations(data);
      return data as Conversation[];
    } catch {
      toast.error('Failed to load patient conversations');
      return [] as Conversation[];
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    socket.emit('joinRoom', conv.id);
    try {
      const res = await fetch(`${apiUrl}/chat/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(await res.json());
    } catch {
      toast.error('Failed to load history');
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConv) return;
    socket.emit('sendMessage', {
      conversationId: activeConv.id,
      senderId: currentUser.id,
      content: newMessage.trim()
    }, () => setNewMessage(''));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f2f5]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#1cb78d] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500 font-medium tracking-tight">Accessing Clinical Portal...</p>
        </div>
      </div>
    );
  }

  const isSupportChannel = activeConv?.therapist.email === 'support@tapfere.com';

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-[Inter,sans-serif]">

      {/* Nav column — desktop only */}
      <div className="hidden md:flex w-[80px] bg-white border-r border-gray-100 flex-col items-center py-6 shadow-sm z-20 flex-shrink-0">
        <div className="w-10 h-10 bg-[#0f385a] rounded-[0.8rem] flex items-center justify-center mb-10 shadow-md">
          <span className="text-white font-extrabold text-[15px] tracking-tight">T</span>
        </div>
        <div className="flex-1 flex flex-col gap-7 w-full items-center">
          <div className="relative">
            <button className="w-[50px] h-[50px] bg-[#0f385a] text-white rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-[#0f385a]/30">
              <MessageSquare size={22} fill="currentColor" strokeWidth={0} />
            </button>
            <div className="absolute -left-[16px] top-1/2 -translate-y-1/2 w-[4px] h-10 bg-[#1cb78d] rounded-r-full" />
          </div>
        </div>
        <div className="mt-auto">
          <div className="w-11 h-11 rounded-2xl border border-gray-200 shadow-sm bg-[#0f385a]/10 flex items-center justify-center">
            <span className="text-[13px] font-extrabold text-[#0f385a]">{initials(currentUser.name || 'Me')}</span>
          </div>
        </div>
      </div>

      {/* Sidebar — full width on mobile when no active conv */}
      <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] lg:w-[380px] bg-[#F9FAFB] flex-col h-full z-10 flex-shrink-0`}>
        <div className="p-5 md:p-7 pb-4">
          <h1 className="text-2xl md:text-[26px] font-extrabold text-gray-900 tracking-tight mb-5">Messages</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setTab('patients'); setSearch(''); }}
              className={`px-4 py-1.5 text-[13px] font-bold rounded-full transition-all ${tab === 'patients' ? 'bg-[#0f385a] text-white shadow-md shadow-[#0f385a]/20' : 'bg-gray-200/60 text-gray-600 hover:bg-gray-200'}`}
            >Patients</button>
            <button
              onClick={() => { setTab('admin'); setSearch(''); }}
              className={`px-4 py-1.5 text-[13px] font-bold rounded-full transition-all ${tab === 'admin' ? 'bg-[#0f385a] text-white shadow-md shadow-[#0f385a]/20' : 'bg-gray-200/60 text-gray-600 hover:bg-gray-200'}`}
            >Admin</button>
          </div>
        </div>

        <div className="px-4 md:px-5 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder={tab === 'patients' ? 'Search patients...' : 'Search admins...'}
              className="w-full bg-white border border-gray-100 pl-10 pr-4 py-2.5 rounded-2xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all shadow-sm placeholder-gray-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-4 space-y-1.5 custom-scrollbar">
          {(() => {
            const filtered = conversations
              .filter(c => tab === 'admin' ? c.client.role === 'admin' : c.client.role !== 'admin')
              .filter(c => (c.client.displayName || c.client.name).toLowerCase().includes(search.toLowerCase()));

            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center mt-10">
                  <Shield size={28} className="text-[#1cb78d] mx-auto mb-4" />
                  {tab === 'patients' ? (
                    <>
                      <p className="text-[16px] font-bold text-gray-900">No patients assigned</p>
                      <p className="text-[13px] text-gray-400 mt-1">Your administrator will assign patients soon</p>
                    </>
                  ) : (
                    <p className="text-[16px] font-bold text-gray-900">No admin conversations</p>
                  )}
                </div>
              );
            }

            return filtered.map(conv => {
              const lastMsg = conv.messages?.[0];
              const isActive = activeConv?.id === conv.id;
              const name = conv.client.displayName || conv.client.name;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`flex items-center p-3.5 rounded-2xl cursor-pointer transition-all border border-transparent
                    ${isActive ? 'bg-[#0f385a] text-white shadow-lg shadow-[#0f385a]/25' : 'bg-transparent text-gray-900 hover:bg-white hover:shadow-sm hover:border-gray-100'}`}
                >
                  <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center text-[13px] font-extrabold flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-[#0f385a]/10 text-[#0f385a]'}`}>
                    {initials(name)}
                  </div>
                  <div className="ml-3.5 flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className={`text-[14px] font-bold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
                      <span className={`text-[11px] font-bold flex-shrink-0 ml-2 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                        {lastMsg ? formatDistanceToNow(new Date(lastMsg.createdAt)) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-[12.5px] font-medium truncate flex-1 pr-3 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                        {lastMsg?.senderId === currentUser.id ? 'You: ' : ''}{lastMsg?.content || 'Click to start...'}
                      </p>
                      {lastMsg && <Check size={14} className={isActive ? 'text-white/60' : 'text-[#1cb78d]'} strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Chat area — full width on mobile when conv is active */}
      <div className={`${!activeConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-white relative md:rounded-tl-[40px] md:shadow-[-10px_0_40px_rgba(0,0,0,0.03)] border-l border-gray-100 z-30 overflow-hidden`}>
        {activeConv ? (
          <>
            {/* Header */}
            <div className="px-4 md:px-8 py-4 flex items-center gap-3 border-b border-gray-100/60 bg-white/80 backdrop-blur-md z-20">
              <button
                className="md:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                onClick={() => setActiveConv(null)}
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              <div className="w-[42px] h-[42px] rounded-[14px] bg-[#0f385a]/10 flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-[14px] font-extrabold text-[#0f385a]">
                  {initials(activeConv.client.displayName || activeConv.client.name)}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] md:text-[17px] font-extrabold text-gray-900 leading-tight truncate">
                  {activeConv.client.displayName || activeConv.client.name}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{activeConv.client.role === 'admin' ? 'Administrator' : 'Patient'}</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-14 lg:px-20 py-6 space-y-5 select-text scroll-smooth custom-scrollbar bg-white">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === currentUser.id;
                const prev = messages[i - 1];
                const showDate = !prev || new Date(prev.createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
                return (
                  <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center py-1">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {formatMsgDate(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] px-4 md:px-5 py-3 shadow-sm text-[14px] md:text-[15px] font-medium leading-relaxed
                      ${isMe ? 'bg-[#0f385a] text-white rounded-[20px] rounded-br-[6px]' : 'bg-[#F3F4F6] text-gray-800 rounded-[20px] rounded-bl-[6px]'}`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 px-2">
                      <span className="text-[11px] text-gray-400 font-bold tracking-wide">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {isMe && <Check size={13} strokeWidth={3} className="text-[#1cb78d]" />}
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Input */}
            <div className="px-3 md:px-14 lg:px-20 pb-4 md:pb-8 pt-2 bg-white">
              {isSupportChannel ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-[24px] border border-gray-200 shadow-sm">
                  <p className="text-[13px] text-gray-500 font-bold flex items-center gap-2 text-center">
                    <Shield size={16} className="text-gray-400 flex-shrink-0" />
                    Tapfere Support announcement channel. Replies are disabled.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 shadow-[0_5px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-2 focus-within:shadow-[0_8px_40px_rgba(28,183,141,0.08)] focus-within:border-[#1cb78d] transition-all flex flex-col">
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder={activeConv.client.role === 'admin' ? 'Message admin...' : 'Respond to patient...'}
                    className="w-full bg-transparent border-none outline-none resize-none px-4 py-2 text-[14px] md:text-[15px] font-medium text-gray-800 placeholder-gray-400 h-10 custom-scrollbar"
                  />
                  <div className="flex justify-end items-center mt-1 px-3 pb-2 pt-1 border-t border-gray-50/50">
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-[#0f385a] hover:bg-[#0c2e48] disabled:bg-[#0f385a]/40 text-white font-extrabold text-[13px] md:text-[14px] rounded-[12px] transition-all shadow-md shadow-[#0f385a]/20 cursor-pointer"
                    >
                      Send <ChevronRight size={15} strokeWidth={3} className="opacity-80" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 select-none bg-white">
            <div className="max-w-md w-full text-center">
              <div className="inline-flex w-24 h-24 bg-[#1cb78d]/10 rounded-[28px] items-center justify-center mb-8 shadow-sm">
                <Users size={40} className="text-[#1cb78d]" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-3">Select a Patient</h2>
              <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
                Choose a patient from the sidebar to view their history and send secure clinical messages.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
