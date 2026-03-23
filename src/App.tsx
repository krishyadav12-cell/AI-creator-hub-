import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut } from './firebase';
import { UserProfile, Plan, TOOLS, ToolType } from './types';
import Auth from './components/Auth';
import Home from './components/Home';
import Chat from './components/Chat';
import ImageGen from './components/ImageGen';
import PromptEnhancer from './components/PromptEnhancer';
import SocialGen from './components/SocialGen';
import SongGen from './components/SongGen';
import VideoGen from './components/VideoGen';
import History from './components/History';
import AutoPoster from './components/AutoPoster';
import Subscription from './components/Subscription';
import { Loader2, LogOut, User as UserIcon, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<string>('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const isAdmin = u.email === "skybrand12321@gmail.com";
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || 'User',
            photoURL: u.photoURL || '',
            plan: isAdmin ? 'admin' : 'free',
            createdAt: serverTimestamp(),
            lastDailyReset: serverTimestamp(),
            dailyUsageCount: 0
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }

        onSnapshot(userRef, (doc) => {
          setProfile(doc.data() as UserProfile);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home': return <Home onNavigate={setCurrentScreen} profile={profile} />;
      case TOOLS.CHAT: return <Chat onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.IMAGE: return <ImageGen onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.PROMPT_ENHANCER: return <PromptEnhancer onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.SOCIAL_GEN: return <SocialGen onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.SONG_GEN: return <SongGen onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.VIDEO_GEN: return <VideoGen onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.HISTORY: return <History onBack={() => setCurrentScreen('home')} profile={profile} />;
      case TOOLS.AUTO_POSTER: return <AutoPoster onBack={() => setCurrentScreen('home')} profile={profile} />;
      case 'subscription': return <Subscription onBack={() => setCurrentScreen('home')} profile={profile} />;
      default: return <Home onNavigate={setCurrentScreen} profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentScreen('home')}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-bold text-lg">A</span>
          </div>
          <h1 className="font-bold text-lg tracking-tight">AI Creator Hub</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentScreen('subscription')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              profile?.plan === 'premium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
              profile?.plan === 'basic' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
              'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {profile?.plan?.toUpperCase()}
          </button>
          
          <div className="relative group">
            <img 
              src={profile?.photoURL || 'https://picsum.photos/seed/user/100/100'} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-white/10"
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-sm font-medium truncate">{profile?.displayName}</p>
                <p className="text-xs text-white/40 truncate">{profile?.email}</p>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-6 px-4 max-w-lg mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
