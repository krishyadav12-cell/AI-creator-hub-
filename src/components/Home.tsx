import React from 'react';
import { UserProfile, TOOLS, ToolType } from '../types';
import { MessageSquare, Image as ImageIcon, Sparkles, ChevronRight, Lock, Wand2, Hash, History, Zap, Music, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface HomeProps {
  onNavigate: (screen: string) => void;
  profile: UserProfile | null;
}

export default function Home({ onNavigate, profile }: HomeProps) {
  const isToolLocked = (tool: ToolType) => {
    if (profile?.plan === 'premium' || profile?.plan === 'admin') return false;
    if (profile?.plan === 'basic') {
      if (tool === TOOLS.CHAT || tool === TOOLS.HISTORY) return false;
      // Basic users can only access their selected tool
      return profile.selectedTool && profile.selectedTool !== tool;
    }
    // Free users can access all tools but with very low daily limits (e.g., 3)
    return false; 
  };

  const toolCards = [
    { id: TOOLS.CHAT, name: 'AI Chatbot', icon: MessageSquare, color: 'bg-blue-500', desc: 'Modern assistant like ChatGPT' },
    { id: TOOLS.IMAGE, name: 'Image Gen', icon: ImageIcon, color: 'bg-purple-500', desc: 'Text to high-res images' },
    { id: TOOLS.PROMPT_ENHANCER, name: 'Prompt Enhancer', icon: Wand2, color: 'bg-amber-500', desc: 'Make prompts professional' },
    { id: TOOLS.SOCIAL_GEN, name: 'Social Hub', icon: Hash, color: 'bg-pink-500', desc: 'Captions & trending hashtags' },
    { id: TOOLS.SONG_GEN, name: 'Song & Voice', icon: Music, color: 'bg-emerald-500', desc: 'AI Lyrics & Voice Clones' },
    { id: TOOLS.VIDEO_GEN, name: 'Video Gen', icon: Video, color: 'bg-blue-500', desc: 'Text to high-res video' },
    { id: TOOLS.AUTO_POSTER, name: 'Auto Channel', icon: Zap, color: 'bg-red-500', desc: 'Auto-post 2-3 videos daily' },
    { id: TOOLS.HISTORY, name: 'History', icon: History, color: 'bg-slate-500', desc: 'View your past creations' },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Welcome, {profile?.displayName?.split(' ')[0]}!</h2>
        <p className="text-white/40 text-sm">What would you like to create today?</p>
      </div>

      {/* Featured Card */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate(TOOLS.CHAT)}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-6 shadow-2xl shadow-blue-500/20 cursor-pointer group"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] font-bold uppercase tracking-wider">New: Gemini 3.1 Pro</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold">AI Chatbot</h3>
            <p className="text-white/70 text-sm">Ask anything, generate prompts, and explore ideas.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            Start Chatting <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        <MessageSquare className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
      </motion.div>

      {/* Tools Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest px-1">Creative Tools</h3>
        <div className="grid grid-cols-1 gap-4">
          {toolCards.map((tool) => {
            const locked = isToolLocked(tool.id);
            return (
              <motion.div
                key={tool.id}
                whileTap={locked ? { x: [0, -5, 5, -5, 5, 0] } : { scale: 0.98 }}
                onClick={() => !locked && onNavigate(tool.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                  locked 
                    ? 'bg-white/5 border-white/5 opacity-60 grayscale' 
                    : 'bg-[#1a1a1a] border-white/10 hover:border-white/20 active:bg-[#222]'
                }`}
              >
                <div className={`w-12 h-12 ${tool.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{tool.name}</h4>
                  <p className="text-xs text-white/40">{tool.desc}</p>
                </div>
                {locked ? (
                  <Lock className="w-4 h-4 text-white/20" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/20" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Subscription Banner */}
      {profile?.plan === 'free' && (
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
          <div className="space-y-1">
            <h4 className="font-bold">Upgrade to Premium</h4>
            <p className="text-sm text-white/40">Get higher limits and access to all AI tools.</p>
          </div>
          <button 
            onClick={() => onNavigate('subscription')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm"
          >
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
