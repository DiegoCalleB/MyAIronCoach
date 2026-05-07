/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Activity, 
  Zap, Menu, X, List, ScanLine, Loader2, ArrowLeft,
  Droplets, Pill, Target, Trophy, Flame, Clock, ChevronRight,
  Dumbbell, Heart, Star, Calendar, Settings2, Plus, Minus, CheckCircle, Save, Download, CloudOff, Check, MapPin, Home
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { useAuth } from '../components/FirebaseProvider';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import SettingsScreen from '../components/SettingsScreen';
import PaywallScreen from '../components/PaywallScreen';
import LogoText from '../components/LogoText';
import Logo from '../components/Logo';
import { db, doc, getDoc, auth } from '../lib/firebase';
import { incrementPlanCount, setProStatus } from '../lib/subscription';

let globalAudioCtx: AudioContext | null = null;

// --- TIPOS ---
type Exercise = {
  title: string;
  round: string;
  type: string;
  duration: number; // Duración en segundos (estimada si es por repeticiones)
  reps?: string;    // Ej: "10-12", "Al fallo"
  color: string;
  border: string;
  desc: string;
  calories?: number;
  baseCalories?: number;
  weight?: string;
  actualWeight?: string;
  wgerImageUrl?: string;
};

type WorkoutSummary = {
  planName?: string;
  workoutPlan: Exercise[];
  tips: {
    hydration: string;
    supplementation: string;
    general: string;
  };
};

type WorkoutRecord = {
  id: string;
  date: string; // ISO string
  workoutName: string;
  totalDuration: number; // segundos
  exercisesCompleted: number;
  totalExercises: number;
  completedFully: boolean;
  totalCalories?: number;
  exerciseStats?: { name: string; reps?: string; durationSeconds: number; calories?: number; weightUsed?: string }[];
  workoutSummary?: WorkoutSummary;
};

type SavedPlan = {
  id: string;
  name: string;
  date: string;
  workoutSummary: WorkoutSummary;
  isOfflineReady?: boolean;
};

type UserProfile = {
  name: string;
  goal: 'lose_weight' | 'gain_muscle' | 'endurance' | 'flexibility' | 'general';
  level: 'beginner' | 'intermediate' | 'advanced';
  onboardingDone: boolean;
  age?: number;
  weight?: number;
  height?: number;
  gender?: 'male' | 'female' | 'other';
  material?: string;
  baseLoads?: string;
  hydrationFrequency?: number;
  geminiApiKey?: string;
};

const GOALS = [
  { id: 'lose_weight', icon: '🔥', label: 'Perder peso', color: 'border-b1 bg-b1/10 text-b1' },
  { id: 'gain_muscle', icon: '💪', label: 'Ganar músculo', color: 'border-b2 bg-b2/10 text-b2' },
  { id: 'endurance', icon: '🏃', label: 'Mejorar resistencia', color: 'border-b3 bg-b3/10 text-b3' },
  { id: 'flexibility', icon: '🧘', label: 'Flexibilidad', color: 'border-b4 bg-b4/10 text-b4' },
  { id: 'general', icon: '⭐', label: 'Bienestar general', color: 'border-b1 bg-b1/10 text-b1' },
];

const LEVELS = [
  { id: 'beginner', icon: '🌱', label: 'Principiante', desc: 'Empiezo ahora o llevo poco tiempo' },
  { id: 'intermediate', icon: '🌿', label: 'Intermedio', desc: 'Entreno con regularidad' },
  { id: 'advanced', icon: '🌳', label: 'Avanzado', desc: 'Entreno intensamente hace tiempo' },
];

type SubscriptionParams = {
  planCount: number;
  isPro: boolean;
};

// --- UTILS DE PERSISTENCIA ---
const STORAGE_KEYS = {
  PROFILE: 'fitapp_profile',
  HISTORY: 'fitapp_history',
  PLAN: 'fitapp_current_plan',
  SUBSCRIPTION: 'fitapp_subscription',
  SAVED_PLANS: 'fitapp_saved_plans',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn('localStorage no disponible');
  }
}

const defaultWorkout: WorkoutSummary = {
  planName: "Mi Rutina",
  workoutPlan: [
    { title: "Rotaciones de Brazos", round: "CALENTAMIENTO", type: "WARMUP", duration: 60, color: "text-amber-500", border: "border-amber-200", desc: "Movimientos amplios, calentamiento articular de hombros.", calories: 5 },
    { title: "Sentadillas", round: "1", type: "STRENGTH", duration: 45, reps: "15", color: "text-b2", border: "border-b2", desc: "Mantén la espalda recta y baja controladamente.", calories: 12 },
    { title: "Descanso", round: "1", type: "RECOVERY", duration: 15, color: "text-teal-500", border: "border-teal-200", desc: "Recuperación activa.", calories: 1 },
    { title: "Jumping Jacks", round: "2", type: "ENDURANCE", duration: 45, reps: "Al fallo", color: "text-rose-500", border: "border-rose-200", desc: "Mantén un ritmo constante para elevar pulsaciones.", calories: 15 },
    { title: "Descanso", round: "2", type: "RECOVERY", duration: 15, color: "text-teal-500", border: "border-teal-200", desc: "Recuperación e hidratación.", calories: 1 },
    { title: "Estiramientos", round: "FINAL", type: "RECOVERY", duration: 60, color: "text-blue-500", border: "border-blue-200", desc: "Estiramiento estático para relajar la musculatura.", calories: 4 },
    { title: "Entrenamiento Completado", round: "ÉXITO", type: "COMPLETE", duration: 10, color: "text-violet-500", border: "border-violet-200", desc: "Rutina completada de forma satisfactoria.", calories: 0 }
  ],
  tips: {
    hydration: "Mantén una hidratación constante durante el entrenamiento.",
    supplementation: "Considera una ingesta de proteína o carbohidratos tras finalizar.",
    general: "La técnica es prioritaria sobre la velocidad o el peso."
  }
};

// --- PANTALLA ONBOARDING ---


