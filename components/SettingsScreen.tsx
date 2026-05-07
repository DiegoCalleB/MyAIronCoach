import React, { useState } from 'react';
import { db, auth, doc, updateDoc } from '../lib/firebase';
import { ArrowLeft, Loader2, LogOut, CheckCircle, Zap } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useTheme } from './ThemeProvider';

const GOALS = [
  { id: 'lose_weight', label: 'Perder peso' },
  { id: 'gain_muscle', label: 'Ganar músculo' },
  { id: 'endurance', label: 'Mejorar resistencia' },
  { id: 'flexibility', label: 'Flexibilidad' },
  { id: 'general', label: 'Bienestar general' },
];

export default function SettingsScreen({ profile, subscription, onBack, onUpdate, onGoPro }: { profile: any; subscription: any; onBack: () => void; onUpdate: (newProfile: any) => void; onGoPro: () => void }) {
  const { theme, setThemeChoice } = useTheme();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState({
    age: profile?.age || '',
    weight: profile?.weight || '',
    height: profile?.height || '',
    gender: profile?.gender || 'other',
    goal: profile?.goal || 'general',
    material: profile?.material || '',
    baseLoads: profile?.baseLoads || '',
    hydrationFrequency: profile?.hydrationFrequency || 15, // Default 15 mins
    geminiApiKey: profile?.geminiApiKey || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setSuccess(false);
    try {
      const updatedProfile = {
        ...profile,
        ...data,
        age: parseInt(data.age as string),
        weight: parseFloat(data.weight as string),
        height: parseFloat(data.height as string),
        hydrationFrequency: parseInt(data.hydrationFrequency as string),
        geminiApiKey: data.geminiApiKey || ''
      };
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedProfile);
      onUpdate(updatedProfile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-dark text-text-brand max-w-md mx-auto font-sans">
      <div className="bg-dark border-b border-border-brand px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-dark2 rounded-xl text-silver-lo hover:bg-panel border border-border-brand transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bebas-neue tracking-widest text-silver-hi">Ajustes</h1>
        </div>
        <button onClick={handleLogout} className="p-2.5 text-rose-500 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 transition-colors flex items-center gap-2">
           <LogOut size={18} />
           <span className="text-xs font-bold hidden sm:block tracking-widest uppercase font-exo-2 text-rose-400">Salir</span>
        </button>
      </div>

      <div className="px-4 py-6 overflow-y-auto">
        {!subscription?.isPro && (
          <div className="bg-gradient-to-r from-b1 to-[rgba(128,216,255,0.4)] rounded-3xl p-5 text-white mb-8 shadow-[0_0_30px_rgba(26,143,255,0.2)]">
            <div className="flex items-center gap-2 font-bebas-neue tracking-widest text-3xl mb-1 mt-1">
              <Zap size={24} fill="currentColor" className="text-b4" />
              Hazte PRO
            </div>
            <p className="text-silver-hi font-rajdhani font-medium text-sm mb-4 leading-relaxed">
              Planes ilimitados, historial completo y sin anuncios.
            </p>
            <button 
              onClick={onGoPro}
              className="bg-silver-hi text-dark2 w-full font-bold py-3 rounded-full text-[11px] uppercase tracking-widest font-exo-2 active:scale-95 transition-transform"
            >
              Ver Planes
            </button>
          </div>
        )}

        <div className="mb-8 p-4 bg-dark2 border border-border-brand rounded-2xl flex flex-col gap-3 shadow-sm">
          <div>
            <h3 className="text-sm font-exo-2 font-bold tracking-widest uppercase text-silver-hi">Aspecto visual</h3>
            <p className="text-xs text-silver-lo font-medium mt-1">Elige tu tema favorito</p>
          </div>
          <div className="flex bg-panel border border-border-brand p-1 rounded-xl relative overflow-hidden gap-1">
            <button 
              onClick={() => setThemeChoice('dark')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors z-10 ${theme === 'dark' ? 'bg-b1 text-white shadow-sm' : 'text-silver-lo hover:text-silver-hi'}`}
            >
              Oscuro
            </button>
            <button 
              onClick={() => setThemeChoice('light-neutral')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors z-10 ${theme === 'light-neutral' ? 'bg-b1 text-white shadow-sm' : 'text-silver-lo hover:text-silver-hi'}`}
            >
              Claro
            </button>
            <button 
              onClick={() => setThemeChoice('light')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors z-10 ${theme === 'light' ? 'bg-b1 text-white shadow-sm' : 'text-silver-lo hover:text-silver-hi'}`}
            >
              Suave
            </button>
          </div>
        </div>

        <h2 className="text-xs font-exo-2 font-bold text-silver-lo uppercase tracking-[4px] mb-4">Mi Perfil</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Edad</span>
              <input 
                type="number" 
                value={data.age} 
                onChange={e => setData({...data, age: e.target.value})} 
                className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all font-rajdhani placeholder-muted" 
                required 
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Peso (kg)</span>
              <input 
                type="number" 
                step="0.1"
                value={data.weight} 
                onChange={e => setData({...data, weight: e.target.value})} 
                className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all font-rajdhani placeholder-muted" 
                required 
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Altura (cm)</span>
              <input 
                type="number" 
                value={data.height} 
                onChange={e => setData({...data, height: e.target.value})} 
                className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all font-rajdhani placeholder-muted" 
                required 
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Sexo</span>
              <select 
                value={data.gender} 
                onChange={e => setData({...data, gender: e.target.value})} 
                className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all appearance-none font-rajdhani"
              >
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
                <option value="other">Otro</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Objetivo principal</span>
            <select 
              value={data.goal} 
              onChange={e => setData({...data, goal: e.target.value})} 
              className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all appearance-none font-rajdhani"
            >
              {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Frecuencia de Hidratación (minutos)</span>
            <input 
              type="number" 
              value={data.hydrationFrequency} 
              onChange={e => setData({...data, hydrationFrequency: e.target.value})} 
              className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all font-rajdhani placeholder-muted" 
              required 
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Material de entrenamiento</span>
            <textarea 
              value={data.material} 
              onChange={e => setData({...data, material: e.target.value})} 
              placeholder="¿Qué material tienes disponible? Ej: un par de mancuernas de 5kg, kettlebell, parque de calistenia, nada..."
              className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all resize-none h-32 font-rajdhani placeholder-muted" 
              required 
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Mis marcas y cargas (Opcional)</span>
            <textarea 
              value={data.baseLoads} 
              onChange={e => setData({...data, baseLoads: e.target.value})} 
              placeholder="¿Qué pesos sueles mover? Ej: Sentadilla libre 80kg, polea tríceps 20kg, press mancuernas 15kg. La IA usará esto para sugerirte pesos."
              className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all resize-none h-24 font-rajdhani placeholder-muted" 
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-exo-2 font-semibold tracking-widest uppercase text-silver-mid ml-1">Clave de API de Gemini (Opcional)</span>
            <input 
              type="password" 
              value={data.geminiApiKey} 
              onChange={e => setData({...data, geminiApiKey: e.target.value})} 
              placeholder="AIza..."
              className="p-4 rounded-2xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none transition-all font-rajdhani placeholder-muted" 
            />
            <span className="text-[10px] text-silver-lo ml-1 mt-1">
              Si se excede la cuota de la prueba, pega aquí tu propia API Key.  Obtenla de <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-b1 underline">Google AI Studio</a>. Se guarda en tu perfil.
            </span>
          </label>

          <button 
            type="submit" 
            disabled={loading} 
            className="mt-6 bg-b1 text-white py-4 rounded-full shadow-[0_0_20px_rgba(26,143,255,0.4)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 font-exo-2 font-bold tracking-widest uppercase text-sm"
          >
            {loading ? <Loader2 className="animate-spin" /> : 
             success ? <><CheckCircle size={20} /> ¡Guardado!</> : 
             'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}
