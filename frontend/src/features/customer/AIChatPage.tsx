import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Send, MessageSquarePlus, Trash2, Bot, User, Loader2,
  ArrowLeft, Settings, Zap, ChevronDown, ChevronRight, Brain,
  Sparkles, Clock, Copy, Check, PanelLeftClose, PanelLeft,
  Search, SlidersHorizontal, History, Plus, ExternalLink,
  Lightbulb, ShoppingCart, Package, HelpCircle, TrendingUp,
  FileText, GripVertical, X, Globe, Menu
} from 'lucide-react';
import { useChatStore, ChatConversation, ChatMessage } from '../../lib/chat-store';
import { useAuthStore } from '../../lib/auth-store';
import VoiceControl from '../voice/VoiceControl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../../components/ConfirmDialog';

// ── Collapsible Thinking Process ──
function ThinkingProcess({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { isThinkingExpanded, setThinkingExpanded } = useChatStore();

  useEffect(() => { setExpanded(isThinkingExpanded); }, [isThinkingExpanded]);

  const toggle = () => { const n = !expanded; setExpanded(n); setThinkingExpanded(n); };

  return (
    <div className="mb-3 rounded-xl overflow-hidden transition-all border" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted) / 0.5)' }}>
      <button onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors" style={{ color: 'rgb(var(--color-text-secondary))' }}>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <Brain className="h-3.5 w-3.5 shrink-0" style={{ color: 'rgb(var(--color-primary-500))' }} />
        <span>Thinking process</span>
        {isStreaming && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1" />}
        <span className="ml-auto opacity-50 text-[10px] flex items-center gap-1"><Clock className="h-3 w-3" />{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 max-h-[300px] overflow-y-auto">
          <div className="p-3 rounded text-xs leading-relaxed whitespace-pre-wrap font-mono" style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))', border: '1px solid', borderColor: 'rgb(var(--color-border))' }}>
            {content || (isStreaming ? (
              <span className="flex items-center gap-2" style={{ color: 'rgb(var(--color-text-muted))' }}><Loader2 className="h-3 w-3 animate-spin" />Analyzing...</span>
            ) : (
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>No reasoning content available.</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Copy Button ──
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Copied'); }
    catch { toast.error('Failed to copy'); }
  };
  return (
    <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'rgb(var(--color-text-muted))' }} title="Copy response">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Typewriter streaming text ──
function TypewriterText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => { setDisplayed(''); setCurrentIndex(0); }, [text]);
  useEffect(() => {
    if (currentIndex >= text.length) return;
    const t = setTimeout(() => { setDisplayed(p => p + text[currentIndex]); setCurrentIndex(p => p + 1); }, speed);
    return () => clearTimeout(t);
  }, [currentIndex, text, speed]);
  return (
    <span className="whitespace-pre-wrap">
      {displayed}
      {currentIndex < text.length && <span className="inline-block w-[2px] h-[1em] ml-0.5 align-middle animate-pulse rounded-sm" style={{ backgroundColor: 'rgb(var(--color-text))' }} />}
    </span>
  );
}

// ── Markdown Content ──
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:text-sm prose-ul:my-1 prose-li:my-0 prose-code:px-1 prose-code:rounded prose-table:text-xs prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1 prose-a:font-medium leading-relaxed"
      style={{
        '--tw-prose-body': 'rgb(var(--color-text-secondary))',
        '--tw-prose-headings': 'rgb(var(--color-text))',
        '--tw-prose-links': 'rgb(var(--color-primary-600))',
        '--tw-prose-bold': 'rgb(var(--color-text))',
        '--tw-prose-code': 'rgb(var(--color-text))',
        '--tw-prose-code-bg': 'rgb(var(--color-surface-hover))',
        '--tw-prose-pre-bg': 'rgb(var(--color-surface-muted))',
        '--tw-prose-quotes': 'rgb(var(--color-text-secondary))',
        '--tw-prose-quote-borders': 'rgb(var(--color-primary-300))',
        '--tw-prose-th-borders': 'rgb(var(--color-border))',
        '--tw-prose-td-borders': 'rgb(var(--color-divider))',
      } as React.CSSProperties}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

