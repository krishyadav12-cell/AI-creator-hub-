import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { UserProfile } from '../types';
import { useUsage } from '../hooks/useUsage';
import { db, handleFirestoreError, OperationType, storage, ref, uploadString, getDownloadURL } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Sparkles, Download, Image as ImageIcon, Maximize, Layout as AspectRatio, Share2, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageGenProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function ImageGen({ onBack, profile }: ImageGenProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [style, setStyle] = useState('Realistic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { checkLimit } = useUsage(profile);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading || !profile) return;

    const canProceed = await checkLimit();
    if (!canProceed) {
      alert("Daily limit reached! Upgrade for more.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const base64Image = await geminiService.generateImage(prompt, aspectRatio, imageSize, style);
      
      // Upload to Firebase Storage
      const fileName = `images/${profile.uid}/${Date.now()}.png`;
      const storageRef = ref(storage, fileName);
      // base64Image is like "data:image/png;base64,..."
      await uploadString(storageRef, base64Image, 'data_url');
      const imageUrl = await getDownloadURL(storageRef);
      
      setResult(imageUrl);

      // Save to history
      await addDoc(collection(db, 'history'), {
        userId: profile.uid,
        type: 'image',
        prompt,
        url: imageUrl,
        style,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Image gen error:', error);
      alert("Failed to generate image. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = `ai-image-${Date.now()}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const response = await fetch(result);
      const blob = await response.blob();
      const file = new File([blob], 'ai-image.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'AI Generated Image',
          text: 'Check out this image I generated with AI Creator Hub!'
        });
      } else {
        alert("Sharing not supported on this browser.");
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const aspectRatios = ['1:1', '4:3', '3:4', '16:9', '9:16'];
  const sizes = ['1K', '2K', '4K'];
  const styles = ['Realistic', 'Anime', '3D', 'Cartoon'];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">Image Generator</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A futuristic city with neon lights and flying cars..."
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors h-32 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
            <Palette className="w-3 h-3" /> Style
          </label>
          <div className="grid grid-cols-4 gap-2">
            {styles.map((s) => (
              <button 
                key={s}
                onClick={() => setStyle(s)}
                className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                  style === s ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
              <AspectRatio className="w-3 h-3" /> Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((r) => (
                <button 
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    aspectRatio === r ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
              <Maximize className="w-3 h-3" /> Quality
            </label>
            <div className="flex gap-2">
              {sizes.map((s) => (
                <button 
                  key={s}
                  onClick={() => setImageSize(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    imageSize === s ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Image
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="aspect-square w-full bg-[#1a1a1a] rounded-3xl border border-white/10 flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-500 animate-pulse" />
            </div>
            <p className="text-sm text-white/40 font-medium animate-pulse">Creating your masterpiece...</p>
          </motion.div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="relative group rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <img src={result} alt="Generated" className="w-full h-auto" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={handleDownload}
                  className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                >
                  <Download className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-4 bg-blue-600 text-white rounded-full hover:scale-110 transition-transform shadow-xl"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
            <button 
              onClick={handleDownload}
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Image
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
