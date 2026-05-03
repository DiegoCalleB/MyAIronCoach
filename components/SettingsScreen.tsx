import React, { useState } from 'react';
import { db, auth, doc, updateDoc } from '../lib/firebase';
import { ArrowLeft, Loader2, LogOut, CheckCircle, Zap } from 'lucide-react';
import { signOut } from 'firebase/auth';

const GOALS = [
  { id: 'lose_weight', label: 'Perder peso' },
  { id: 'gain_muscle', label: 'Ganar músculo' },
  { id: 'endurance', label: 'Mejorar resistencia' },
  { id: 'flexibility', label: 'Flexibilidad' },
  { id: 'general', label: 'Bienestar general' },
];

export default function SettingsScreen({ profile, subscription, onBack, onUpdate, onGoPro }: { profile: any; subscription: any; onBack: () => void; onUpdate: (newProfile: any) => void; onGoPro: () => void }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState({
    age: profile?.age || '',
    weight: profile?.weight || '',
    height: profile?.height || '',
    goal: profile?.goal || 'general',
    material: profile?.material || ''
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
        height: parseFloat(data.height as string)
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
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 max-w-md mx-auto font-sans">
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-black text-slate-900">Ajustes</h1>
        </div>
        <button onClick={handleLogout} className="p-2.5 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2">
           <LogOut size={18} />
           <span className="text-xs font-bold hidden sm:block">Salir</span>
        </button>
      </div>

      <div className="px-4 py-6 overflow-y-auto">
        {!subscription?.isPro && (
          <div className="bg-gradient-to-r from-[#FF4D1C] to-orange-500 rounded-3xl p-5 text-white mb-8 shadow-lg shadow-orange-200">
            <div className="flex items-center gap-2 font-black text-lg mb-1 tracking-tight">
              <Zap size={20} fill="currentColor" />
              Hazte PRO
            </div>
            <p className="opacity-90 text-sm mb-4 leading-relaxed">
              Planes ilimitados, historial completo y sin anuncios.
            </p>
            <button 
              onClick={onGoPro}
              className="bg-white text-[#FF4D1C] w-full font-bold py-3 rounded-2xl text-sm active:scale-95 transition-transform"
            >
              Ver Planes
            </button>
          </div>
        )}

        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Mi Perfil</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700 ml-1">Edad</span>
            <input 
              type="number" 
              value={data.age} 
              onChange={e => setData({...data, age: e.target.value})} 
              className="p-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
              required 
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-700 ml-1">Peso (kg)</span>
              <input 
                type="number" 
                step="0.1"
                value={data.weight} 
                onChange={e => setData({...data, weight: e.target.value})} 
                className="p-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
                required 
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-700 ml-1">Altura (cm)</span>
              <input 
                type="number" 
                value={data.height} 
                onChange={e => setData({...data, height: e.target.value})} 
                className="p-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
                required 
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700 ml-1">Objetivo principal</span>
            <select 
              value={data.goal} 
              onChange={e => setData({...data, goal: e.target.value})} 
              className="p-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none"
            >
              {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700 ml-1">Material de entrenamiento</span>
            <textarea 
              value={data.material} 
              onChange={e => setData({...data, material: e.target.value})} 
              placeholder="¿Qué material tienes disponible? Ej: un par de mancuernas de 5kg, kettlebell, parque de calistenia, nada..."
              className="p-4 rounded-2xl bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none h-32" 
              required 
            />
          </label>

          <button 
            type="submit" 
            disabled={loading} 
            className="mt-6 bg-indigo-500 text-white font-black py-4 rounded-[28px] shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
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
