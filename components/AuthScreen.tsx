'use client';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Loader2, AlertCircle, Dumbbell } from 'lucide-react';
import Logo from './Logo';

import LogoText from './LogoText';

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
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-dark text-text-brand p-6 relative overflow-hidden">
      {/* Background glow effects matching the logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(0,80,255,0.25)_0%,rgba(26,143,255,0.1)_35%,transparent_70%)] pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />

      <div className="z-10 flex flex-col items-center text-center w-full max-w-sm mb-12">
        <Logo className="w-48 h-48 mb-8 drop-shadow-[0_0_60px_rgba(26,143,255,0.5)]" />
        
        <h1 className="mb-3">
          <LogoText 
            className="text-[48px] tracking-[4px] leading-none" 
            myClassName="text-[24px] font-light tracking-[4px] mr-1" 
          />
        </h1>
        
        <div className="flex items-center justify-center gap-[6px] text-[11px] font-exo-2 font-bold tracking-[5px] uppercase mb-12 text-silver-lo w-full whitespace-nowrap">
          <span>TU ENTRENADOR.</span>
          <span className="text-b3">INTELIGENCIA.</span>
          <span>RESULTADOS.</span>
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-16 w-full opacity-80">
          <div className="h-px bg-gradient-to-r from-transparent to-[rgba(64,192,255,0.3)] flex-1 max-w-[80px]" />
          <div className="text-[#1A6FFF]">
            {/* Custom Barbell SVG matching the logo */}
            <svg width="44" height="15" viewBox="0 0 44 15" fill="none">
              <rect x="0" y="3.5" width="8" height="8" rx="4" fill="#1A6FFF" opacity=".8"/>
              <rect x="4" y="5.5" width="5" height="4" rx="2" fill="#40B0FF"/>
              <rect x="9" y="6.5" width="26" height="2" rx="1" fill="#1A6FFF" opacity=".6"/>
              <rect x="35" y="5.5" width="5" height="4" rx="2" fill="#40B0FF"/>
              <rect x="36" y="3.5" width="8" height="8" rx="4" fill="#1A6FFF" opacity=".8"/>
            </svg>
          </div>
          <div className="h-px bg-gradient-to-l from-transparent to-[rgba(64,192,255,0.3)] flex-1 max-w-[80px]" />
        </div>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-silver-hi text-dark2 font-exo-2 font-bold py-4 px-8 rounded-full flex items-center justify-center gap-3 transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 hover:bg-white shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] uppercase tracking-widest text-sm"
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
