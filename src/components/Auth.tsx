import React from 'react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { LogIn, Sparkles, Zap, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-8 relative z-10"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            AI Creator Hub
          </h1>
          <p className="text-white/60 text-lg max-w-xs mx-auto">
            Your all-in-one mobile creative studio powered by Gemini AI.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-left">
          {[
            { icon: Zap, title: "Fast", desc: "Instant AI results" },
            { icon: ShieldCheck, title: "Secure", desc: "Firebase Auth" },
            { icon: Globe, title: "Global", desc: "Multilingual AI" },
            { icon: Sparkles, title: "Creative", desc: "Multi-modal AI" }
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
              <item.icon className="w-5 h-5 text-blue-500" />
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-white/40">{item.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleSignIn}
          className="w-full py-4 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all shadow-xl shadow-white/10 active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="text-xs text-white/30">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
