'use client';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Loader2, AlertCircle, Dumbbell } from 'lucide-react';
import Logo from './Logo';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Error al iniciar sesión.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0A0A0F] text-white p-6 relative overflow-hidden">
      {/* Background glow effects matching the logo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1A91FF]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF4D1C]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center w-full max-w-sm mb-12">
        <Logo className="w-48 h-48 mb-8 drop-shadow-[0_0_30px_rgba(26,145,255,0.15)]" />
        
        <h1 className="text-[40px] font-black tracking-tight leading-none mb-3 italic">
          <span>My</span><span className="text-[#1A91FF]">AI</span><span>ronCoach</span>
        </h1>
        
        <div className="flex items-center justify-center gap-[6px] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-white/50 w-full whitespace-nowrap">
          <span>TU ENTRENADOR.</span>
          <span className="text-[#1A91FF]">INTELIGENCIA.</span>
          <span>RESULTADOS.</span>
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-16 w-full opacity-80">
          <div className="h-px bg-gradient-to-r from-transparent to-[#1A91FF] flex-1 max-w-[80px]" />
          <div className="text-[#1A91FF]">
            {/* Custom Barbell SVG matching the logo */}
            <svg width="60" height="20" viewBox="0 0 60 20" fill="currentColor">
              <rect x="0" y="8" width="60" height="4" rx="2" />
              <rect x="15" y="4" width="8" height="12" rx="2" />
              <rect x="24" y="2" width="6" height="16" rx="2" />
              <rect x="30" y="2" width="6" height="16" rx="2" />
              <rect x="37" y="4" width="8" height="12" rx="2" />
            </svg>
          </div>
          <div className="h-px bg-gradient-to-l from-transparent to-[#1A91FF] flex-1 max-w-[80px]" />
        </div>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-bold py-4 px-8 rounded-full flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 hover:bg-slate-100 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Iniciar sesión con Google'}
        </button>
        
        {errorMsg && (
          <div className="mt-6 p-4 bg-red-500/10 text-red-400 rounded-2xl flex items-start gap-3 text-sm text-left border border-red-500/20 w-full backdrop-blur-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
