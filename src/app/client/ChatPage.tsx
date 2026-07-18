import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Shield, User, MessageSquare, ChevronRight, ArrowLeft, Link, Copy, ExternalLink, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { socket } from '../../lib/socket';
import { toast } from 'react-toastify';
import MessageTicks, { type MessageStatus } from '../../components/chat/MessageTicks';
import { formatPresence } from '../../lib/presence';

const formatMsgDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const CopyLinkButton = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!', { autoClose: 1000, position: 'top-right' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center p-1 rounded transition-colors ml-1.5 ${
        isMe
          ? 'bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white'
          : 'bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-700'
      }`}
      title="Copy Link"
    >
      {copied ? <Check size={12} className="text-[#1cb78d]" /> : <Copy size={12} />}
    </button>
  );
};

const parseLinks = (text: string, isMe: boolean) => {
  if (!text) return text;
  const regex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s]+)/gi;
  const parts: (string | { text: string; url: string })[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const index = match.index;
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }
    
    const isMarkdown = !!match[1];
    const linkText = isMarkdown ? match[1] : match[3];
    const linkUrl = isMarkdown ? match[2] : match[3];
    
    let href = linkUrl;
    if (!/^https?:\/\//i.test(href)) {
      href = 'https://' + href;
    }
    
    parts.push({
      text: linkText,
      url: href
    });
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.map((part, i) => {
    if (typeof part === 'string') {
      return part;
    }
    
    return (
      <span
        key={i}
        className={`inline-flex items-center rounded px-1.5 py-0.5 mx-0.5 select-none align-middle ${
          isMe
            ? 'bg-white/10 border border-white/20 text-white'
            : 'bg-gray-100 border border-gray-200 text-gray-800'
        }`}
      >
        <a
          href={part.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 hover:underline select-text font-semibold break-all ${
            isMe ? 'text-sky-200 hover:text-white' : 'text-[#1cb78d] hover:text-[#179a77]'
          }`}
        >
          <ExternalLink size={12} className="flex-shrink-0" />
          <span>{part.text}</span>
        </a>
        <CopyLinkButton url={part.url} isMe={isMe} />
      </span>
    );
  });
};

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  status?: MessageStatus;
  sender: { id: string; name: string; displayName?: string; avatar?: string };
}

interface Conversation {
  id: string;
  therapist: { id: string; name: string; displayName?: string; avatar?: string; email?: string; isActive?: boolean };
  client: { id: string; name: string; displayName?: string; avatar?: string };
  messages: Message[];
}

