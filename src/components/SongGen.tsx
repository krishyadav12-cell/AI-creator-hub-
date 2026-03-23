import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { UserProfile, TOOLS, GeneratedFile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Sparkles, Music, Mic2, Play, Pause, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SongGenProps {
  onBack: () => void;
  profile: UserProfile | null;
}

const VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];
const GENRES = ['Pop', 'Rap', 'Rock', 'Jazz', 'Electronic'];

export default function SongGen({ onBack, profile }: SongGenProps) {
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [voice, setVoice] = useState('Zephyr');
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim() || loading || !profile) return;

    setLoading(true);
    setLyrics(null);
    setAudioUrl(null);
    try {
      // 1. Generate Lyrics
      const generatedLyrics = await geminiService.generateLyrics(topic, genre);
      setLyrics(generatedLyrics);

      // 2. Generate Audio (TTS)
      const audio = await geminiService.generateSpeech(generatedLyrics, voice);
      setAudioUrl(audio);

      // 3. Save to history
      const historyItem: Partial<GeneratedFile> = {
        userId: profile.uid,
        type: 'social', // Reusing social for now, or could add 'audio'
        prompt: `Song about ${topic} (${genre}, ${voice})`,
        result: generatedLyrics,
        url: audio,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'history'), historyItem);
    } catch (error) {
      console.error('Song gen error:', error);
      alert("Failed to generate song. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!lyrics) return;
    navigator.clipboard.writeText(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePlay = () => {
    const audio = document.getElementById('preview-audio') as HTMLAudioElement;
    if (audio) {
      if (playing) audio.pause();
      else audio.play();
      setPlaying(!playing);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg text-emerald-400">Song & Voice Studio</h3>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Song Topic / Theme</label>
          <input 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., a rainy day in the city"
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Genre</label>
            <select 
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-emerald-500/50"
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">AI Voice Clone</label>
            <select 
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-emerald-500/50"
            >
              {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!topic.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Music className="w-5 h-5" />
              Generate Song & Audio
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {(lyrics || audioUrl) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-[#1a1a1a] rounded-3xl border border-white/10 space-y-6"
          >
            {audioUrl && (
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Mic2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">AI Voice Clone</p>
                    <p className="text-[10px] text-white/40">{voice} Voice</p>
                  </div>
                </div>
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </button>
                <audio 
                  id="preview-audio" 
                  src={audioUrl} 
                  onEnded={() => setPlaying(false)}
                  className="hidden" 
                />
              </div>
            )}

            {lyrics && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">Lyrics</span>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-emerald-500"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap italic">
                  {lyrics}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
