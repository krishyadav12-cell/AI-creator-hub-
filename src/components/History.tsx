import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { UserProfile, GeneratedFile } from '../types';
import { ArrowLeft, Loader2, Image as ImageIcon, Wand2, Hash, Download, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function History({ onBack, profile }: HistoryProps) {
  const [items, setItems] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'prompt' | 'social'>('all');

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'history'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const historyItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GeneratedFile[];
      setItems(historyItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const filteredItems = filter === 'all' ? items : items.filter(i => i.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'prompt': return <Wand2 className="w-4 h-4" />;
      case 'social': return <Hash className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-purple-500 bg-purple-500/10';
      case 'prompt': return 'text-amber-500 bg-amber-500/10';
      case 'social': return 'text-pink-500 bg-pink-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">History</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'image', 'prompt', 'social'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              filter === f ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-white/40">Loading history...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-white/20" />
          </div>
          <div className="space-y-1">
            <p className="font-bold">No history yet</p>
            <p className="text-xs text-white/40">Your creations will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => (
            <motion.div
              layout
              key={item.id || `history-${index}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-[#1a1a1a] border border-white/10 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getColor(item.type)}`}>
                  {getIcon(item.type)}
                  {item.type}
                </div>
                <span className="text-[10px] text-white/20">
                  {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-white/40 line-clamp-2 italic">"{item.prompt}"</p>
                
                {item.type === 'image' && item.url && (
                  <div className="relative group aspect-square rounded-xl overflow-hidden bg-white/5">
                    <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a href={item.url} download className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Download className="w-4 h-4" />
                      </a>
                      <a href={item.url} target="_blank" rel="noreferrer" className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {(item.type === 'prompt' || item.type === 'social') && item.result && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-sm text-white/80 line-clamp-4 whitespace-pre-wrap">{item.result}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
