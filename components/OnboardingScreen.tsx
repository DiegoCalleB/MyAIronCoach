'use client';
import { useState } from 'react';
import { db, auth, doc, setDoc } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

const GOALS = [
  { id: 'lose_weight', label: 'Perder peso' },
  { id: 'gain_muscle', label: 'Ganar músculo' },
  { id: 'endurance', label: 'Mejorar resistencia' },
  { id: 'flexibility', label: 'Flexibilidad' },
  { id: 'general', label: 'Bienestar general' },
];

export default function OnboardingScreen({ onComplete, user }: { onComplete: (profile: any) => void, user?: any }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: 'other',
    goal: 'general',
    material: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const profile = {
        name: user?.displayName || '',
        ...data,
        age: parseInt(data.age),
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        onboardingDone: true
      };
      await setDoc(doc(db, 'users', auth.currentUser.uid), profile);
      onComplete(profile);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-dark text-text-brand p-6">
      <h2 className="text-3xl font-bebas-neue tracking-widest text-silver-hi mb-6 uppercase">Completa tu perfil</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input type="number" placeholder="Edad" value={data.age} onChange={e => setData({...data, age: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani placeholder-muted transition-colors" required />
        <input type="number" step="0.1" placeholder="Peso (kg)" value={data.weight} onChange={e => setData({...data, weight: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani placeholder-muted transition-colors" required />
        <input type="number" placeholder="Altura (cm)" value={data.height} onChange={e => setData({...data, height: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani placeholder-muted transition-colors" required />
        <select value={data.gender} onChange={e => setData({...data, gender: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani transition-colors appearance-none">
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="other">Otro / Prefiero no decirlo</option>
        </select>
        <select value={data.goal} onChange={e => setData({...data, goal: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani transition-colors appearance-none">
          {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <textarea placeholder="Material disponible (ej: mancuernas, bandas, nada...)" value={data.material} onChange={e => setData({...data, material: e.target.value})} className="p-4 rounded-xl bg-panel border border-border-brand text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none font-rajdhani placeholder-muted transition-colors resize-y h-32" required />
        
        <button type="submit" disabled={loading} className="mt-4 w-full flex items-center justify-center gap-2 py-4 px-6 bg-b1 hover:bg-b2 text-white font-exo-2 font-bold uppercase tracking-[4px] text-sm rounded-full active:scale-95 transition-all shadow-[0_0_20px_rgba(26,143,255,0.4)]">
            {loading ? <Loader2 className="animate-spin text-white" /> : 'Guardar perfil'}
        </button>
      </form>
    </div>
  );
}
