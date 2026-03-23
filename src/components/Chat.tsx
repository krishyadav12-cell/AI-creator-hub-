import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { geminiService } from '../services/geminiService';
import { UserProfile, ChatMessage } from '../types';
import { useUsage } from '../hooks/useUsage';
import { Send, ArrowLeft, Loader2, Sparkles, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface ChatProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function Chat({ onBack, profile }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { checkLimit } = useUsage(profile);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'users', profile.uid, 'chats'),
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !profile) return;

    const canProceed = await checkLimit();
    if (!canProceed) {
      alert("Daily limit reached! Upgrade for more.");
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'users', profile.uid, 'chats'), {
        userId: profile.uid,
        role: 'user',
        content: userMsg,
        timestamp: serverTimestamp()
      });

      let fullResponse = '';
      const stream = geminiService.generateChatResponseStream(
        [...messages, { role: 'user', content: userMsg }],
        thinking
      );

      // Add a placeholder message for the model response
      const tempId = 'temp-' + Date.now();
      setMessages(prev => [...prev, { 
        id: tempId,
        userId: profile.uid, 
        role: 'model', 
        content: '', 
        timestamp: new Date() 
      }]);

      setIsTyping(true);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: fullResponse } : m));
      }
      setIsTyping(false);

      // Replace temp message with real one from firestore
      await addDoc(collection(db, 'users', profile.uid, 'chats'), {
        userId: profile.uid,
        role: 'model',
        content: fullResponse,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Suggest a prompt for a sci-fi image",
    "Create a script for a 10s video about space",
    "How can I use AI for my business?",
    "Write a short story about a robot"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#0a0a0a] rounded-3xl overflow-hidden border border-white/5">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#111]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-sm">Gemini 3.1 Pro</h3>
            <p className="text-[10px] text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
            </p>
          </div>
        </div>
        <button 
          onClick={() => setThinking(!thinking)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
            thinking ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-white/40'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          THINKING MODE
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold">How can I help you?</h4>
              <p className="text-xs max-w-[200px]">Ask me to generate prompts for images, videos, or just chat.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-left px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={msg.id || `msg-${i}`} 
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#1a1a1a] text-white/90 border border-white/5 rounded-tl-none'
            }`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        {loading && !isTyping && (
          <div key="loading-indicator" className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-tl-none border border-white/5">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            </div>
          </div>
        )}
        {isTyping && (
          <motion.div 
            key="typing-indicator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-[#111] border-t border-white/5">
        <div className="relative flex items-center gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors pr-12"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-all active:scale-90"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