// --- PANTALLA CARGA / WARMUP ---
function LoadingScreen() {
  const [timeLeft, setTimeLeft] = useState(60);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  const totalDuration = 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="absolute inset-0 bg-dark z-[100] flex flex-col items-center justify-center px-6">
      <h2 className="text-3xl font-bebas-neue tracking-widest text-silver-hi mb-3 text-center leading-none">
        PREPARANDO TU PLAN...
      </h2>
      <p className="text-sm text-silver-lo font-rajdhani text-center mb-8 flex items-center justify-center gap-2 font-medium">
        <Loader2 className="animate-spin text-b1" size={16} /> Analizando tu perfil
      </p>

      <div className="w-full max-w-sm bg-dark2 border border-border-brand rounded-3xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 bg-gradient-to-r from-b1 to-b2 h-1.5 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
        
        <div className="flex flex-col items-center text-center">
          <div className="text-[10px] text-b3 font-exo-2 font-bold tracking-[4px] uppercase mb-5">Comienza con el calentamiento</div>
          
          <h3 className="text-2xl font-bebas-neue tracking-widest text-text-brand mb-3 leading-none drop-shadow-md">Movilidad Articular</h3>
          <p className="text-sm text-silver-lo font-rajdhani mb-8 font-medium leading-relaxed">
            Realiza rotaciones suaves de cuello, hombros, muñecas, cadera y tobillos para preparar tus articulaciones.
          </p>
          
          <div className="text-7xl font-bebas-neue text-b1 tracking-widest tabular-nums leading-none drop-shadow-[0_0_15px_rgba(26,143,255,0.6)] animate-pulse">
            {timeStr}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PANTALLA HISTORIAL ---
function HistoryScreen({ history, savedPlans = [], onLoadPlan, onDeletePlan, onDownloadPlan, profile, onBack, subscription }: { history: WorkoutRecord[], savedPlans?: SavedPlan[], onLoadPlan?: (plan: SavedPlan) => void, onDeletePlan?: (id: string) => void, onDownloadPlan?: (plan: SavedPlan) => void, profile: UserProfile, onBack: () => void, subscription: SubscriptionParams }) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const displayHistory = useMemo(() => {
    let sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!subscription.isPro) {
      sorted = sorted.filter(h => new Date(h.date) >= cutoffDate);
    }
    return sorted;
  }, [history, subscription.isPro, cutoffDate]);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    let checkDate = new Date(today);
    const daySet = new Set(history.map(h => new Date(h.date).toDateString()));
    while (daySet.has(checkDate.toDateString())) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  }, [history]);

  const totalMinutes = useMemo(() => Math.round(history.reduce((acc, h) => acc + h.totalDuration, 0) / 60), [history]);
  const completedCount = useMemo(() => history.filter(h => h.completedFully).length, [history]);
  const totalCalories = useMemo(() => Math.round(history.reduce((acc, h) => acc + (h.totalCalories || 0), 0)), [history]);

  const todayStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayWorkouts = history.filter(h => new Date(h.date).toDateString() === todayStr);
    const aggregated: Record<string, { seconds: number, reps: string, weightUsed: string }> = {};
    
    todayWorkouts.forEach(workout => {
      if (workout.exerciseStats) {
        workout.exerciseStats.forEach(stat => {
          if (!aggregated[stat.name]) {
            aggregated[stat.name] = { seconds: 0, reps: stat.reps || '', weightUsed: stat.weightUsed || '' };
          }
          aggregated[stat.name].seconds += stat.durationSeconds;
          if (stat.reps && !aggregated[stat.name].reps.includes(stat.reps)) {
            aggregated[stat.name].reps += `, ${stat.reps}`;
          }
          if (stat.weightUsed && !aggregated[stat.name].weightUsed.includes(stat.weightUsed)) {
            aggregated[stat.name].weightUsed += (aggregated[stat.name].weightUsed ? `, ${stat.weightUsed}` : stat.weightUsed);
          }
        });
      }
    });
    
    return Object.entries(aggregated).map(([name, data]) => ({
      name,
      seconds: data.seconds,
      reps: data.reps,
      weightUsed: data.weightUsed
    })).sort((a,b) => b.seconds - a.seconds);
  }, [history]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`;
  };

  const chartData = useMemo(() => {
    if (displayHistory.length === 0) return [];

    const chronos = [...displayHistory].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Agrupar por día real
    const aggregated: Record<string, { dateStr: string, label: string, minutos: number, calorias: number }> = {};

    chronos.forEach(h => {
      const dateStr = new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      if (!aggregated[dateStr]) {
        aggregated[dateStr] = { dateStr, label: dateStr, minutos: 0, calorias: 0 };
      }
      aggregated[dateStr].minutos += (h.totalDuration / 60);
      aggregated[dateStr].calorias += (h.totalCalories || 0);
    });

    return Object.values(aggregated).map(item => ({
      ...item,
      minutos: Math.round(item.minutos),
      calorias: Math.round(item.calorias)
    }));
  }, [displayHistory]);

  const chartConfig = useMemo(() => {
    // Usar calorías para pérdida de peso o resistencia, y minutos para hipertrofia o general
    if (profile.goal === 'lose_weight' || profile.goal === 'endurance') {
      return { dataKey: 'calorias', color: '#14b8a6', title: 'Calorías Quemadas', unit: 'kcal' };
    }
    return { dataKey: 'minutos', color: '#8b5cf6', title: 'Minutos de Actividad', unit: 'min' };
  }, [profile.goal]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-dark text-text-brand max-w-md mx-auto font-sans">
      {/* Header */}
      <div className="bg-dark border-b border-border-brand px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2.5 bg-dark2 rounded-xl text-silver-lo hover:bg-panel border border-border-brand transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bebas-neue tracking-widest text-silver-hi">Mi Historial</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5 overflow-y-auto pb-10">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-orange-100">
            <Flame size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{streak}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Racha días</div>
          </div>
          <div className="bg-gradient-to-br from-b1 to-b2 rounded-2xl p-4 text-white text-center shadow-lg shadow-blue-100">
            <Trophy size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{completedCount}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Completados</div>
          </div>
          <div className="bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-teal-100">
            <Clock size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{totalMinutes}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Minutos</div>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-purple-100">
            <Activity size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{totalCalories}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Kcal</div>
          </div>
        </div>

        {/* Progreso Visual Chart */}
        {chartData.length > 0 && (
          <div className="bg-dark2 rounded-3xl p-5 border border-border-brand shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-exo-2 font-bold uppercase tracking-widest text-silver-hi">{chartConfig.title}</h2>
                <p className="text-xs text-silver-lo font-medium mt-0.5">Basado en tu historial</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${chartConfig.color}20`, color: chartConfig.color }}>
                <Activity size={16} strokeWidth={3} />
              </div>
            </div>
            
            <div className="h-48 w-full mr-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: chartConfig.color, fontWeight: 'bold' }}
                    labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
                    formatter={(value: any) => [`${value} ${chartConfig.unit}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartConfig.dataKey} 
                    stroke={chartConfig.color} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!subscription.isPro && history.length > 0 && (
          <div className="bg-dark2 rounded-2xl p-4 border border-border-brand flex items-start gap-4 shadow-lg mb-4">
            <div className="bg-panel p-2 rounded-xl text-amber-400 shrink-0">
              <Star size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-silver-hi mb-1">Historial Limitado</p>
              <p className="text-xs text-silver-lo leading-relaxed">En el plan gratuito solo ves los últimos 7 días. Con PRO guardas todo para siempre.</p>
            </div>
          </div>
        )}

        {/* Streak banner */}
        {streak >= 2 && (
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-amber-100 mb-6">
            <span className="text-3xl">🔥</span>
            <div className="text-white">
              <p className="font-black text-base">{streak} días seguidos, {profile?.name ? profile.name.split(' ')[0] : (auth.currentUser?.displayName ? auth.currentUser.displayName.split(' ')[0] : 'Atleta')}!</p>
              <p className="text-xs opacity-80">¡No rompas la racha! Entrena hoy.</p>
            </div>
          </div>
        )}

        {/* Resumen Diario */}
        {todayStats.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-exo-2 font-bold text-silver-lo uppercase tracking-[4px] mb-3">Tus Números de Hoy</h2>
            <div className="bg-dark2 rounded-3xl p-5 border border-border-brand shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-b1/10 flex items-center justify-center shrink-0">
                  <Target size={16} className="text-b3" />
                </div>
                <div>
                  <h3 className="text-sm font-exo-2 font-bold tracking-widest uppercase text-silver-hi leading-tight">Total Acumulado</h3>
                  <p className="text-xs text-silver-lo font-medium">Ejercicios realizados hoy</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {todayStats.map((stat, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-silver-hi truncate mr-2">{stat.name}</span>
                      <span className="text-b3 font-black shrink-0 whitespace-nowrap">
                         {formatDuration(stat.seconds)}
                      </span>
                    </div>
                    {stat.reps && <p className="text-xs text-silver-lo font-medium truncate block">Repeticiones aprox: {stat.reps.replace(/^, /, '')}</p>}
                    {stat.weightUsed && <p className="text-xs text-rose-400 font-bold truncate block">Carga: {stat.weightUsed.replace(/^, /, '')}</p>}
                    <div className="w-full bg-panel h-1.5 rounded-full mt-1">
                      <div className="bg-b1 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(5, (stat.seconds / 300) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Planes Guardados */}
        {savedPlans && savedPlans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-exo-2 font-bold text-silver-lo uppercase tracking-[4px] mb-3">Tus Planes Guardados</h2>
            <div className="flex flex-col gap-3">
              {savedPlans.map(plan => (
                <div key={plan.id} className="bg-dark2 rounded-2xl p-4 border border-b1/30 shadow-lg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-b1/10 flex items-center justify-center shrink-0">
                    <Save size={18} className="text-b1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-silver-hi text-sm truncate flex items-center gap-2">
                       {plan.name}
                       {plan.isOfflineReady && <Check size={14} className="text-b3" />}
                    </p>
                    <p className="text-xs text-silver-lo mt-0.5">{new Date(plan.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {!plan.isOfflineReady && (
                      <button onClick={() => onDownloadPlan && onDownloadPlan(plan)} className="p-2 text-silver-lo hover:text-b3 hover:bg-b3/10 rounded-lg transition-colors" title="Descargar para uso sin conexión">
                        <Download size={16} />
                      </button>
                    )}
                    <button onClick={() => onLoadPlan && onLoadPlan(plan)} className="p-2 text-b1 bg-b1/10 hover:bg-b1/20 rounded-lg transition-colors font-bold text-xs uppercase tracking-widest">
                      <Play size={16} fill="currentColor" />
                    </button>
                    <button onClick={() => onDeletePlan && onDeletePlan(plan.id)} className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        <div>
          <h2 className="text-xs font-exo-2 font-bold text-silver-lo uppercase tracking-[4px] mb-3">Entrenamientos</h2>
          {displayHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="text-5xl">🏃</div>
              <p className="text-silver-lo font-medium text-sm">Aún no hay entrenamientos.<br/>¡Completa tu primero hoy!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayHistory.map((record) => (
                <div key={record.id} className={`bg-dark2 rounded-2xl p-4 border shadow-lg flex items-center gap-4 ${record.completedFully ? 'border-b1/30' : 'border-border-brand'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${record.completedFully ? 'bg-b1/10' : 'bg-panel'}`}>
                    {record.completedFully ? <Trophy size={18} className="text-b3" /> : <Dumbbell size={18} className="text-silver-lo" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-silver-hi text-sm truncate">{record.workoutName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-silver-lo">{formatDate(record.date)}</span>
                      <span className="text-muted">•</span>
                      <span className="text-xs text-silver-lo">{formatDuration(record.totalDuration)}</span>
                      <span className="text-muted">•</span>
                      <span className="text-xs text-silver-lo">{record.exercisesCompleted}/{record.totalExercises} ejercicios</span>
                      {record.totalCalories && (
                        <>
                          <span className="text-muted">•</span>
                          <span className="text-xs text-amber-500 font-bold">{record.totalCalories} kcal</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.completedFully && !record.workoutSummary && <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />}
                    {record.workoutSummary && (
                      <button onClick={() => onLoadPlan && onLoadPlan({ id: record.id, name: record.workoutName, date: record.date, workoutSummary: record.workoutSummary! })} className="p-2 text-b1 bg-b1/10 hover:bg-b1/20 rounded-lg transition-colors font-bold text-xs uppercase tracking-widest" title="Volver a hacer esta rutina">
                        <Play size={16} fill="currentColor" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// --- APP PRINCIPAL ---
export default function App() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingProfile(true);
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) setProfile(snap.data());
        setLoadingProfile(false);
      });
    }
  }, [user]);
  
  if (loading || loadingProfile) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark">
        <Loader2 className="animate-spin text-b1" size={48} />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile) {
    return <OnboardingScreen onComplete={setProfile} user={user} />;
  }

  return <MainApp profile={profile} onUpdateProfile={setProfile} />;
}

function MainApp({ profile, onUpdateProfile }: { profile: any; onUpdateProfile: (newProfile: any) => void }) {
  const [history, setHistory] = useState<WorkoutRecord[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [workoutData, setWorkoutData] = useState<WorkoutSummary>(defaultWorkout);
  const [currentView, setCurrentView] = useState<'home' | 'timer' | 'history' | 'settings'>('home');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionParams>({ planCount: 0, isPro: false });
  const [pendingWorkoutRequest, setPendingWorkoutRequest] = useState<{file: File | null, instructions: string} | null>(null);

  // Timer state
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(defaultWorkout.workoutPlan[0].duration);
  const [isActive, setIsActive] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [showHydrationToast, setShowHydrationToast] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastHydrationReminderRef = useRef<number | null>(null);

  const updateExerciseDuration = (idx: number, delta: number) => {
    setWorkoutData(prev => {
      const newPlan = [...prev.workoutPlan];
      newPlan[idx] = { ...newPlan[idx], duration: Math.max(0, newPlan[idx].duration + delta) };
      return { ...prev, workoutPlan: newPlan };
    });
    if (index === idx) {
       setTimeLeft(prev => Math.max(0, prev + delta));
    }
  };

  const updateExerciseReps = (idx: number, newReps: string) => {
    setWorkoutData(prev => {
      const newPlan = [...prev.workoutPlan];
      newPlan[idx] = { ...newPlan[idx], reps: newReps };
      return { ...prev, workoutPlan: newPlan };
    });
  };

  const recoveryDuration = workoutData.workoutPlan.find(s => s.type === 'RECOVERY')?.duration || 15;
  const setAllRests = (newVal: number) => {
    setWorkoutData(prev => {
      const newPlan = prev.workoutPlan.map(step => 
        step.type === 'RECOVERY' || step.type === 'REST' ? { ...step, duration: newVal } : step
      );
      return { ...prev, workoutPlan: newPlan };
    });
    if (workoutPlan[index]?.type === 'RECOVERY' || workoutPlan[index]?.type === 'REST') {
        setTimeLeft(newVal); 
    }
  };

  const handleSaveCurrentPlan = () => {
    const name = workoutData.planName || workoutData.workoutPlan.find(e => e.type !== 'WARMUP' && e.type !== 'RECOVERY' && e.type !== 'COMPLETE')?.title || 'Entrenamiento Guardado';
    if (name) {
      const newPlan: SavedPlan = {
        id: Date.now().toString(),
        name,
        date: new Date().toISOString(),
        workoutSummary: workoutData
      };
      setSavedPlans(prev => {
        const updated = [...prev, newPlan];
        saveToStorage(STORAGE_KEYS.SAVED_PLANS, updated);
        return updated;
      });
      setIsEditingPlan(false);
      alert(`Plan '${name}' guardado correctamente.`);
    }
  };

  // Cargar datos persistidos al inicio
  useEffect(() => {
    const savedProfile = loadFromStorage<UserProfile | null>(STORAGE_KEYS.PROFILE, null);
    const savedHistory = loadFromStorage<WorkoutRecord[]>(STORAGE_KEYS.HISTORY, []);
    const storedSavedPlans = loadFromStorage<SavedPlan[]>(STORAGE_KEYS.SAVED_PLANS, []);
    const savedPlan = loadFromStorage<WorkoutSummary | null>(STORAGE_KEYS.PLAN, null);
    
    // Load subscription explicitly from base64 if it exists to match user code pattern
    let savedSub = { planCount: 0, isPro: false };
    try {
      const subStr = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (subStr) savedSub = JSON.parse(atob(subStr));
    } catch(e) {}
    
    setSubscription(savedSub);
    setHistory(savedHistory);
    setSavedPlans(storedSavedPlans);
    if (savedPlan) {
      setWorkoutData(savedPlan);
      if (savedPlan.workoutPlan?.length > 0) {
        setTimeLeft(savedPlan.workoutPlan[0].duration);
      }
    }
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PLAN, workoutData);
  }, [workoutData]);

  const workoutPlan = workoutData.workoutPlan;
  const currentStep = workoutPlan[index] || workoutPlan[0];
  const totalProgress = (index / (Math.max(1, workoutPlan.length - 1))) * 100;

  // Guardar registro de entrenamiento
  const saveWorkoutRecord = useCallback((completedFully: boolean) => {
    if (!sessionStartTime) return;
    const duration = Math.round((Date.now() - sessionStartTime) / 1000);
    const exercisesCompleted = completedFully ? workoutPlan.length : index;
    const nonRecovery = workoutPlan.filter(e => e.type !== 'RECOVERY' && e.type !== 'COMPLETE');
    
    const completedExercises = workoutPlan.slice(0, exercisesCompleted).filter(e => e.type !== 'RECOVERY' && e.type !== 'WARMUP' && e.type !== 'REST' && e.type !== 'COMPLETE');
    const exerciseStats = completedExercises.map(e => ({ name: e.title, durationSeconds: e.duration, reps: e.reps, calories: e.calories, weightUsed: e.actualWeight || e.weight }));
    const totalCalories = workoutPlan.slice(0, exercisesCompleted).reduce((acc, e) => acc + (e.calories || 0), 0);

    const record: WorkoutRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutName: workoutData.planName || workoutPlan.find(e => e.type !== 'WARMUP' && e.type !== 'RECOVERY' && e.type !== 'COMPLETE')?.title || 'Entrenamiento personalizado',
      totalDuration: duration,
      exercisesCompleted: Math.min(exercisesCompleted, nonRecovery.length),
      totalExercises: nonRecovery.length,
      completedFully,
      totalCalories,
      exerciseStats,
      workoutSummary: workoutData
    };

    setHistory(prev => {
      const updated = [...prev, record];
      saveToStorage(STORAGE_KEYS.HISTORY, updated);
      return updated;
    });
  }, [sessionStartTime, index, workoutPlan]);

  // Agrupación para el menú
  const groupedSessions = useMemo(() => {
    const groups: { label: string, items: (Exercise & { originalIndex: number })[] }[] = [];
    workoutPlan.forEach((item, idx) => {
      if (item.type === "RECOVERY" || item.type === "REST") return;

      let label = item.round.toUpperCase();
      if (!["FINAL", "EXITO", "ÉXITO", "COOL DOWN", "WARMUP", "CALENTAMIENTO"].includes(label)) {
        if (!label.includes("NIVEL") && !label.includes("SERIE") && !label.includes("SET") && !label.includes("ROUND") && !label.includes("BLOQUE")) {
          label = `SERIE ${label}`;
        }
      }
      if (groups.length === 0 || groups[groups.length - 1].label !== label) {
        groups.push({ label, items: [{ ...item, originalIndex: idx }] });
      } else {
        groups[groups.length - 1].items.push({ ...item, originalIndex: idx });
      }
    });
    return groups;
  }, [workoutPlan]);

  // Audio
  const playBeep = useCallback((frequency: number, duration: number, volume = 0.2) => {
    if (!musicEnabled) return;
    try {
      if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
      const oscillator = globalAudioCtx.createOscillator();
      const gainNode = globalAudioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, globalAudioCtx.currentTime);
      gainNode.gain.setValueAtTime(volume, globalAudioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + duration);
      oscillator.connect(gainNode);
      gainNode.connect(globalAudioCtx.destination);
      oscillator.start();
      oscillator.stop(globalAudioCtx.currentTime + duration);
    } catch (e) { console.warn("Audio bloqueado"); }
  }, [musicEnabled]);

  const speak = useCallback((text: string, energy = 1.1) => {
    if (!musicEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        const voices = window.speechSynthesis.getVoices();
        const localVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Helena') || v.name.includes('Lucia') || v.name.includes('Monica')));
        if (localVoice) utterance.voice = localVoice;
        utterance.pitch = energy;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }, 50);
    }
  }, [musicEnabled]);

  useEffect(() => {
    if (audioRef.current) {
      if (isActive && musicEnabled) { audioRef.current.volume = 0.15; audioRef.current.play().catch(() => {}); }
      else audioRef.current.pause();
    }
  }, [isActive, musicEnabled]);

  // Timer
  const updateActualWeight = useCallback((weight: string) => {
    setWorkoutData(prev => {
      const newPlan = [...prev.workoutPlan];
      const currentEx = { ...newPlan[index], actualWeight: weight };
      
      if (currentEx.weight && currentEx.calories !== undefined) {
        if (currentEx.baseCalories === undefined) {
          currentEx.baseCalories = currentEx.calories;
        }
        
        const extractNumber = (str: string) => {
          const match = str.match(/\d+(\.\d+)?/);
          return match ? parseFloat(match[0]) : null;
        };
        
        const origNum = extractNumber(currentEx.weight);
        const newNum = extractNumber(weight);
        
        if (origNum && newNum && origNum > 0) {
          const ratio = newNum / origNum;
          const adjustedRatio = 0.5 + (0.5 * Math.max(0.5, Math.min(2.0, ratio)));
          currentEx.calories = Math.round(currentEx.baseCalories * adjustedRatio);
        } else if (!weight.trim() && currentEx.baseCalories !== undefined) {
          currentEx.calories = currentEx.baseCalories;
        }
      }

      newPlan[index] = currentEx;
      
      // Propagate the chosen weight to subsequent sets of the same exercise
      for (let i = index + 1; i < newPlan.length; i++) {
        if (newPlan[i].title === currentEx.title) {
          newPlan[i] = { ...newPlan[i], weight: weight, actualWeight: weight };
        }
      }

      return { ...prev, workoutPlan: newPlan };
    });
  }, [index, setWorkoutData]);

  const handleNext = useCallback(() => {
    targetTimeRef.current = null;
    if (index < workoutPlan.length - 1) {
      const nextIndex = index + 1;
      const nextStep = workoutPlan[nextIndex];
      setIndex(nextIndex);
      setTimeLeft(nextStep.duration);
      
      const isFirstTime = workoutPlan.findIndex(e => e.title === nextStep.title) === nextIndex;
      let speechText = `Siguiente: ${nextStep.title}.`;
      if (isFirstTime && nextStep.desc && !['RECOVERY', 'REST', 'COMPLETE'].includes(nextStep.type)) {
        speechText += ` ${nextStep.desc}`;
      }
      
      speak(speechText);
      // Si llegamos al COMPLETE, guardamos el entreno
      if (nextStep.type === 'COMPLETE') {
        saveWorkoutRecord(true);
      }
    } else {
      setIsActive(false);
      speak("¡Completado! Eres una máquina.", 1.2);
    }
  }, [index, workoutPlan, speak, saveWorkoutRecord]);

  // Recordatorio de hidratación
  useEffect(() => {
    if (!profile?.hydrationFrequency || !sessionStartTime) {
      lastHydrationReminderRef.current = null;
      return;
    }

    const intervalTimeMs = profile.hydrationFrequency * 60 * 1000;
    
    const hydrationTimer = setInterval(() => {
      if (!lastHydrationReminderRef.current) {
         lastHydrationReminderRef.current = sessionStartTime;
      }
      
      const now = Date.now();
      if (now - lastHydrationReminderRef.current >= intervalTimeMs && isActive) {
        lastHydrationReminderRef.current = now;
        speak("¡Hora de hidratarte! Toma un poco de agua.");
        playBeep(600, 0.5, 0.5);
        
        setShowHydrationToast(true);
        setTimeout(() => setShowHydrationToast(false), 8000);
      }
    }, 1000);

    return () => clearInterval(hydrationTimer);
  }, [profile?.hydrationFrequency, sessionStartTime, isActive, speak, playBeep]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let lastSecond = -1;
    if (isActive && currentStep.duration > 0) {
      if (!targetTimeRef.current) targetTimeRef.current = Date.now() + timeLeft * 1000;
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((targetTimeRef.current! - Date.now()) / 1000));
        if (remaining !== lastSecond) {
          if (remaining > 3 && remaining % 10 === 0 && remaining <= 30) playBeep(400, 0.05, 0.05);
          if (remaining === 10) speak("Diez segundos!");
          if (remaining <= 3 && remaining > 0) { playBeep(800, 0.2, 0.2); speak(remaining.toString()); }
          lastSecond = remaining;
          setTimeLeft(remaining);
        }
        if (remaining <= 0) { playBeep(1200, 0.6, 0.3); if (timer) clearInterval(timer); handleNext(); }
      }, 100);
    } else {
      targetTimeRef.current = null;
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isActive, index, handleNext, speak, playBeep, currentStep.duration, timeLeft]);

  const handleReset = useCallback(() => {
    setIsActive(false);
    targetTimeRef.current = null;
    setIndex(0);
    setTimeLeft(workoutPlan[0].duration);
    setIsMenuOpen(false);
    setSessionStartTime(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [workoutPlan]);

  const selectExercise = (idx: number) => {
    targetTimeRef.current = null;
    setIndex(idx);
    setTimeLeft(workoutPlan[idx].duration);
    setIsMenuOpen(false);
    setIsActive(false);
    
    const step = workoutPlan[idx];
    const isFirstTime = workoutPlan.findIndex(e => e.title === step.title) === idx;
    let speechText = step.title;
    if (isFirstTime && step.desc && !['RECOVERY', 'REST', 'COMPLETE'].includes(step.type)) {
      speechText += `. ${step.desc}`;
    }
    speak(speechText);
  };

  const toggleStart = () => {
    if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    if (!isActive) {
      if (!sessionStartTime) setSessionStartTime(Date.now());
      if (timeLeft === currentStep.duration) {
        const isFirstTime = workoutPlan.findIndex(e => e.title === currentStep.title) === index;
        let speechText = currentStep.title;
        if (isFirstTime && currentStep.desc && !['RECOVERY', 'REST', 'COMPLETE'].includes(currentStep.type)) {
          speechText += `. ${currentStep.desc}`;
        }
        speak(speechText);
      }
    }
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Gemini
  const generateProtocol = async (file: File | null, instructions: string, location: 'gym' | 'home') => {
    if (!subscription.isPro && subscription.planCount >= 10) {
      setShowPaywall(true);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    speak("Analizando. Espera.");

    try {
      const apiKey = profile?.geminiApiKey && profile.geminiApiKey.trim() !== '' 
        ? profile.geminiApiKey 
        : process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        
      if (!apiKey) {
        throw new Error("No se ha encontrado ninguna API Key. Configúrala en los ajustes.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      const currentDay = days[new Date().getDay()];
      const genderText = profile?.gender === 'male' ? 'Hombre' : profile?.gender === 'female' ? 'Mujer' : 'No especificado';
      const goalContext = profile ? `El usuario es ${genderText}, ${profile.age || '?'} años, pesa ${profile.weight || '?'}kg con altura de ${profile.height || '?'}cm. Su objetivo es: ${GOALS.find(g => g.id === profile.goal)?.label}. Nivel: ${LEVELS.find(l => l.id === profile.level)?.label}.` : '';

      const recentHistory = history.slice(0, 5).map(h => ({
        name: h.workoutName,
        date: new Date(h.date).toLocaleDateString(),
        exercises: h.exerciseStats?.map(e => `${e.name} (${e.reps || '-'}) ${e.weightUsed ? `Carga usada: ${e.weightUsed}` : ''}`).join(', ')
      }));
      const historyContext = recentHistory.length > 0 ? `Historial reciente del usuario:\n${JSON.stringify(recentHistory, null, 2)}` : '';

      const locationContext = location === 'gym' 
        ? "El usuario entrena hoy en el GIMNASIO comercial (asume disponibilidad de máquinas comunes, poleas, mancuernas, barras, etc)."
        : `El usuario entrena hoy en CASA. LIMITA ESTRICTAMENTE los ejercicios al siguiente material: ${profile?.material?.trim() || "Ningún material adicional, solo peso corporal."}`;

      const baseLoadsContext = profile?.baseLoads?.trim() 
        ? `Marcas y cargas de referencia del usuario (para ajustar los pesos sugeridos):\n${profile.baseLoads}\n` 
        : '';

      const systemPrompt = `Role: Actúa como el Director Maestro de Rendimiento ART (Arquitecto de Rendimiento Total). Eres una IA de élite que combina la fisiología del ejercicio, la biomecánica avanzada y el razonamiento multi-agente para generar la mejor programación de entrenamiento disponible.

${goalContext}
${historyContext}
${locationContext}
${baseLoadsContext}

REGLAS DE OPERACIÓN OBLIGATORIAS:
1. TRADUCCIÓN INTERNA: Traduce automáticamente los términos del usuario para variar ejercicios.
2. PROTOCOLO RAMP (CALENTAMIENTO): Toda sesión DEBE iniciar OBLIGATORIAMENTE con 2-3 ejercicios de calentamiento (type: WARMUP).
3. ESTRUCTURA EN FORMA DE CIRCUITOS/RONDAS: La rutina NO debe estructurarse terminando todas las series de un ejercicio para pasar al siguiente. DEBE estructurarse en RONDAS secuenciales (como un circuito).
- Bloque Calentamiento (round: "Calentamiento"): Ej 1, Ej 2...
- Bloque Serie 1 (round: "Serie 1"): Ej 1, Ej 2, Ej 3...
- Bloque Serie 2 (round: "Serie 2"): Ej 1, Ej 2, Ej 3...
- Bloque Serie 3 (round: "Serie 3"): Ej 1, Ej 2, Ej 3...
- Bloque Estiramientos (round: "Estiramientos"): Ej 1, Ej 2...
IMPORTANTE: NO pongas la misma serie o ejercicio repetido de manera consecutiva. Alterna los ejercicios. Primero todos los de la "Serie 1", luego todos los de la "Serie 2", etc. Usa exactamente el mismo valor de 'round' para todos los ejercicios que pertenezcan al mismo bloque.
4. DESCANSOS: Añade descansos de forma inteligente. NO añadas descansos en bloques de calentamiento ni estiramiento. En el bloque principal, puedes añadir descansos cortos entre ejercicios si es necesario, o solo un descanso largo al final de cada ronda/serie.
5. ESTIRAMIENTOS (COOL-DOWN): Toda sesión DEBE finalizar OBLIGATORIAMENTE con 2-3 ejercicios de estiramiento (type: RECOVERY, round: "Estiramientos").
6. AUTOREGULACIÓN DINÁMICA: No prescribas pesos fijos. Utiliza la escala RPE y RIR.
7. BIOENERGÉTICA DE DESCANSOS: Asigna descansos de 2 a 3 min para ejercicios y 60 a 90 seg para aislamiento.
8. SUGERENCIA DE CARGA (PESO): Basándote en el objetivo, el nivel, y muy especialmente en el historial de 'Carga usada' del usuario de sesiones anteriores, sugiere un peso en el campo 'weight' para CADA SERIE. Si el usuario ya movió cierto peso, sugiere aumentarlo ligeramente (sobrecarga progresiva) para que no se estanque, si procede. (Ej: "12 kg", "Mancuernas de 7.5kg").
9. NOMBRES EN ESPAÑOL Y SIMPLES: Añade un nombre en español claro, coloquial y muy sencillo para el usuario, en el campo 'title'.
10. NOMBRE DE LA RUTINA: Genera un nombre épico y motivador para esta sesión en el campo 'planName'.

Filtro de Días: HOY es ${currentDay.toUpperCase()}. Si el plan está dividido por días, extrae solo lo de hoy.

Duración Total: Ajusta las duraciones y descansos para cumplir con el tiempo estimado por el usuario.

Estructura obligatoria por objeto de ejercicio:
{
  "title": "Nombre",
  "round": "Número de serie o 'FINAL'",
  "type": "WARMUP, STRENGTH, STABILITY, RECOVERY o ENDURANCE",
  "duration": tiempo en segundos,
  "reps": "Ej: 10-12, Al fallo, 15, etc.",
  "color": "Elige aleatoriamente una de estas clases de texto: text-b1, text-b2, text-b3",
  "border": "Elige aleatoriamente una de estas clases de borde: border-b1, border-b2, border-b3",
  "desc": "Instrucción técnica motivadora",
  "calories": kcal estimadas generadas en esta serie (número),
  "weight": "Peso sugerido basado en historial/nivel (opcional, string)"
}

Devuelve la respuesta FINAL en formato JSON estricto estructurado en el objeto.`;

      const initialParts: any[] = [{ text: systemPrompt }];
      if (instructions.trim()) initialParts.push({ text: `Petición: ${instructions.trim()}` });
      if (file) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        initialParts.push({ inlineData: { data: base64Data, mimeType: file.type || 'image/jpeg' } });
      }
      if (!file && !instructions.trim()) throw new Error("Proporciona una petición o sube una tabla.");

      let messages: any[] = [{ role: 'user', parts: initialParts }];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planName: { type: Type.STRING },
              workoutPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING }, round: { type: Type.STRING },
                    type: { type: Type.STRING }, duration: { type: Type.NUMBER },
                    reps: { type: Type.STRING, nullable: true },
                    color: { type: Type.STRING }, border: { type: Type.STRING },
                    desc: { type: Type.STRING }, calories: { type: Type.NUMBER, nullable: true }, weight: { type: Type.STRING, nullable: true }
                  },
                  required: ["title","round","type","duration","color","border","desc"]
                }
              },
              tips: {
                type: Type.OBJECT,
                properties: {
                  hydration: { type: Type.STRING },
                  supplementation: { type: Type.STRING },
                  general: { type: Type.STRING }
                },
                required: ["hydration","supplementation","general"]
              }
            },
            required: ["planName","workoutPlan","tips"]
          }
        }
      });

      const text = response.text || "";
      if (!text) throw new Error("Respuesta vacía del modelo.");
      const result: WorkoutSummary = JSON.parse(text);

      if (result?.workoutPlan?.length > 0) {
        result.workoutPlan.push({
          title: "¡Entrenamiento Completado!", round: "ÉXITO", type: "COMPLETE", duration: 10,
          color: "text-b2", border: "border-b2",
          desc: "¡Eres increíble! Has terminado por hoy."
        });
        result.workoutPlan = result.workoutPlan.map(w => ({
          ...w, color: w.color || 'text-b1', border: w.border || 'border-b1'
        }));
        setWorkoutData(result);
        setIndex(0);
        setTimeLeft(result.workoutPlan[0].duration);
        targetTimeRef.current = null;
        setIsActive(false);
        setSessionStartTime(null);
        setCurrentView('timer');
        speak("¡Rutina lista! ¡Vamos!");
        
        // Incrementar contador
        const updatedSub = incrementPlanCount();
        setSubscription(updatedSub);
      } else {
        throw new Error("No se pudo decodificar el formato.");
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const errStr = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      
      if (errStr.includes('API_KEY') || errStr.includes('api key')) {
        setErrorMessage("Error de API Key. Revisa tu clave de Gemini.");
      } else if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        setErrorMessage("Has excedido la cuota de la API de Gemini. Ve a Ajustes (⚙️) y añade tu propia clave de API de Gemini.");
      } else if (errStr.includes('500') || errStr.includes('Internal Server Error')) {
        setErrorMessage("Error interno del servidor de Gemini. Puede ser un fallo temporal. Intentalo de nuevo más tarde.");
      } else if (errStr.includes('network') || errStr.includes('fetch')) {
        setErrorMessage("Sin conexión. Comprueba tu red.");
      } else {
        setErrorMessage(error.message || "Error procesando. Inténtalo de nuevo.");
      }
      speak("Ups, algo salió mal.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  // Paywall
  if (showPaywall) {
    return <PaywallScreen onBack={() => setShowPaywall(false)} onSuccess={() => {
      setSubscription({ ...subscription, isPro: true });
      setShowPaywall(false);
    }} />;
  }

  // Vista historial
  if (currentView === 'history') {
    return <HistoryScreen 
      history={history} 
      profile={profile} 
      subscription={subscription} 
      savedPlans={savedPlans}
      onLoadPlan={(plan) => {
        setWorkoutData(plan.workoutSummary);
        setIndex(0);
        setTimeLeft(plan.workoutSummary.workoutPlan[0]?.duration || 15);
        setCurrentView('timer');
      }}
      onDownloadPlan={async (plan) => {
        try {
          // Add assets to cache
          if ('caches' in window) {
            const cache = await caches.open('workout-assets-v1');
            const urlsToCache: string[] = ['/', 'https://cdn.pixabay.com/audio/2022/10/24/audio_3473f32c31.mp3'];
            
            await cache.addAll(urlsToCache);
            
            // Mark plan as ready
            setSavedPlans(prev => {
              const updated = prev.map(p => p.id === plan.id ? { ...p, isOfflineReady: true } : p);
              saveToStorage(STORAGE_KEYS.SAVED_PLANS, updated);
              return updated;
            });
            alert('¡Plan descargado para uso sin conexión!');
          } else {
             alert('Tu navegador no soporta descargas sin conexión.');
          }
        } catch(err) {
           console.error("Error cacheando plan: ", err);
           alert('Hubo un problema al descargar los archivos. ¿Estás offline?');
        }
      }}
      onDeletePlan={(id) => {
        if(window.confirm('¿Seguro que quieres borrar este plan?')) {
          setSavedPlans(prev => {
            const updated = prev.filter(p => p.id !== id);
            saveToStorage(STORAGE_KEYS.SAVED_PLANS, updated);
            return updated;
          });
        }
      }}
      onBack={() => setCurrentView('home')} 
    />;
  }

  // Vista Ajustes
  if (currentView === 'settings') {
    return <SettingsScreen profile={profile} subscription={subscription} onBack={() => setCurrentView('home')} onUpdate={onUpdateProfile} onGoPro={() => setShowPaywall(true)} />;
  }

  // Vista Home
  if (currentView === 'home') {
    const todayDone = history.some(h => new Date(h.date).toDateString() === new Date().toDateString());
    const streak = (() => {
      if (history.length === 0) return 0;
      let count = 0;
      const daySet = new Set(history.map(h => new Date(h.date).toDateString()));
      const checkDate = new Date(); checkDate.setHours(0,0,0,0);
      while (daySet.has(checkDate.toDateString())) { count++; checkDate.setDate(checkDate.getDate() - 1); }
      return count;
    })();

    return (
      <div className="flex flex-col min-h-[100dvh] bg-dark text-text-brand px-4 py-6 sm:p-6 font-sans overflow-x-hidden overflow-y-auto max-w-md mx-auto relative shadow-xl">
        
        {pendingWorkoutRequest && (
          <div className="absolute inset-0 bg-dark/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md px-4">
            <div className="bg-dark2 border border-border-brand p-6 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
              <MapPin size={32} className="text-b1 mb-4" />
              <h2 className="text-2xl font-bebas-neue tracking-widest text-silver-hi mb-2 uppercase">¿Dónde vas a entrenar?</h2>
              <p className="text-silver-lo font-rajdhani text-sm mb-6">Selecciona el lugar para adaptar el material disponible a la rutina de hoy.</p>
              
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={() => {
                    const req = pendingWorkoutRequest;
                    setPendingWorkoutRequest(null);
                    generateProtocol(req.file, req.instructions, 'gym');
                  }}
                  className="bg-panel border border-border-brand hover:border-b1 hover:bg-dark py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors active:scale-95 text-silver-hi font-exo-2 font-bold uppercase tracking-widest text-sm"
                >
                  <Dumbbell size={20} className="text-b2" />
                  En el Gimnasio
                </button>
                
                <button 
                  onClick={() => {
                    const req = pendingWorkoutRequest;
                    setPendingWorkoutRequest(null);
                    generateProtocol(req.file, req.instructions, 'home');
                  }}
                  className="bg-panel border border-border-brand hover:border-b1 hover:bg-dark py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors active:scale-95 text-silver-hi font-exo-2 font-bold uppercase tracking-widest text-sm"
                >
                  <Home size={20} className="text-b4" />
                  En Casa
                </button>
              </div>

              <button 
                onClick={() => setPendingWorkoutRequest(null)}
                className="mt-6 text-silver-lo text-xs uppercase tracking-widest font-exo-2 font-bold underline"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {isProcessing && <LoadingScreen />}

        {/* Header con saludo personalizado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Logo className="w-14 h-14 bg-black rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <div>
                  <LogoText 
                    className="text-[20px] tracking-[2px] leading-none drop-shadow-md" 
                    myClassName="text-[12px] font-light tracking-[2px] mr-[1px]" 
                  />
                </div>
                {subscription.isPro ? (
                  <span className="bg-gradient-to-r from-b1 to-b2 text-white border border-b3/30 text-[9px] font-exo-2 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(26,143,255,0.4)]">PRO⚡</span>
                ) : (
                  <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm ${subscription.planCount >= 10 ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-panel text-silver-lo border border-border-brand'}`}>
                    {10 - subscription.planCount} USOS
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bebas-neue text-silver-hi tracking-widest leading-none mt-0.5">
                Hola {profile?.name ? profile.name.split(' ')[0] : (auth.currentUser?.displayName ? auth.currentUser.displayName.split(' ')[0] : 'Atleta')}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('history')} className="relative p-2.5 bg-dark2 border border-border-brand rounded-xl text-silver-lo hover:text-white transition-colors shadow-sm">
              <Calendar size={18} />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-b1 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {history.length > 99 ? '99' : history.length}
                </span>
              )}
            </button>
            <button onClick={() => setCurrentView('settings')} className="relative p-2.5 bg-dark2 border border-border-brand rounded-xl text-silver-lo hover:text-white transition-colors shadow-sm">
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {streak >= 2 && (
          <div className="bg-gradient-to-r from-orange-400 to-rose-500 rounded-xl p-3 flex items-center justify-between shadow-lg shadow-orange-100 mb-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl leading-none">🔥</span>
              <div>
                <span className="font-black text-sm leading-none block mb-0.5">{streak} días de racha</span>
                <p className="text-[10px] text-white/90 leading-tight block">
                  {todayDone ? '¡Entrenamiento completado!' : '¡Mantén la racha hoy!'}
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl text-xs mb-4 flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div><span className="font-bold block">Algo salió mal</span>{errorMessage}</div>
          </div>
        )}

        {/* Input */}
        <div className="bg-dark2 border border-border-brand shadow-lg rounded-3xl p-4 mb-4 flex flex-col gap-3 shrink-0">
          <textarea
            className="w-full bg-panel border border-border-brand rounded-2xl p-3 text-sm text-silver-hi placeholder-muted focus:outline-none focus:border-b1 focus:ring-1 focus:ring-b1 transition-all resize-none font-rajdhani"
            rows={2}
            placeholder="¿Qué te apetece entrenar hoy?..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <div className="flex gap-2">
            <div className="relative flex-1 bg-panel border border-border-brand rounded-2xl overflow-hidden hover:border-b3 transition-colors flex items-center justify-center cursor-pointer">
              <input
                type="file" ref={fileInputRef}
                onChange={(e) => { if (e.target.files?.[0]) setPendingWorkoutRequest({ file: e.target.files[0], instructions: promptText }); }}
                accept="image/*,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              />
              <div className="flex items-center gap-1.5 p-3 text-silver-lo font-semibold text-xs pointer-events-none uppercase tracking-widest font-exo-2">
                <ScanLine size={16} className="text-b1" />
                <span>📷 Cargar tabla</span>
              </div>
            </div>
            <button
              onClick={() => promptText.trim() ? setPendingWorkoutRequest({ file: null, instructions: promptText }) : setErrorMessage("¡Cuéntame qué quieres entrenar o sube una tabla!")}
              className="bg-b1 hover:bg-b2 text-white p-3 px-4 rounded-2xl transition-all shadow-md shadow-b1/20 active:scale-95 font-exo-2 uppercase font-bold text-[11px] tracking-widest"
            >
              ¡Crear!
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-xs font-exo-2 font-bold text-silver-lo uppercase tracking-[4px] border-b border-border-brand pb-2 mb-3 shrink-0">💡 Consejos para ti</h2>
          <div className="space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24">
            {[
              { icon: <Droplets size={18} className="text-b3" />, bg: 'bg-b1/10', border: 'border-b1/20', title: 'Hidratación', text: workoutData.tips.hydration },
              { icon: <Pill size={18} className="text-[#36e09e]" />, bg: 'bg-[#36e09e]/10', border: 'border-[#36e09e]/20', title: 'Energía Extra', text: workoutData.tips.supplementation },
              { icon: <Target size={18} className="text-[#ffb340]" />, bg: 'bg-[#ffb340]/10', border: 'border-[#ffb340]/20', title: '¡A por todas!', text: workoutData.tips.general },
            ].map((tip, i) => (
              <div key={i} className={`bg-dark2 p-3.5 rounded-2xl border ${tip.border} shadow-lg flex gap-3 items-start`}>
                <div className={`mt-0.5 ${tip.bg} p-2 rounded-xl h-fit shrink-0`}>{tip.icon}</div>
                <div>
                  <h3 className="text-silver-hi font-bold mb-1 text-sm font-exo-2 tracking-widest uppercase text-[11px]">{tip.title}</h3>
                  <p className="text-sm text-silver-lo leading-relaxed font-rajdhani font-medium">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 z-20">
          <button
            onClick={() => setCurrentView('timer')}
            className="w-full py-4 bg-gradient-to-r from-b1 to-b3 rounded-full font-exo-2 font-bold tracking-[4px] text-sm uppercase text-white shadow-[0_0_30px_rgba(26,143,255,0.4)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            ¡A ENTRENAR! <Play size={18} fill="currentColor"/>
          </button>
        </div>
      </div>
    );
  }

  // Vista Timer
  return (
    <div className="flex flex-col h-[100dvh] bg-dark text-text-brand px-4 py-4 sm:p-6 font-sans overflow-hidden max-w-md mx-auto relative shadow-xl">

      {/* Sidebar */}
      <div className={`absolute inset-y-0 left-0 w-80 bg-dark2 border-r border-border-brand z-50 transform transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border-brand flex justify-between items-center bg-dark shrink-0">
          <h3 className="text-b1 font-bebas-neue tracking-[2px] text-xl flex items-center gap-2 uppercase truncate pr-2">
            <List size={20} className="shrink-0"/> {isEditingPlan ? 'EDITANDO' : (workoutData.planName || 'TUS EJERCICIOS')}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditingPlan(!isEditingPlan)} className={`p-2 rounded-lg transition-colors ${isEditingPlan ? 'bg-b1/20 text-b1' : 'text-silver-lo hover:bg-panel'}`}>
              <Settings2 size={20} />
            </button>
            <button onClick={() => setIsMenuOpen(false)} className="text-silver-lo hover:text-white p-2 -mr-2"><X size={24}/></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 pb-10">
          {isEditingPlan && (
            <div className="px-6 py-5 bg-b1/10 border-b border-b1/20 mb-2 flex flex-col gap-4">
              <div>
                <span className="text-xs font-exo-2 font-bold text-b1 uppercase tracking-widest block mb-2 text-center">📝 Nombre de la Rutina</span>
                <input 
                  type="text" 
                  value={workoutData.planName || ''} 
                  onChange={(e) => setWorkoutData(prev => ({...prev, planName: e.target.value}))}
                  placeholder="Ej: Pierna Intensa"
                  className="w-full bg-dark border border-border-brand rounded-lg px-3 py-2 text-sm font-rajdhani text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none text-center placeholder-muted"
                />
              </div>
              <div className="border-t border-b1/20 pt-4">
                <span className="text-xs font-exo-2 font-bold text-b1 uppercase tracking-widest block mb-3 text-center">⏱️ Tiempo de Descanso Global</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAllRests(Math.max(5, recoveryDuration - 5))} className="p-3 bg-panel text-silver-hi rounded-xl hover:bg-dark border border-border-brand transition-colors active:scale-95">
                    <Minus size={20} />
                  </button>
                  <div className="flex-1 bg-dark p-3 rounded-xl border border-b1/30 text-center">
                    <span className="font-bebas-neue tracking-widest text-white text-2xl">{recoveryDuration}</span>
                    <span className="text-b3 font-bold ml-1 text-sm font-rajdhani">seg</span>
                  </div>
                  <button onClick={() => setAllRests(recoveryDuration + 5)} className="p-3 bg-panel text-silver-hi rounded-xl hover:bg-dark border border-border-brand transition-colors active:scale-95">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex justify-center border-t border-b1/20 pt-4">
                <button
                  onClick={handleSaveCurrentPlan}
                  className="w-full py-3 bg-gradient-to-r from-b2 to-b4 text-white font-exo-2 font-bold tracking-[2px] uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Save size={18} /> GUARDAR ESTE PLAN
                </button>
              </div>
            </div>
          )}

          {groupedSessions.map((group, groupIdx) => (
            <div key={`${group.label}-${groupIdx}`}>
              <div className="px-6 py-3 bg-dark text-[10px] font-bold text-silver-lo uppercase tracking-[4px] font-exo-2 border-y border-border-brand sticky top-0 z-10">
                {group.label}
              </div>
              {group.items.map((step) => (
                <div key={step.originalIndex}
                  className={`w-full text-left px-5 py-3 border-b border-border-brand flex items-start justify-between transition-all ${index === step.originalIndex && !isEditingPlan ? 'bg-b1/10 border-l-4 border-l-b1' : 'border-l-4 border-l-transparent hover:bg-panel/50'}`}
                >
                  <button onClick={() => { if(!isEditingPlan) selectExercise(step.originalIndex); }} className={`flex items-start gap-4 flex-1 text-left ${isEditingPlan ? 'cursor-default relative top-1' : 'cursor-pointer'}`}>
                    <div className="flex-1 pr-2">
                      <span className={`text-sm font-bold leading-tight block ${index === step.originalIndex && !isEditingPlan ? 'text-b1' : 'text-silver-hi'}`}>{step.title}</span>
                      
                      {!isEditingPlan ? (
                        <span className="text-xs text-silver-lo mt-1 block font-medium flex items-center gap-1 flex-wrap">
                          {step.reps && <span className="text-b1 font-bold bg-b1/10 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-widest">{step.reps} Reps</span>}
                          {step.weight && <span className="text-rose-400 font-bold bg-rose-400/10 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-widest">{step.weight}</span>}
                          {step.duration > 0 && <span className="flex items-center gap-1"><Clock size={12} className="text-muted"/>{formatTime(step.duration)}</span>}
                          <span className="text-muted">•</span> {step.type}
                        </span>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-silver-lo flex items-center gap-2">
                            <span className="w-12 uppercase tracking-widest">Tiempo</span>
                            <div className="flex items-center bg-dark border border-border-brand rounded overflow-hidden">
                              <button onClick={(e) => { e.stopPropagation(); updateExerciseDuration(step.originalIndex, -5); }} className="w-6 h-6 flex items-center justify-center bg-panel hover:bg-dark text-silver-lo transition-colors"><Minus size={12} strokeWidth={3}/></button>
                              <span className="w-10 text-center text-xs font-bold text-silver-hi tabular-nums">{step.duration}s</span>
                              <button onClick={(e) => { e.stopPropagation(); updateExerciseDuration(step.originalIndex, 5); }} className="w-6 h-6 flex items-center justify-center bg-panel hover:bg-dark text-silver-lo transition-colors"><Plus size={12} strokeWidth={3}/></button>
                            </div>
                          </label>
                          <label className="text-[10px] font-bold text-silver-lo flex items-center gap-2">
                           <span className="w-12 uppercase tracking-widest">Reps</span>
                           <input type="text" value={step.reps || ''} onChange={(e) => updateExerciseReps(step.originalIndex, e.target.value)} onClick={e => e.stopPropagation()} placeholder="Ej: 10, Al fallo..." className="flex-1 w-0 min-w-0 bg-dark border border-border-brand rounded px-2 py-1 text-xs font-bold text-silver-hi focus:outline-none focus:border-b1 focus:ring-1 focus:ring-b1 placeholder-muted" />
                          </label>
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {!isEditingPlan && (
                    index === step.originalIndex && <Activity size={18} className="text-b1 shrink-0 ml-2 mt-2" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {isMenuOpen && <div className="absolute inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />}

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#e0e7ff_0%,_transparent_70%)]" />
      </div>

      <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/24/audio_3473f32c31.mp3" loop />

      {showHydrationToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-b1 text-white px-5 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 animate-bounce">
          <Droplets size={20} fill="currentColor" />
          <span>¡Hora de hidratarte!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => { handleReset(); setCurrentView('home'); }} className="p-2.5 bg-dark2 border border-border-brand rounded-xl text-silver-lo hover:text-white transition-all shadow-lg">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => setIsMenuOpen(true)} className="p-2.5 bg-dark2 border border-border-brand rounded-xl text-b1 hover:bg-b1/10 transition-all shadow-lg">
            <Menu size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { handleReset(); setCurrentView('history'); }} className="p-2.5 bg-dark2 border border-border-brand rounded-xl text-silver-lo hover:text-white transition-all shadow-lg">
            <Trophy size={18} />
          </button>
          <button onClick={() => setMusicEnabled(!musicEnabled)} className={`p-2.5 rounded-xl border transition-all shadow-lg ${musicEnabled ? 'bg-dark2 border-border-brand text-silver-hi' : 'bg-panel border-border-brand text-silver-lo'}`}>
            {musicEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Timer */}
      <div className="flex-grow flex flex-col items-center justify-center z-10 w-full min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-2">
        {currentStep.type === "COMPLETE" ? (
          (() => {
            const todayStr = new Date().toDateString();
            const todayWorkouts = history.filter(h => new Date(h.date).toDateString() === todayStr);
            const aggregated: Record<string, { seconds: number, reps: string, weightUsed: string }> = {};
            todayWorkouts.forEach(workout => {
              if (workout.exerciseStats) {
                workout.exerciseStats.forEach(stat => {
                  if (!aggregated[stat.name]) aggregated[stat.name] = { seconds: 0, reps: stat.reps || '', weightUsed: stat.weightUsed || '' };
                  aggregated[stat.name].seconds += stat.durationSeconds;
                  if (stat.reps && !aggregated[stat.name].reps.includes(stat.reps)) aggregated[stat.name].reps += `, ${stat.reps}`;
                  if (stat.weightUsed && !aggregated[stat.name].weightUsed.includes(stat.weightUsed)) {
                    aggregated[stat.name].weightUsed += (aggregated[stat.name].weightUsed ? `, ${stat.weightUsed}` : stat.weightUsed);
                  }
                });
              }
            });
            const stats = Object.entries(aggregated).map(([name, data]) => ({ name, seconds: data.seconds, reps: data.reps, weightUsed: data.weightUsed })).sort((a,b) => b.seconds - a.seconds);

            return (
              <div className="w-full text-center px-4 fade-in">
                <div className="text-[10px] font-bold text-silver-lo uppercase tracking-[4px] font-exo-2 mb-2 mt-4">RESUMEN DE LA SESIÓN</div>
                <div className="bg-dark2 rounded-3xl p-5 border border-border-brand shadow-lg w-full text-left">
                  <h3 className="text-sm font-bold text-silver-hi border-b border-border-brand pb-3 mb-3">Total Acumulado Hoy</h3>
                  {stats.length === 0 ? <p className="text-sm text-silver-lo border-white">Aún no hay datos</p> : (
                    <div className="flex flex-col gap-3 max-h-[30vh] overflow-y-auto">
                      {stats.map((stat, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-silver-hi truncate mr-2">{stat.name}</span>
                            <span className="text-b3 font-black shrink-0 whitespace-nowrap">
                              {Math.floor(stat.seconds/60) > 0 ? `${Math.floor(stat.seconds/60)}m ${stat.seconds%60 > 0 ? stat.seconds%60+'s':''}` : `${stat.seconds}s`}
                            </span>
                          </div>
                          {stat.reps && <p className="text-xs text-silver-lo font-medium truncate block">Repeticiones aprox: {stat.reps.replace(/^, /, '')}</p>}
                          {stat.weightUsed && <p className="text-xs text-rose-400 font-bold truncate block">Carga: {stat.weightUsed.replace(/^, /, '')}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center w-full gap-4">
            <div className="text-[11px] font-bold text-silver-lo uppercase tracking-widest font-exo-2 flex items-center justify-center gap-2">
              <span className={`px-2 py-0.5 border ${currentStep.border} ${currentStep.color} bg-panel inline-block rounded-full shadow-sm`}>
                {currentStep.type}
              </span>
              {["FINAL","ÉXITO","WARMUP","CALENTAMIENTO"].includes(currentStep.round.toUpperCase()) ? currentStep.round : (currentStep.round.toUpperCase().includes('SERIE') ? currentStep.round.toUpperCase() : `Serie ${currentStep.round}`)}
            </div>
            
            <div className="relative w-[55%] max-w-[240px] shrink-0 aspect-square flex items-center justify-center">
              <svg className="absolute w-full h-full -rotate-90 drop-shadow-xl overflow-visible">
                <circle cx="50%" cy="50%" r="46%" className="stroke-border-brand" fill="#101020" strokeWidth="8" />
                {currentStep.duration > 0 && (
                  <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray="289" strokeDashoffset={289 * (1 - Math.max(0, timeLeft) / currentStep.duration)}
                    strokeLinecap="round" className={`${currentStep.color} transition-all duration-1000 ease-linear`} />
                )}
                {currentStep.duration === 0 && (
                  <circle cx="50%" cy="50%" r="46%" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray="289" strokeDashoffset="0"
                    strokeLinecap="round" className={`${currentStep.color} transition-all duration-1000 ease-linear opacity-50`} />
                )}
              </svg>
              <div className="text-center w-full px-2 relative z-10 flex flex-col items-center justify-center h-full">
                {currentStep.duration > 0 ? (
                  <div className={`text-6xl md:text-7xl font-bebas-neue tracking-[4px] tabular-nums leading-none transition-all duration-300 ${isActive ? `text-b1 drop-shadow-[0_0_15px_rgba(26,143,255,0.7)] scale-110` : `text-text-brand drop-shadow-md`}`}>
                    {formatTime(timeLeft)}
                  </div>
                ) : (
                  <div className={`text-5xl md:text-6xl font-bebas-neue tracking-widest leading-none px-2 py-4 transition-all duration-300 ${isActive ? `text-b1 drop-shadow-[0_0_15px_rgba(26,143,255,0.7)] scale-110` : `text-text-brand drop-shadow-md`}`}>
                    {currentStep.reps || "¡DALE!"}
                  </div>
                )}
                
                {currentStep.duration > 0 && currentStep.reps && (
                   <div className="mt-1 text-[11px] font-bold uppercase tracking-wider font-exo-2 text-b3">{currentStep.reps} Reps</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={`mt-4 w-full bg-dark2 shadow-lg border border-border-brand p-4 rounded-2xl shrink-0`}>
          <div className="flex justify-between items-start gap-2 mb-1">
            <h2 className="text-lg font-bebas-neue tracking-widest text-silver-hi leading-tight">{currentStep.title}</h2>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {currentStep.calories && (
                  <span className="text-amber-500 font-bold text-sm tracking-wider font-rajdhani">{currentStep.calories} kcal</span>
                )}
                <Zap className={`${isActive ? 'text-amber-400 animate-bounce' : 'text-silver-lo'} shrink-0 w-5 h-5`} fill={isActive ? 'currentColor' : 'none'} />
              </div>
            </div>
          </div>
          {currentStep.weight && (
            <div className="mb-3 flex flex-col gap-1.5">
              <span className="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded text-xs uppercase tracking-widest self-start">Carga sugerida: {currentStep.weight}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-silver-lo font-bold tracking-widest uppercase flex-1">¿Cuánto vas a usar?</span>
                <select 
                  value={currentStep.actualWeight || currentStep.weight || ''} 
                  onChange={(e) => updateActualWeight(e.target.value)}
                  className="bg-dark border border-border-brand rounded-lg px-3 py-1.5 text-sm font-rajdhani text-silver-hi focus:border-b1 focus:ring-1 focus:ring-b1 outline-none appearance-none"
                >
                  {(!currentStep.weight || (![
                    "Peso corporal",
                    ...Array.from({ length: 20 }, (_, i) => `${i + 1} kg`),
                    ...Array.from({ length: 16 }, (_, i) => `${(i + 5) * 5} kg`),
                    ...Array.from({ length: 10 }, (_, i) => `${(i + 11) * 10} kg`)
                  ].includes(currentStep.weight))) && (
                    <option value={currentStep.weight}>{currentStep.weight}</option>
                  )}
                  <option value="Peso corporal">Peso corporal</option>
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={`w1-${i}`} value={`${i + 1} kg`}>{i + 1} kg</option>
                  ))}
                  {Array.from({ length: 16 }, (_, i) => (
                    <option key={`w5-${i}`} value={`${(i + 5) * 5} kg`}>{(i + 5) * 5} kg</option>
                  ))}
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={`w10-${i}`} value={`${(i + 11) * 10} kg`}>{(i + 11) * 10} kg</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <p className="text-silver-lo font-rajdhani text-sm font-medium leading-relaxed">{currentStep.desc}</p>
        </div>
      </div>

      {/* Controls */}
      {currentStep.type !== "COMPLETE" && (
        <div className="mt-4 flex items-center justify-center gap-5 mb-4 z-10 shrink-0">
          <button onClick={handleReset} className="p-3 rounded-full bg-dark2 shadow-sm border border-border-brand text-silver-lo hover:text-white active:scale-95 transition-all"><RotateCcw size={20} /></button>
          
          {currentStep.duration > 0 ? (
            <button onClick={toggleStart} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-b1/10 border border-b1/30 text-b1' : 'bg-gradient-to-r from-b1 to-b2 text-white shadow-[0_0_20px_rgba(26,143,255,0.4)] hover:scale-105'}`}>
              {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
            </button>
          ) : (
            <button onClick={handleNext} className="h-16 px-8 rounded-[2rem] flex items-center justify-center transition-all active:scale-95 bg-gradient-to-r from-b1 to-b2 text-white shadow-[0_0_20px_rgba(26,143,255,0.4)] hover:scale-105 font-exo-2 font-bold tracking-widest uppercase">
              HECHO
            </button>
          )}

          <button onClick={handleNext} className="p-3 rounded-full bg-dark2 shadow-sm border border-border-brand text-silver-lo hover:text-white active:scale-95 transition-all"><SkipForward size={20} /></button>
        </div>
      )}

      {currentStep.type === "COMPLETE" && (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 mb-4 z-10 shrink-0">
          <button onClick={handleSaveCurrentPlan} className="py-4 px-8 rounded-full bg-gradient-to-r from-b2 to-b4 text-white font-exo-2 font-bold tracking-[4px] text-sm uppercase active:scale-95 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(26,143,255,0.4)] w-full justify-center">
            <Save size={18} /> GUARDAR RUTINA
          </button>
          <button onClick={() => { handleReset(); setCurrentView('home'); }} className="py-4 px-8 rounded-full bg-dark2 border border-border-brand text-silver-hi hover:text-white font-exo-2 font-bold tracking-[4px] text-sm uppercase active:scale-95 transition-transform flex items-center gap-2 w-full justify-center">
            VOLVER AL INICIO
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="w-full z-10 pb-2 shrink-0">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-silver-lo font-bold uppercase tracking-widest font-exo-2">PROGRESO</span>
          <span className="text-xs text-b1 font-bold">{Math.round(totalProgress || 0)}%</span>
        </div>
        <div className="h-2.5 w-full bg-panel border border-border-brand rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-b1 to-b3 transition-all duration-[1s] rounded-full" style={{ width: `${totalProgress || 0}%` }} />
        </div>
      </div>
    </div>
  );
}
