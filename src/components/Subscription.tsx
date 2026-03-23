import React, { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile, Plan, TOOLS, ToolType } from '../types';
import { ArrowLeft, Check, Zap, Sparkles, ShieldCheck, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface SubscriptionProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function Subscription({ onBack, profile }: SubscriptionProps) {
  const [selectedTool, setSelectedTool] = useState<string>(profile?.selectedTool || TOOLS.IMAGE);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: Plan) => {
    if (!profile) return;
    setLoading(true);
    const path = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        plan,
        selectedTool: plan === 'basic' ? selectedTool : null
      });
      alert(`Successfully upgraded to ${plan}!`);
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    { id: TOOLS.IMAGE, name: 'Image Gen' },
    { id: TOOLS.PROMPT_ENHANCER, name: 'Prompt Enhancer' },
    { id: TOOLS.SOCIAL_GEN, name: 'Social Hub' },
    { id: TOOLS.AUTO_POSTER, name: 'Auto Channel' },
    { id: TOOLS.SONG_GEN, name: 'Song & Voice' },
    { id: TOOLS.VIDEO_GEN, name: 'Video Gen' }
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">Choose Your Plan</h3>
      </div>

      <div className="space-y-6">
        {/* Basic Plan */}
        <div className={`p-6 rounded-3xl border-2 transition-all ${
          profile?.plan === 'basic' ? 'bg-blue-500/5 border-blue-500' : 'bg-[#1a1a1a] border-white/5'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-xl font-bold">Basic</h4>
              <p className="text-xs text-white/40">Perfect for focused creators</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹50</p>
              <p className="text-[10px] text-white/40">per month</p>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-blue-500" /> Unlimited Chatbot
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-blue-500" /> 1 Selected Tool
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-blue-500" /> 10 generations / day
            </li>
          </ul>

          <div className="space-y-3 mb-6">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Your Tool</p>
            <div className="grid grid-cols-2 gap-2">
              {tools.map((t) => (
                <button 
                  key={t.id}
                  onClick={() => setSelectedTool(t.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                    selectedTool === t.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => handleUpgrade('basic')}
            disabled={loading || profile?.plan === 'basic'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
          >
            {profile?.plan === 'basic' ? 'Current Plan' : 'Upgrade to Basic'}
          </button>
        </div>

        {/* Premium Plan */}
        <div className={`p-6 rounded-3xl border-2 transition-all relative overflow-hidden ${
          profile?.plan === 'premium' ? 'bg-amber-500/5 border-amber-500' : 'bg-[#1a1a1a] border-white/5'
        }`}>
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            BEST VALUE
          </div>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-xl font-bold flex items-center gap-2">
                Premium <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </h4>
              <p className="text-xs text-white/40">For power users & pros</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹100</p>
              <p className="text-[10px] text-white/40">per month</p>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-amber-500" /> Unlimited Chatbot
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-amber-500" /> Access to ALL Tools
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-amber-500" /> 50 generations / day
            </li>
            <li className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-amber-500" /> Priority Generation
            </li>
          </ul>

          <button 
            onClick={() => handleUpgrade('premium')}
            disabled={loading || profile?.plan === 'premium'}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all"
          >
            {profile?.plan === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
          </button>
        </div>
      </div>
    </div>
  );
}