// ── Suggestion Chip ──
function SuggestionChip({ text, icon: Icon, onClick }: { text: string; icon?: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-text-secondary))' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50) / 0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))'; }}>
      {Icon && <Icon className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />}
      {text}
    </button>
  );
}

// ── Empty State ──
function EmptyState({ setInput }: { setInput: (val: string) => void }) {
  const suggestionGroups = [
    { label: 'Shopping', items: ['Find me a smartphone under 500', 'Show me trending products', 'Compare laptop prices', 'Best deals this week'] },
    { label: 'Orders & Account', items: ['Track my order status', 'View my recent orders', 'What is my return policy?', 'Update my preferences'] },
    { label: 'Selling & Support', items: ['How do I become a seller?', 'Contact customer support', 'Set up my store', 'Seller analytics help'] },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-100)), rgb(var(--color-primary-200)))' }}>
          <Sparkles className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: 'rgb(var(--color-primary-600))' }} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>What can I help you with?</h2>
        <p className="text-sm max-w-md mb-6 mx-auto" style={{ color: 'rgb(var(--color-text-muted))' }}>
          I'm your AI marketplace assistant. I can search products, manage your cart, track orders, and more!
        </p>
      </motion.div>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-xl">
        <SuggestionChip text="Track my order" icon={Package} onClick={() => setInput('Track my order')} />
        <SuggestionChip text="Search products" icon={Search} onClick={() => setInput('Search for products')} />
        <SuggestionChip text="View my cart" icon={ShoppingCart} onClick={() => setInput('Show my cart')} />
        <SuggestionChip text="Help & support" icon={HelpCircle} onClick={() => setInput('How can I get help?')} />
        <SuggestionChip text="Become a seller" icon={TrendingUp} onClick={() => setInput('How do I become a seller?')} />
        <SuggestionChip text="Order history" icon={FileText} onClick={() => setInput('View my order history')} />
      </div>

      {/* Suggestion groups */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full text-left">
        {suggestionGroups.map(group => (
          <div key={group.label} className="p-3 rounded-xl border" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--color-text-disabled))' }}>{group.label}</p>
            <div className="space-y-1.5">
              {group.items.map(item => (
                <button key={item} onClick={() => setInput(item)}
                  className="w-full text-left text-xs py-1.5 px-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Conversation Sidebar ──
function ConversationSidebar({ isMobileOpen, onCloseMobile }: { isMobileOpen: boolean; onCloseMobile: () => void }) {
  const navigate = useNavigate();
  const confirmAction = useConfirm();
  const {
    conversations, currentConversationId, isLoading,
    loadConversations, createConversation, selectConversation, deleteConversation,
  } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadConversations(); }, []);

  const filteredConvs = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c: ChatConversation) => c.title?.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const handleNew = async () => {
    try { await createConversation('New Conversation'); toast.success('New chat started'); } 
    catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Archive conversation?',
      message: 'The conversation will be moved out of your active chat list.',
      confirmText: 'Archive',
      variant: 'warning',
    });
    if (confirmed) {
      await deleteConversation(id);
      toast.success('Conversation archived');
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
            <History className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
            History
          </h3>
          <button onClick={handleNew} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" title="New conversation" style={{ color: 'rgb(var(--color-primary-600))' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1"
            style={{ backgroundColor: 'rgb(var(--color-surface-muted))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text))' }} />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgb(var(--color-text-muted))' }} /></div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center py-8 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        ) : (
          filteredConvs.map((conv: ChatConversation) => (
            <div key={conv.id} onClick={() => { selectConversation(conv.id); onCloseMobile(); }}
              onKeyDown={e => { if (e.key === 'Enter') { selectConversation(conv.id); onCloseMobile(); } }}
              role="button" tabIndex={0}
              className="w-full text-left p-2.5 rounded-xl transition-all group cursor-pointer focus:outline-none focus:ring-2"
              style={{
                backgroundColor: currentConversationId === conv.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                color: currentConversationId === conv.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text))',
                border: currentConversationId === conv.id ? '1px solid' : '1px solid transparent',
                borderColor: currentConversationId === conv.id ? 'rgb(var(--color-primary-200))' : 'transparent',
              }}
              aria-current={currentConversationId === conv.id ? 'true' : undefined}>
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title || 'New Conversation'}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 transition-opacity rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'rgb(var(--color-danger))' }} title="Archive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
        <Link to="/account" className="flex items-center gap-2 text-xs transition-colors hover:underline" style={{ color: 'rgb(var(--color-text-muted))' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Account
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col shrink-0 border-r" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-gray-50))' }}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={onCloseMobile} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[85vw] max-w-sm shadow-2xl md:hidden"
              style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
              <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
                <span className="text-sm font-bold" style={{ color: 'rgb(var(--color-text))' }}>AI Chat</span>
                <button onClick={onCloseMobile} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Message Bubble ──
function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[92%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm"
          style={{ backgroundColor: isUser ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-gray-100))', color: isUser ? 'white' : 'rgb(var(--color-gray-700))' }}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        {/* Bubble */}
        <div className="group">
          {msg.role === 'assistant' && msg.thinking && <ThinkingProcess content={msg.thinking} isStreaming={!!isStreaming} />}
          <div className="rounded-2xl px-4 py-3 relative shadow-sm"
            style={{
              backgroundColor: isUser ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-muted))',
              color: isUser ? 'white' : 'rgb(var(--color-text))',
              border: isUser ? 'none' : '1px solid rgb(var(--color-border))',
              borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            }}>
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <div className="text-sm leading-relaxed"><MarkdownContent content={msg.content} /></div>
            )}
            <div className="flex items-center justify-between mt-2 pt-1">
              <div className="flex items-center gap-2">
                {msg.model && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: isUser ? 'rgba(255,255,255,0.15)' : 'rgb(var(--color-surface-hover))', color: isUser ? 'rgba(255,255,255,0.7)' : 'rgb(var(--color-text-muted))' }}>
                    {msg.model}
                  </span>
                )}
                <span className="text-[10px]" style={{ color: isUser ? 'rgba(255,255,255,0.5)' : 'rgb(var(--color-text-disabled))' }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!isUser && <CopyButton text={msg.content} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Streaming Message ──
function StreamingMessage({ typingText, thinkingText }: { typingText: string; thinkingText: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex gap-3 max-w-[85%] md:max-w-[75%]">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm"
          style={{ backgroundColor: 'rgb(var(--color-accent-100))', color: 'rgb(var(--color-accent-600))' }}>
          <Bot className="h-4 w-4" />
        </div>
        <div className="group">
          {thinkingText && <ThinkingProcess content={thinkingText} isStreaming={true} />}
          <div className="rounded-2xl px-5 py-3 shadow-sm" style={{ backgroundColor: 'rgb(var(--color-surface-muted))', border: '1px solid', borderColor: 'rgb(var(--color-border))', borderRadius: '18px 18px 18px 4px' }}>
            {typingText ? (
              <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text))' }}>
                <TypewriterText text={typingText} speed={8} />
              </p>
            ) : (
              <div className="flex items-center gap-3 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick Action Bar ──
function QuickActionBar({ onAction }: { onAction: (text: string) => void }) {
  const actions = [
    { icon: ShoppingCart, label: 'Cart', action: 'Show my shopping cart' },
    { icon: Package, label: 'Orders', action: 'View my recent orders' },
    { icon: Search, label: 'Search', action: 'Search for products on marketplace' },
    { icon: TrendingUp, label: 'Deals', action: 'Show me best deals and discounts' },
    { icon: HelpCircle, label: 'Help', action: 'How can I get help or support?' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide px-1" style={{ scrollbarWidth: 'none' }}>
      {actions.map(a => (
        <button key={a.label} onClick={() => onAction(a.action)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-all hover:shadow-sm shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <a.icon className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Chat Page ──
export default function AIChatPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations, currentConversationId, messages, isLoading, isStreaming, error,
    typingText, thinkingText, streamingMessageId,
    selectConversation, createConversation, sendMessageStream, deleteConversation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingText, thinkingText]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (!currentConversationId) {
      try { await createConversation('New Conversation'); } catch (err: any) { toast.error(err.message || 'Failed'); return; }
    }
    try { await sendMessageStream(text); } catch (err: any) { toast.error(err.message || 'Failed to send'); }
  };

  const handleQuickAction = async (text: string) => {
    if (isLoading || isStreaming) return;
    try {
      if (!currentConversationId) {
        await createConversation('New Conversation');
      }
      await sendMessageStream(text);
    } catch (err: any) {
      toast.error(err.message || 'Failed');
    }
  };

  const currentConv = conversations.find((c: ChatConversation) => c.id === currentConversationId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
      {/* Sidebar */}
      <ConversationSidebar isMobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 border-b" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu toggle */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'rgb(var(--color-text-secondary))' }} aria-label="Open sidebar">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                <Bot className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--color-primary-500))' }} />
                Marketplace AI
                {isStreaming && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Streaming
                  </span>
                )}
              </h2>
              <p className="text-[10px] sm:text-xs hidden sm:block" style={{ color: 'rgb(var(--color-text-muted))' }}>Chat, search, manage orders with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => navigate('/admin/ai-providers')} className="p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hidden sm:flex" style={{ color: 'rgb(var(--color-text-muted))' }} title="AI Settings">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => { if (currentConversationId) { navigate('/admin/ai-providers'); } }} className="text-[10px] sm:text-xs flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-muted))' }}>
              <ExternalLink className="w-3 h-3" /><span className="hidden sm:inline">AI Admin</span>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          {!currentConversationId ? (
            <EmptyState setInput={setInput} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.filter(msg => !(isStreaming && msg.id === streamingMessageId)).map((msg: ChatMessage) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {(isStreaming || typingText) && <StreamingMessage typingText={typingText} thinkingText={thinkingText} />}

              {error && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: 'rgb(var(--color-danger) / 0.15)', color: 'rgb(var(--color-danger))' }} role="alert">
                    <span>⚠</span> {error}
                    <button onClick={() => handleSend()} className="underline ml-2 font-medium">Retry</button>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentConversationId ? (
          <form onSubmit={handleSend} className="shrink-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
            {/* Quick actions */}
            <div className="mx-auto max-w-3xl mb-2">
              <QuickActionBar onAction={handleQuickAction} />
            </div>

            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border-2 p-1.5 sm:p-2 shadow-sm transition-all focus-within:border-primary-400 focus-within:shadow-md" style={{ borderColor: 'rgb(var(--color-border-strong))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
              <VoiceControl autoSend enabled className="shrink-0" onVoiceInput={(text) => setInput(p => p ? `${p} ${text}` : text)}
                onAutoSend={async (text) => {
                  if (isLoading || isStreaming) return;
                  if (!currentConversationId) { try { await createConversation('New Conversation'); } catch { return; } }
                  try { await sendMessageStream(text); } catch { toast.error('Failed'); }
                }} />
              <div className="flex-1 relative">
                <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; } }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type your message..." rows={1}
                  className="w-full resize-none bg-transparent px-2 py-1.5 pr-12 min-h-[40px] max-h-32 text-sm focus:outline-none"
                  style={{ color: 'rgb(var(--color-text))' }} disabled={isLoading || isStreaming} />
                <button type="button" onClick={handleSend} disabled={!input.trim() || isLoading || isStreaming}
                  className="absolute right-1 bottom-1 p-1.5 rounded-xl transition-all text-white disabled:opacity-40 hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}>
                  {isLoading || isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs mt-2 text-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
              Press <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}>Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded text-[9px]" style={{ backgroundColor: 'rgb(var(--color-surface-hover))' }}>Shift+Enter</kbd> for new line
            </p>
          </form>
        ) : null}
      </main>
    </div>
  );
}
