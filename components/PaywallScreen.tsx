import React from 'react';
import { Target, Zap, Infinity, ArrowLeft, ShieldCheck } from 'lucide-react';
import LogoText from './LogoText';
import { setProStatus } from '../lib/subscription';

export default function PaywallScreen({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const handleUpgrade = () => {
    setProStatus(true);
    onSuccess();
  };

  const handleRestore = () => {
    alert("Si tienes una compra previa, contacta a soporte o inicia sesión con esa cuenta.");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-dark text-text-brand max-w-md mx-auto font-sans relative">
      {/* Background glow effects matching the logo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[radial-gradient(ellipse_at_center,rgba(0,80,255,0.15)_0%,rgba(26,143,255,0.05)_35%,transparent_70%)] pointer-events-none" />

      <div className="p-4 z-10 flex border-b border-border-brand items-center gap-3">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl text-silver-lo hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          <LogoText 
            className="text-[15px] tracking-[2px] leading-none" 
            myClassName="text-[10px] font-light tracking-[2px] mr-[1px]" 
          />
          <span className="text-silver-lo font-exo-2 font-bold tracking-widest text-[10px] uppercase">PRO</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 pb-32 z-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1 bg-b1/20 border border-b1/30 text-b3 px-3 py-1 rounded-full text-[11px] font-exo-2 font-semibold tracking-widest mb-4 uppercase">
            <Zap size={14} fill="currentColor" /> ALCANZA TU MÁXIMO
          </div>
          <h1 className="text-[48px] font-bebas-neue tracking-widest leading-[1.1] mb-4">
            Desbloquea<br/>Todo tu<br/><span className="bg-gradient-to-br from-[#60B8FF] to-b3 bg-clip-text text-transparent">Potencial</span>
          </h1>
          <p className="text-silver-lo text-lg font-rajdhani font-medium leading-relaxed">
            Pasa al siguiente nivel con planes ilimitados adaptados con IA para lograr tus objetivos sin restricciones.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-dark2 border border-border-brand rounded-2xl p-4 flex gap-4">
            <div className="bg-b1/10 text-b3 p-2.5 rounded-xl h-fit">
              <Infinity size={24} />
            </div>
            <div>
              <h3 className="font-bold text-silver-hi mb-1">Planes Ilimitados</h3>
              <p className="text-silver-lo text-sm font-medium">Crea tantas rutinas como quieras sin el límite de 10 planes.</p>
            </div>
          </div>
          <div className="bg-dark2 border border-border-brand rounded-2xl p-4 flex gap-4">
            <div className="bg-b1/10 text-b3 p-2.5 rounded-xl h-fit">
              <Target size={24} />
            </div>
            <div>
              <h3 className="font-bold text-silver-hi mb-1">Historial Completo</h3>
              <p className="text-silver-lo text-sm font-medium">Revisa métricas y progresos de meses y años previos.</p>
            </div>
          </div>
          <div className="bg-dark2 border border-border-brand rounded-2xl p-4 flex gap-4">
            <div className="bg-b1/10 text-b3 p-2.5 rounded-xl h-fit">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-silver-hi mb-1">Sin Anuncios</h3>
              <p className="text-silver-lo text-sm font-medium">Experiencia 100% inmersiva, limpia y rápida durante el entreno.</p>
            </div>
          </div>
        </div>

        <div className="bg-panel border border-border-brand rounded-3xl p-6 text-center">
          <div className="text-silver-hi font-bebas-neue tracking-widest text-5xl mb-1">
            19.99€<span className="text-xl opacity-50 font-rajdhani font-medium tracking-normal">/año</span>
          </div>
          <p className="text-silver-lo text-[10px] uppercase font-exo-2 tracking-widest font-bold">O 2.99€ al mes</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-dark via-dark to-transparent z-20">
        <button 
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-b1 to-b3 hover:opacity-90 text-white font-exo-2 font-bold text-sm uppercase tracking-[4px] py-5 rounded-full shadow-[0_0_40px_-5px_rgba(26,143,255,0.4)] transition-all active:scale-95 mb-4"
        >
          OBTENER PRO
        </button>
        <div className="text-center">
          <button onClick={handleRestore} className="text-silver-lo hover:text-silver-hi text-xs font-medium underline underline-offset-4 transition-colors">
            Restaurar compra
          </button>
        </div>
      </div>
    </div>
  );
}
