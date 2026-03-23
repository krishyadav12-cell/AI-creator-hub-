import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { UserProfile, TOOLS, GeneratedFile } from '../types';
import { db, handleFirestoreError, OperationType, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Sparkles, Video, Play, Download, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoGenProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function VideoGen({ onBack, profile }: VideoGenProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading || !profile) return;

    setLoading(true);
    setVideoUrl(null);
    setStatus("Generating video... This may take a few minutes.");
    
    try {
      // 1. Generate Video (Veo)
      const videoBlob = await geminiService.generateVideo(prompt);
      
      // 2. Upload to Storage
      setStatus("Uploading video...");
      const fileName = `videos/${profile.uid}/${Date.now()}.mp4`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, videoBlob);
      const url = await getDownloadURL(storageRef);
      setVideoUrl(url);

      // 3. Save to History
      const historyItem: Partial<GeneratedFile> = {
        userId: profile.uid,
        type: 'video',
        prompt,
        url: url,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'history'), historyItem);
      
      setStatus(null);
    } catch (error) {
      console.error('Video gen error:', error);
      setStatus("Failed to generate video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg text-blue-400">AI Video Generator</h3>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-[10px] text-blue-500/80 leading-relaxed">
            Powered by Gemini Veo. Generate high-quality 1080p videos from text prompts. 
            Generation typically takes 1-3 minutes.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Video Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A futuristic city with neon lights and flying cars, cinematic lighting, 4k"
            rows={4}
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {status || "Generating..."}
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Generate Video
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {videoUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-[#1a1a1a] rounded-3xl border border-white/10 space-y-4"
          >
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
              <video 
                src={videoUrl} 
                controls 
                className="w-full h-full object-cover"
                autoPlay
                loop
              />
            </div>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white/60">Generation Complete</span>
              </div>
              <a 
                href={videoUrl} 
                download="ai-video.mp4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {status && !videoUrl && !loading && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-xs text-red-500">{status}</p>
        </div>
      )}
    </div>
  );
}
