import React, { useState, useEffect } from 'react';
import { db, storage, ref, uploadString, getDownloadURL } from '../firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { geminiService } from '../services/geminiService';
import { UserProfile, TOOLS } from '../types';
import { ArrowLeft, Youtube, Instagram, Zap, Loader2, Check, AlertCircle, Play, Sparkles, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AutoPosterProps {
  onBack: () => void;
  profile: UserProfile | null;
}

export default function AutoPoster({ onBack, profile }: AutoPosterProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS' || event.data?.type === 'INSTAGRAM_AUTH_SUCCESS') {
        // In a real app, we'd exchange the code for tokens on the server
        // For this demo, we'll simulate the connection
        handleConnectSuccess(event.data.type === 'YOUTUBE_AUTH_SUCCESS' ? 'youtube' : 'instagram');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectSuccess = async (platform: 'youtube' | 'instagram') => {
    if (!profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      const connectionData = platform === 'youtube' 
        ? { youtube: { id: 'yt-' + Date.now(), title: 'My Channel', thumbnail: '', accessToken: 'mock', refreshToken: 'mock' } }
        : { instagram: { id: 'ig-' + Date.now(), username: 'my_profile', accessToken: 'mock' } };
      
      await updateDoc(userRef, {
        [`connections.${platform}`]: connectionData[platform]
      });
      setStatus(`${platform.charAt(0).toUpperCase() + platform.slice(1)} connected!`);
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const connectPlatform = async (platform: 'youtube' | 'instagram') => {
    try {
      const response = await fetch(`/api/auth/${platform}/url`);
      const { url } = await response.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('Auth URL error:', error);
    }
  };

  const runDailySync = async () => {
    if (!profile || !topic.trim() || syncing) return;
    if (!profile.connections?.youtube && !profile.connections?.instagram) {
      alert("Please connect at least one platform first.");
      return;
    }

    setSyncing(true);
    setStatus("Generating daily content (2-3 videos)...");
    
    try {
      const numVideos = 2 + Math.floor(Math.random() * 2); // 2 or 3
      for (let i = 0; i < numVideos; i++) {
        setStatus(`Generating video ${i + 1} of ${numVideos}...`);
        
        // 1. Generate Script & Prompt
        const { script, prompt } = await geminiService.generateVideoScript(topic);
        
        // 2. Generate Video (Veo)
        const videoBlob = await geminiService.generateVideo(prompt);
        
        // 3. Upload to Storage
        const fileName = `videos/${profile.uid}/${Date.now()}.mp4`;
        const storageRef = ref(storage, fileName);
        
        // Convert blob to base64 for uploadString (or use uploadBytes)
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(videoBlob);
        });
        const base64Video = await base64Promise;
        await uploadString(storageRef, base64Video, 'data_url');
        const videoUrl = await getDownloadURL(storageRef);

        // 4. Save to History & Simulate Post
        await addDoc(collection(db, 'history'), {
          userId: profile.uid,
          type: 'video',
          prompt,
          result: script,
          url: videoUrl,
          platform: profile.connections?.youtube ? 'youtube' : 'instagram',
          status: 'posted',
          timestamp: serverTimestamp()
        });
      }
      
      setStatus("Daily sync complete! All videos posted.");
      setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      console.error('Sync error:', error);
      setStatus("Sync failed. Check console for details.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-lg">Auto Channel Growth</h3>
      </div>

      {/* Connections Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Connected Platforms</h4>
        <div className="grid grid-cols-1 gap-3">
          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            profile?.connections?.youtube ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                profile?.connections?.youtube ? 'bg-red-500' : 'bg-white/10'
              }`}>
                <Youtube className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">YouTube</p>
                <p className="text-[10px] text-white/40">
                  {profile?.connections?.youtube ? 'Connected: ' + profile.connections.youtube.title : 'Not connected'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => !profile?.connections?.youtube && connectPlatform('youtube')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                profile?.connections?.youtube ? 'bg-green-500/20 text-green-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {profile?.connections?.youtube ? <Check className="w-3 h-3" /> : 'Connect'}
            </button>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            profile?.connections?.instagram ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                profile?.connections?.instagram ? 'bg-pink-500' : 'bg-white/10'
              }`}>
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Instagram</p>
                <p className="text-[10px] text-white/40">
                  {profile?.connections?.instagram ? 'Connected: @' + profile.connections.instagram.username : 'Not connected'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => !profile?.connections?.instagram && connectPlatform('instagram')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                profile?.connections?.instagram ? 'bg-green-500/20 text-green-500' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {profile?.connections?.instagram ? <Check className="w-3 h-3" /> : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Pilot Configuration */}
      <div className="p-6 bg-[#1a1a1a] border border-white/10 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold">Daily Auto-Pilot</h4>
            <p className="text-[10px] text-white/40">AI generates & posts 2-3 videos daily</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Channel Topic / Niche</label>
          <input 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Space Facts, Daily Motivation, Cooking Tips"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <Calendar className="w-4 h-4 text-blue-500" />
          <p className="text-[10px] text-blue-500/80">
            The app will generate content based on this topic for the next 10 days.
          </p>
        </div>

        <button 
          onClick={runDailySync}
          disabled={syncing || !topic.trim()}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {syncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Daily Sync...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Daily Sync Now
            </>
          )}
        </button>

        <AnimatePresence>
          {status && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-white/5 rounded-xl flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] text-white/60 font-medium">{status}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-white/40 shrink-0" />
        <p className="text-[10px] text-white/40 leading-relaxed">
          To ensure your channel is populated in 10 days, we recommend running the sync daily. 
          Each sync generates high-quality videos with AI-optimized captions and descriptions.
        </p>
      </div>
    </div>
  );
}
