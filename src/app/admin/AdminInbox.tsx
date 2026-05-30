import { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, Shield, Check, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '../../lib/socket';
import { toast } from 'react-toastify';

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
  client: { id: string; name: string; displayName?: string; avatar?: string; email?: string };
  messages: Message[];
}

export default function AdminInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [supportUserId, setSupportUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
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

    // Re-join all rooms on every (re)connect
    socket.on('connect', () => {
      conversationsRef.current.forEach(conv => socket.emit('joinRoom', conv.id));
    });

    socket.on('newMessage', (message: Message) => {
      if (activeConvRef.current && message.conversationId === activeConvRef.current.id) {
        setMessages(prev => [...prev, message]);
      }
      setConversations(prev =>
        prev.map(c => c.id === message.conversationId ? { ...c, messages: [message] } : c)
      );
    });

    fetchSupportConversations().then(convs => {
      convs.forEach(conv => socket.emit('joinRoom', conv.id));
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

  const fetchSupportConversations = async () => {
    try {
      const res = await fetch(`${apiUrl}/chat/admin/support/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setSupportUserId(data.supportUserId);
      setConversations(data.conversations);
      if (data.conversations.length > 0) selectConversation(data.conversations[0], data.supportUserId);
      return data.conversations as Conversation[];
    } catch (e: any) {
      toast.error(e.message);
      return [] as Conversation[];
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: Conversation, supId?: string | null) => {
    setActiveConv(conv);
    socket.emit('joinRoom', conv.id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`${apiUrl}/chat/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load messages');
      setMessages(await res.json());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = () => {
    if (!newMessage.trim() || !activeConv || !supportUserId) return;
    socket.emit('sendMessage', {
      conversationId: activeConv.id,
      senderId: supportUserId,
      content: newMessage.trim(),
    }, () => setNewMessage(''));
  };

  const clientName = (conv: Conversation) =>
    conv.client.displayName || conv.client.name;

  const clientInitial = (conv: Conversation) =>
    clientName(conv).charAt(0).toUpperCase();

  const filtered = conversations.filter(c =>
    clientName(c).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-[#1cb78d]" size={24} />
        <p className="text-[12px] text-gray-400">Loading support inbox...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-0 -m-4 md:-m-6 overflow-hidden">

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[320px] flex-shrink-0 border-r border-gray-100 bg-white flex-col`}>

          {/* Sidebar header */}
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-[#1cb78d]/10 flex items-center justify-center">
                <MessageSquare size={16} className="text-[#1cb78d]" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-gray-900 leading-tight">Support Inbox</h1>
                <p className="text-[10px] text-gray-400 font-semibold">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[12px] outline-none focus:border-[#1cb78d] focus:ring-2 focus:ring-[#1cb78d]/10 transition-all"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                <MessageSquare size={24} className="text-gray-200" />
                <p className="text-[12px] text-gray-400 font-medium">No support messages yet</p>
              </div>
            ) : (
              filtered.map(conv => {
                const isActive = activeConv?.id === conv.id;
                const lastMsg = conv.messages?.[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border cursor-pointer
                      ${isActive
                        ? 'bg-[#0f385a] border-transparent shadow-md shadow-[#0f385a]/15'
                        : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-[12px] flex-shrink-0 flex items-center justify-center text-[13px] font-extrabold
                      ${isActive ? 'bg-white/20 text-white' : 'bg-[#0f385a]/10 text-[#0f385a]'}`}>
                      {clientInitial(conv)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className={`text-[13px] font-bold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {clientName(conv)}
                        </p>
                        {lastMsg && (
                          <span className={`text-[10px] font-semibold flex-shrink-0 ml-1 ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                            {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11.5px] truncate ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                        {lastMsg?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${!activeConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white overflow-hidden`}>
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <button
                  className="md:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setActiveConv(null)}
                >
                  ←
                </button>
                <div className="w-9 h-9 rounded-[10px] bg-[#0f385a]/10 flex items-center justify-center text-[13px] font-extrabold text-[#0f385a] flex-shrink-0">
                  {clientInitial(activeConv)}
                </div>
                <div>
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">{clientName(activeConv)}</p>
                  <p className="text-[11px] text-[#1cb78d] font-semibold">Tapfere Support</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#1cb78d]/10 rounded-xl">
                  <Shield size={11} className="text-[#1cb78d]" />
                  <span className="text-[10px] font-bold text-[#1cb78d] uppercase tracking-wide">Secure channel</span>
                </div>
              </div>

              {/* Messages */}
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#1cb78d]" size={22} />
                </div>
              ) : (
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-6 md:px-14 py-6 space-y-4 bg-white"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <MessageSquare size={32} className="text-gray-200" />
                      <p className="text-[13px] text-gray-400 font-medium">No messages yet</p>
                      <p className="text-[12px] text-gray-300">The client hasn't reached out yet</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isSupport = msg.senderId === supportUserId;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[72%] px-4 py-3 rounded-2xl text-[14px] font-medium leading-relaxed shadow-sm
                            ${isSupport
                              ? 'bg-[#0f385a] text-white rounded-br-[6px]'
                              : 'bg-[#f0f2f5] text-gray-800 rounded-bl-[6px]'
                            }`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-1 ${isSupport ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold ${isSupport ? 'text-[#1cb78d]' : 'text-gray-400'}`}>
                              · {isSupport ? 'Tapfere Support' : clientName(activeConv)}
                            </span>
                            {isSupport && <Check size={11} strokeWidth={3} className="text-[#1cb78d]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Reply input */}
              <div className="px-6 md:px-14 pb-6 pt-3 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:border-[#1cb78d] focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(28,183,141,0.08)] transition-all flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                    }}
                    placeholder="Reply as Tapfere Support..."
                    className="flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-[14px] font-medium text-gray-800 placeholder-gray-400 min-h-[44px] max-h-[120px] custom-scrollbar"
                    rows={1}
                  />
                  <button
                    onClick={sendReply}
                    disabled={!newMessage.trim() || !supportUserId}
                    className="flex-shrink-0 p-2.5 bg-[#0f385a] hover:bg-[#0c2e48] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Send size={16} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-2 px-1">
                  Replies are sent as <span className="font-bold text-[#1cb78d]">Tapfere Support</span> — visible to the client.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
              <div className="w-16 h-16 bg-[#1cb78d]/10 rounded-2xl flex items-center justify-center">
                <MessageSquare size={28} className="text-[#1cb78d]" />
              </div>
              <p className="text-[15px] font-bold text-gray-700">Select a conversation</p>
              <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">
                Choose a client message from the sidebar to view and reply.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
