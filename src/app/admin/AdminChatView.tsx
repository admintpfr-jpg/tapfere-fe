import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, MessageSquare, Shield, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export default function AdminChatView() {
  const { role, userId } = useParams<{ role: string; userId: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/chat/admin/user/${userId}/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load conversations');
        const data: Conversation[] = await res.json();
        setConversations(data);
        if (data.length > 0) selectConversation(data[0]);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
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

  const backPath = role === 'client' ? '/admin/patients' : '/admin/therapists';

  const getPartnerName = (conv: Conversation) =>
    role === 'client'
      ? conv.therapist.displayName || conv.therapist.name
      : conv.client.displayName || conv.client.name;

  const getPartnerAvatar = (conv: Conversation) =>
    role === 'client'
      ? conv.therapist.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.therapist.displayName || conv.therapist.name)}&background=f3f4f6&color=4b5563`
      : conv.client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.client.displayName || conv.client.name)}&background=f3f4f6&color=4b5563`;

  const subjectName =
    conversations.length > 0
      ? role === 'client'
        ? conversations[0].client.displayName || conversations[0].client.name
        : conversations[0].therapist.displayName || conversations[0].therapist.name
      : role === 'client' ? 'Patient' : 'Therapist';

  const filteredConversations = conversations.filter(c =>
    getPartnerName(c).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-0 -m-4 md:-m-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
            ${role === 'client' ? 'bg-blue-50 text-blue-600' : 'bg-[#1cb78d]/10 text-[#1cb78d]'}`}>
            {subjectName.charAt(0)}
          </div>
          <h1 className="text-[15px] font-bold text-gray-900">{subjectName}</h1>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border
            ${role === 'client' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-[#1cb78d]/10 text-[#1cb78d] border-[#1cb78d]/20'}">
            {role === 'client' ? 'Patient' : 'Therapist'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-[11px] text-gray-400 font-semibold">
          <Shield size={13} />
          Read-only monitoring
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile when chat is active */}
        <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-[280px] lg:w-[300px] flex-shrink-0 border-r border-gray-100 bg-gray-50/30 flex-col`}>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${role === 'client' ? 'therapists' : 'patients'}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-[12px] outline-none focus:border-[#1cb78d] focus:ring-2 focus:ring-[#1cb78d]/10 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Loader2 className="animate-spin text-[#1cb78d]" size={20} />
                <p className="text-[11px] text-gray-400">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-4">
                <MessageSquare size={24} className="text-gray-300" />
                <p className="text-[12px] text-gray-400 font-medium">No conversations found</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = activeConv?.id === conv.id;
                const partnerName = getPartnerName(conv);
                const lastMsg = conv.messages?.[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border
                      ${isActive
                        ? 'bg-[#0f385a] border-transparent shadow-md shadow-[#0f385a]/20'
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                  >
                    <img
                      src={getPartnerAvatar(conv)}
                      className="w-10 h-10 rounded-[12px] object-cover flex-shrink-0 bg-gray-100"
                      alt={partnerName}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className={`text-[13px] font-bold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>{partnerName}</p>
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

        {/* Chat area — hidden on mobile when no active conv */}
        <div className={`${!activeConv ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white overflow-hidden`}>
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-white flex-shrink-0">
                <button
                  className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setActiveConv(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <img
                  src={getPartnerAvatar(activeConv)}
                  className="w-9 h-9 rounded-[10px] object-cover bg-gray-100"
                  alt={getPartnerName(activeConv)}
                />
                <div>
                  <p className="text-[14px] font-bold text-gray-900 leading-tight">{getPartnerName(activeConv)}</p>
                  <p className="text-[11px] text-gray-400">
                    {role === 'client' ? activeConv.therapist.email : activeConv.client.email}
                  </p>
                </div>
                <div className="ml-auto px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Admin View — Read Only</p>
                </div>
              </div>

              {/* Messages */}
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="animate-spin text-[#1cb78d]" size={24} />
                </div>
              ) : (
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-8 md:px-16 py-6 space-y-4 bg-white"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <MessageSquare size={32} className="text-gray-200" />
                      <p className="text-[13px] text-gray-400 font-medium">No messages in this conversation yet</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isClient = msg.senderId === activeConv.client.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                          <div className={`flex items-end gap-2 ${isClient ? 'flex-row' : 'flex-row-reverse'}`}>
                            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold
                              ${isClient ? 'bg-blue-100 text-blue-600' : 'bg-[#1cb78d]/15 text-[#1cb78d]'}`}>
                              {(isClient
                                ? (activeConv.client.displayName || activeConv.client.name)
                                : (activeConv.therapist.displayName || activeConv.therapist.name)
                              ).charAt(0)}
                            </div>
                            <div className={`max-w-[65%] px-4 py-3 rounded-2xl text-[14px] font-medium leading-relaxed shadow-sm
                              ${isClient
                                ? 'bg-[#f0f2f5] text-gray-800 rounded-bl-[6px]'
                                : 'bg-[#0f385a] text-white rounded-br-[6px]'
                              }`}>
                              {msg.content}
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-8 ${isClient ? '' : 'flex-row-reverse'}`}>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span className={`text-[10px] font-bold ${isClient ? 'text-blue-500' : 'text-[#1cb78d]'}`}>
                              · {isClient ? (activeConv.client.displayName || activeConv.client.name) : (activeConv.therapist.displayName || activeConv.therapist.name)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Read-only footer */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 text-[12px] text-gray-400 font-medium">
                  <Shield size={13} className="text-gray-300" />
                  This conversation is monitored for clinical quality assurance. Replies are disabled for admin accounts.
                </div>
              </div>
            </>
          ) : !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                <MessageSquare size={28} className="text-gray-300" />
              </div>
              <p className="text-[15px] font-bold text-gray-600">Select a conversation</p>
              <p className="text-[13px] text-gray-400 max-w-xs leading-relaxed">
                Choose a conversation from the sidebar to view the full message history.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
