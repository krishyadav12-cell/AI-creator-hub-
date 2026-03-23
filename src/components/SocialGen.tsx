import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { UserProfile, TOOLS, GeneratedFile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Sparkles, Copy, Hash, Check, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SocialGenProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function SocialGen({ onBack, profile }: SocialGenProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [type, setType] = useState<'caption' | 'hashtag'>('caption');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim() || loading || !profile) return;

    setLoading(true);
    setResult(null);
    try {
      const content = await geminiService.generateSocialContent(text, type);
      setResult(content);

      // Save to history
      const historyItem: Partial<GeneratedFile> = {
        userId: profile.uid,
        type: 'social',
        prompt: text,
        result: content,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'history'), historyItem);
    } catch (error) {
      console.error('Social gen error:', error);
      alert("Failed to generate content. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">Social Hub</h3>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setType('caption')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              type === 'caption' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-white/40 hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Captions
          </button>
          <button 
            onClick={() => setType('hashtag')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              type === 'hashtag' ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' : 'text-white/40 hover:bg-white/5'
            }`}
          >
            <Hash className="w-4 h-4" />
            Hashtags
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Topic or Description</label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., a sunset at the beach"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-pink-500/50 transition-colors h-32 resize-none"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!text.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-pink-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate {type === 'caption' ? 'Captions' : 'Hashtags'}
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-[#1a1a1a] rounded-3xl border border-white/10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Generated {type}</span>
              </div>
              <button 
                onClick={handleCopy}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-pink-500"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
              {result}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