export default function ClientChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkPromptUrl, setLinkPromptUrl] = useState('');
  const [linkPromptText, setLinkPromptText] = useState('');

  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const peerIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Reflect a delivered/read status update onto my own messages + the conv list.
  const applyStatus = (
    conversationId: string,
    status: MessageStatus,
    messageIds?: string[],
  ) => {
    const upgrade = (m: Message): Message => {
      if (m.conversationId !== conversationId || m.senderId !== currentUser.id) return m;
      if (status === 'READ') return { ...m, status: 'READ' };
      if (status === 'DELIVERED' && m.status !== 'READ' && (!messageIds || messageIds.includes(m.id)))
        return { ...m, status: 'DELIVERED' };
      return m;
    };
    setMessages(prev => prev.map(upgrade));
    setConversations(prev => prev.map(c =>
      c.id === conversationId && c.messages?.[0]
        ? { ...c, messages: [upgrade(c.messages[0])] }
        : c
    ));
  };

  const stopTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const convId = activeConvRef.current?.id;
    if (isTypingRef.current && convId) socket.emit('typing', { conversationId: convId, isTyping: false });
    isTypingRef.current = false;
  };

  const handleTypingActivity = () => {
    const convId = activeConvRef.current?.id;
    if (!convId) return;
    if (!isTypingRef.current) {
      socket.emit('typing', { conversationId: convId, isTyping: true });
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId: convId, isTyping: false });
      isTypingRef.current = false;
    }, 1500);
  };

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
      const isActive = activeConvRef.current && message.conversationId === activeConvRef.current.id;
      if (isActive) {
        setMessages(prev => [...prev, message]);
        // I'm looking at this conversation, so an incoming message is read at once.
        if (message.senderId !== currentUser.id) {
          socket.emit('markRead', { conversationId: message.conversationId });
          setPeerTyping(false);
        }
      }
      setConversations(prev => prev.map(c =>
        c.id === message.conversationId ? { ...c, messages: [message] } : c
      ));
    });

    // Delivery/read receipt updates for messages I sent.
    socket.on('messageStatus', (payload: { conversationId: string; status: MessageStatus; messageIds?: string[] }) => {
      applyStatus(payload.conversationId, payload.status, payload.messageIds);
    });

    // Online / last-seen updates for the person I'm chatting with.
    socket.on('presence', (p: { userId: string; online: boolean; lastSeen: string | null }) => {
      if (p.userId !== peerIdRef.current) return;
      setPeerOnline(p.online);
      if (!p.online) setPeerLastSeen(p.lastSeen ?? null);
    });

    // Typing indicator from the other participant.
    socket.on('typing', (t: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (t.conversationId === activeConvRef.current?.id && t.userId === peerIdRef.current) {
        setPeerTyping(t.isTyping);
      }
    });

    fetchConversations().then(data => {
      data.forEach((conv: Conversation) => socket.emit('joinRoom', conv.id));
    });

    return () => {
      socket.off('connect');
      socket.off('newMessage');
      socket.off('messageStatus');
      socket.off('presence');
      socket.off('typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
      toast.error('Failed to load conversations');
      return [] as Conversation[];
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setShowLinkPrompt(false);
    setPeerTyping(false);
    const peerId = conv.therapist.id;
    peerIdRef.current = peerId;
    setPeerOnline(false);
    setPeerLastSeen(null);
    socket.emit('joinRoom', conv.id);
    // Opening the chat marks the other side's messages as read.
    socket.emit('markRead', { conversationId: conv.id });
    socket.emit('getPresence', peerId, (res: { userId: string; online: boolean; lastSeen: string | null }) => {
      if (res && res.userId === peerIdRef.current) {
        setPeerOnline(!!res.online);
        setPeerLastSeen(res.lastSeen ?? null);
      }
    });
    try {
      const res = await fetch(`${apiUrl}/chat/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(await res.json());
    } catch {
      toast.error('Failed to load messages');
    }
  };

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;
    socket.emit('sendMessage', {
      conversationId: activeConv.id,
      content: newMessage.trim()
    }, () => setNewMessage(''));
    stopTyping();
  };

  const handleInsertLinkClick = async () => {
    if (showLinkPrompt) {
      setShowLinkPrompt(false);
      return;
    }
    setShowLinkPrompt(true);
    try {
      const clipboardText = await navigator.clipboard.readText();
      const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d+)?(\/\S*)?$/i;
      if (clipboardText && urlRegex.test(clipboardText.trim())) {
        setLinkPromptUrl(clipboardText.trim());
      }
    } catch {
      // Ignore clipboard read permission error
    }
  };

  const handleQuickPasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLinkPromptUrl(text.trim());
        toast.success("Link pasted from clipboard!");
      } else {
        toast.warn("Clipboard is empty");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleInsertLink = () => {
    if (!linkPromptUrl.trim()) return;
    
    let formattedUrl = linkPromptUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    const linkString = linkPromptText.trim()
      ? `[${linkPromptText.trim()}](${formattedUrl})`
      : formattedUrl;
      
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setNewMessage(before + linkString + after);
      
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + linkString.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      setNewMessage(prev => prev ? `${prev} ${linkString}` : linkString);
    }
    
    setShowLinkPrompt(false);
    setLinkPromptUrl('');
    setLinkPromptText('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f2f5]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#1cb78d] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500 font-medium tracking-tight">Initializing Secure Chat...</p>
        </div>
      </div>
    );
  }

  const peerDeactivated = activeConv?.therapist.isActive === false;

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden font-[Inter,sans-serif]">

      {/* Nav column — desktop only */}
      <div className="hidden md:flex w-[80px] bg-white border-r border-gray-100 flex-col items-center py-6 shadow-sm z-20 flex-shrink-0">
        <div className="w-10 h-10 bg-[#0f385a] rounded-[0.8rem] flex items-center justify-center mb-10 shadow-md">
          <img src="/Tapfere_Logo Mark_1.svg" alt="T" className="w-[18px] h-[18px] invert" />
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
            <User size={18} strokeWidth={2} className="text-[#0f385a]" />
          </div>
        </div>
      </div>

      {/* Chat list — full width on mobile when no active conv */}
      <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] lg:w-[380px] bg-[#F9FAFB] flex-col h-full z-10 flex-shrink-0`}>
        <div className="p-5 md:p-7 pb-4">
          <h1 className="text-2xl md:text-[26px] font-extrabold text-gray-900 tracking-tight mb-6">Chats</h1>
        </div>

        <div className="px-4 md:px-5 pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-white border border-gray-100 pl-10 pr-4 py-2.5 rounded-2xl text-[14px] font-medium outline-none focus:ring-2 focus:ring-[#1cb78d]/20 focus:border-[#1cb78d] transition-all shadow-sm placeholder-gray-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-4 space-y-1.5 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="p-8 text-center mt-10">
              <Shield size={28} className="text-[#1cb78d] mx-auto mb-4" />
              <p className="text-[16px] font-bold text-gray-900">No active chats</p>
            </div>
          ) : (
            conversations
              .filter(c => (c.therapist.displayName || c.therapist.name).toLowerCase().includes(search.toLowerCase()))
              .map(conv => {
                const lastMsg = conv.messages?.[0];
                const isActive = activeConv?.id === conv.id;
                const name = conv.therapist.displayName || conv.therapist.name;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center p-3.5 rounded-2xl cursor-pointer transition-all border border-transparent
                      ${isActive ? 'bg-[#0f385a] text-white shadow-lg shadow-[#0f385a]/25' : 'bg-transparent text-gray-900 hover:bg-white hover:shadow-sm hover:border-gray-100'}`}
                  >
                    <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-[#0f385a]/10'}`}>
                      <User size={18} strokeWidth={2} className={isActive ? 'text-white' : 'text-[#0f385a]'} />
                    </div>
                    <div className="ml-3.5 flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center min-w-0">
                          <h3 className={`text-[14px] font-bold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
                          {conv.therapist.isActive === false && (
                            <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'}`}>
                              Deactivated
                            </span>
                          )}
                        </div>
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
              })
          )}
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
              <div className="relative w-[42px] h-[42px] rounded-[14px] bg-[#0f385a]/10 flex items-center justify-center shadow-sm flex-shrink-0">
                <User size={20} strokeWidth={2} className="text-[#0f385a]" />
                {peerOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1cb78d] border-2 border-white" />
                )}
              </div>
              <div>
                <h2 className="text-[15px] md:text-[17px] font-extrabold text-gray-900 leading-tight">
                  {activeConv.therapist.displayName || activeConv.therapist.name}
                </h2>
                {peerDeactivated ? (
                  <p className="text-[11px] font-bold tracking-wide mt-0.5 text-red-500 flex items-center gap-1">
                    <UserX size={12} /> Account deactivated
                  </p>
                ) : (
                  <p className={`text-[11px] font-bold tracking-wide mt-0.5 ${peerTyping || peerOnline ? 'text-[#1cb78d]' : 'text-gray-400'}`}>
                    {peerTyping ? 'typing…' : formatPresence(peerOnline, peerLastSeen)}
                  </p>
                )}
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
                      {parseLinks(msg.content, isMe)}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5 px-2">
                      <span className="text-[11px] text-gray-400 font-bold tracking-wide">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <MessageTicks status={msg.status} isMe={isMe} />
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Input */}
            <div className="px-3 md:px-14 lg:px-20 pb-4 md:pb-8 pt-2 bg-white relative">
              {showLinkPrompt && (
                <div className="absolute bottom-[100%] left-3 md:left-14 lg:left-20 right-3 md:right-14 lg:right-20 mb-2 p-4 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm">
                  <h3 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                    <Link size={14} className="text-[#1cb78d]" /> Insert Link
                  </h3>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Paste URL (e.g. https://example.com)"
                      value={linkPromptUrl}
                      onChange={e => setLinkPromptUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[12.5px] outline-none focus:border-[#1cb78d] transition-all text-gray-800 placeholder-gray-400"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Link Text (optional)"
                      value={linkPromptText}
                      onChange={e => setLinkPromptText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[12.5px] outline-none focus:border-[#1cb78d] transition-all text-gray-800 placeholder-gray-400"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleQuickPasteLink}
                      className="text-[11px] font-bold text-[#1cb78d] hover:underline"
                    >
                      Paste from Clipboard
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowLinkPrompt(false); setLinkPromptUrl(''); setLinkPromptText(''); }}
                        className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-xl text-[12px] font-bold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertLink}
                        disabled={!linkPromptUrl.trim()}
                        className="px-4 py-1.5 bg-[#0f385a] hover:bg-[#0c2e48] disabled:bg-[#0f385a]/40 text-white rounded-xl text-[12px] font-bold transition-all"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-white border border-gray-200 shadow-[0_5px_30px_rgba(0,0,0,0.04)] rounded-[24px] p-2 focus-within:shadow-[0_8px_40px_rgba(28,183,141,0.08)] focus-within:border-[#1cb78d] transition-all flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); handleTypingActivity(); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Type a message..."
                  className="w-full bg-transparent border-none outline-none resize-none px-4 py-2 text-[14px] md:text-[15px] font-medium text-gray-800 placeholder-gray-400 h-10 custom-scrollbar"
                />
                <div className="flex justify-between items-center mt-1 px-3 pb-2 pt-1 border-t border-gray-50/50">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInsertLinkClick}
                      className="p-2 text-gray-400 hover:text-[#0f385a] hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                      title="Insert or Paste Link"
                    >
                      <Link size={18} />
                    </button>
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!newMessage.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-[#0f385a] hover:bg-[#0c2e48] disabled:bg-[#0f385a]/40 text-white font-extrabold text-[13px] md:text-[14px] rounded-[12px] transition-all shadow-md shadow-[#0f385a]/20 cursor-pointer"
                  >
                    Send <ChevronRight size={15} strokeWidth={3} className="opacity-80" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 select-none bg-white">
            <div className="max-w-md w-full text-center">
              <div className="inline-flex w-24 h-24 bg-[#1cb78d]/10 rounded-[28px] items-center justify-center mb-8 shadow-sm">
                <Shield size={40} className="text-[#1cb78d]" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-3">Therapist Match Not Ready</h2>
              <p className="text-[15px] text-gray-500 font-medium leading-relaxed">
                Your medical data is HIPAA compliant and end-to-end encrypted. We will assign you a certified therapist soon.
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
