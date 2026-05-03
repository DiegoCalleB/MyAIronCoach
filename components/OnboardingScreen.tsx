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
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0A0A0F] text-white p-6">
      <h2 className="text-2xl font-black mb-6">Completa tu perfil</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input type="number" placeholder="Edad" value={data.age} onChange={e => setData({...data, age: e.target.value})} className="p-4 rounded-xl bg-slate-800" required />
        <input type="number" placeholder="Peso (kg)" value={data.weight} onChange={e => setData({...data, weight: e.target.value})} className="p-4 rounded-xl bg-slate-800" required />
        <input type="number" placeholder="Altura (cm)" value={data.height} onChange={e => setData({...data, height: e.target.value})} className="p-4 rounded-xl bg-slate-800" required />
        <select value={data.goal} onChange={e => setData({...data, goal: e.target.value})} className="p-4 rounded-xl bg-slate-800">
          {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <textarea placeholder="Material en casa (ej: mancuernas, bandas, nada...)" value={data.material} onChange={e => setData({...data, material: e.target.value})} className="p-4 rounded-xl bg-slate-800" required />
        
        <button type="submit" disabled={loading} className="mt-4 bg-[#FF4D1C] text-white font-bold py-4 rounded-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Guardar perfil'}
        </button>
      </form>
    </div>
  );
}
