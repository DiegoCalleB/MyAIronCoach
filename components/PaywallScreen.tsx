import React from 'react';
import { Target, Zap, Infinity, ArrowLeft, ShieldCheck } from 'lucide-react';
import { setProStatus } from '../lib/subscription';

export default function PaywallScreen({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const handleUpgrade = () => {
    // Simulando pago real, asume que el usuario compra directamente
    setProStatus(true);
    // Notificamos al componente padre
    onSuccess();
  };

  const handleRestore = () => {
    // Lógica ficticia para restaurar compras
    alert("Si tienes una compra previa, contacta a soporte o inicia sesión con esa cuenta.");
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0A0A0F] text-white max-w-md mx-auto font-sans relative">
      <div className="p-4 z-10 flex border-b border-white/10 items-center gap-3">
        <button onClick={onBack} className="p-2.5 bg-white/5 rounded-xl text-white/70 hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <span className="text-white/40 font-bold tracking-widest text-[10px]">MyAIronCoach PRO</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1 bg-[#FF4D1C]/20 border border-[#FF4D1C]/30 text-[#FF4D1C] px-3 py-1 rounded-full text-xs font-black tracking-widest mb-4">
            <Zap size={14} fill="currentColor" /> ALCANZA TU MÁXIMO
          </div>
          <h1 className="text-4xl font-black tracking-tight leading-[1.1] mb-4">
            Desbloquea<br/>Todo tu<br/><span className="text-[#FF4D1C]">Potencial</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Pasa al siguiente nivel con planes ilimitados adaptados con IA para lograr tus objetivos sin restricciones.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
            <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-xl h-fit">
              <Infinity size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Planes Ilimitados</h3>
              <p className="text-white/50 text-xs">Crea tantas rutinas como quieras sin el límite de 10 planes.</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
            <div className="bg-blue-500/10 text-blue-500 p-2.5 rounded-xl h-fit">
              <Target size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Historial Completo</h3>
              <p className="text-white/50 text-xs">Revisa métricas y progresos de meses y años previos.</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4">
            <div className="bg-amber-500/10 text-amber-500 p-2.5 rounded-xl h-fit">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Sin Anuncios</h3>
              <p className="text-white/50 text-xs">Experiencia 100% inmersiva, limpia y rápida durante el entreno.</p>
            </div>
          </div>
        </div>

        <div className="bg-[#FF4D1C]/10 border border-[#FF4D1C]/30 rounded-3xl p-6 text-center">
          <div className="text-[#FF4D1C] font-black text-4xl mb-1 tracking-tighter">
            19.99€<span className="text-lg opacity-50 font-medium">/año</span>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">O 2.99€ al mes</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F] to-transparent z-20">
        <button 
          onClick={handleUpgrade}
          className="w-full bg-[#FF4D1C] hover:bg-[#ff6136] text-white font-black text-lg py-5 rounded-[24px] shadow-[0_0_40px_-5px_#FF4D1C] transition-all active:scale-95 mb-4"
        >
          OBTENER PRO
        </button>
        <div className="text-center">
          <button onClick={handleRestore} className="text-white/30 hover:text-white/60 text-xs underline underline-offset-4 transition-colors">
            Restaurar compra
          </button>
        </div>
      </div>
    </div>
  );
}
