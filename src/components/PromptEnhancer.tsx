import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { UserProfile, TOOLS, GeneratedFile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Sparkles, Copy, Wand2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PromptEnhancerProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function PromptEnhancer({ onBack, profile }: PromptEnhancerProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleEnhance = async () => {
    if (!text.trim() || loading || !profile) return;

    setLoading(true);
    setResult(null);
    try {
      const enhanced = await geminiService.enhancePrompt(text);
      setResult(enhanced);

      // Save to history
      const historyItem: Partial<GeneratedFile> = {
        userId: profile.uid,
        type: 'prompt',
        prompt: text,
        result: enhanced,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'history'), historyItem);
    } catch (error) {
      console.error('Enhance error:', error);
      alert("Failed to enhance prompt. Try again.");
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
        <h3 className="font-bold text-lg">Prompt Enhancer</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Your Simple Idea</label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., a futuristic city with neon lights"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-amber-500/50 transition-colors h-32 resize-none"
          />
        </div>

        <button 
          onClick={handleEnhance}
          disabled={!text.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Enhance Prompt
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
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Enhanced Prompt</span>
              </div>
              <button 
                onClick={handleCopy}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-amber-500"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            
            <p className="text-sm leading-relaxed text-white/80 italic">
              "{result}"
            </p>
            
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-white/30">
                Copy this prompt and use it in the Image Generator for better results.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
