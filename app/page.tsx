/* eslint-disable */
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX, Activity, 
  Zap, Menu, X, List, ScanLine, Loader2, ArrowLeft,
  Droplets, Pill, Target, Trophy, Flame, Clock, ChevronRight,
  Dumbbell, Heart, Star, Calendar, Settings2, Plus, Minus, CheckCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { useAuth } from '../components/FirebaseProvider';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import SettingsScreen from '../components/SettingsScreen';
import PaywallScreen from '../components/PaywallScreen';
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
  imageKeyword?: string;
  wgerImageUrl?: string;
};

type WorkoutSummary = {
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
  exerciseStats?: { name: string; reps?: string; durationSeconds: number }[];
};

type UserProfile = {
  name: string;
  goal: 'lose_weight' | 'gain_muscle' | 'endurance' | 'flexibility' | 'general';
  level: 'beginner' | 'intermediate' | 'advanced';
  onboardingDone: boolean;
  age?: number;
  weight?: number;
  height?: number;
  material?: string;
};

const GOALS = [
  { id: 'lose_weight', icon: '🔥', label: 'Perder peso', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { id: 'gain_muscle', icon: '💪', label: 'Ganar músculo', color: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
  { id: 'endurance', icon: '🏃', label: 'Mejorar resistencia', color: 'border-rose-300 bg-rose-50 text-rose-700' },
  { id: 'flexibility', icon: '🧘', label: 'Flexibilidad', color: 'border-teal-300 bg-teal-50 text-teal-700' },
  { id: 'general', icon: '⭐', label: 'Bienestar general', color: 'border-violet-300 bg-violet-50 text-violet-700' },
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

const getImageUrl = (keyword: string) =>
  `https://image.pollinations.ai/prompt/cute%20illustration%20of%20a%20person%20doing%20${encodeURIComponent(keyword)}%20exercise,%20flat%20vector%20art,%20colorful,%20white%20background?width=400&height=200&nologo=true&seed=42`;

const defaultWorkout: WorkoutSummary = {
  workoutPlan: [
    { title: "Rotaciones de Brazos", round: "CALENTAMIENTO", type: "WARMUP", duration: 60, color: "text-amber-500", border: "border-amber-200", desc: "Movimientos amplios, calentamiento articular de hombros.", imageKeyword: "arm circles" },
    { title: "Sentadillas", round: "1", type: "STRENGTH", duration: 45, reps: "15", color: "text-indigo-500", border: "border-indigo-200", desc: "Mantén la espalda recta y baja controladamente.", imageKeyword: "squats" },
    { title: "Descanso", round: "1", type: "RECOVERY", duration: 15, color: "text-teal-500", border: "border-teal-200", desc: "Recuperación activa.", imageKeyword: "resting" },
    { title: "Jumping Jacks", round: "2", type: "ENDURANCE", duration: 45, reps: "Al fallo", color: "text-rose-500", border: "border-rose-200", desc: "Mantén un ritmo constante para elevar pulsaciones.", imageKeyword: "jumping jacks" },
    { title: "Descanso", round: "2", type: "RECOVERY", duration: 15, color: "text-teal-500", border: "border-teal-200", desc: "Recuperación e hidratación.", imageKeyword: "drinking water" },
    { title: "Estiramientos", round: "FINAL", type: "RECOVERY", duration: 60, color: "text-blue-500", border: "border-blue-200", desc: "Estiramiento estático para relajar la musculatura.", imageKeyword: "stretching" },
    { title: "Entrenamiento Completado", round: "ÉXITO", type: "COMPLETE", duration: 10, color: "text-violet-500", border: "border-violet-200", desc: "Rutina completada de forma satisfactoria.", imageKeyword: "celebration" }
  ],
  tips: {
    hydration: "Mantén una hidratación constante durante el entrenamiento.",
    supplementation: "Considera una ingesta de proteína o carbohidratos tras finalizar.",
    general: "La técnica es prioritaria sobre la velocidad o el peso."
  }
};

// --- COMPONENTE IMAGEN ---
function ExerciseImage({ keyword, compact = false }: { keyword: string, compact?: boolean }) {
  const [error, setError] = useState(false);
  const cleanName = keyword.toLowerCase().trim().replace(/\s+/g, '-');
  const videoSrc = `/gifs/${cleanName}.mp4`;
  const fallbackSrc = getImageUrl(keyword);

  if (compact) {
    if (error) {
      return <img src={fallbackSrc} alt={keyword} className="w-full h-full object-cover opacity-90 mix-blend-multiply" crossOrigin="anonymous" />;
    }
    return (
      <video 
        src={videoSrc} 
        className="w-full h-full object-cover mix-blend-multiply scale-110" 
        autoPlay loop muted playsInline 
        onError={() => setError(true)} 
      />
    );
  }

  return (
    <div className="w-full aspect-[21/9] max-h-[140px] sm:max-h-[180px] rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 relative bg-slate-100 border border-slate-100 flex items-center justify-center">
      {error ? (
        <img src={fallbackSrc} alt={keyword} className="w-full h-full object-cover opacity-90 mix-blend-multiply" crossOrigin="anonymous" />
      ) : (
        <video 
          src={videoSrc} 
          className="w-full h-full object-cover mix-blend-multiply opacity-90 scale-105" 
          autoPlay loop muted playsInline 
          onError={() => setError(true)} 
        />
      )}
    </div>
  );
}

// --- PANTALLA ONBOARDING ---


// --- PANTALLA HISTORIAL ---
function HistoryScreen({ history, profile, onBack, subscription }: { history: WorkoutRecord[], profile: UserProfile, onBack: () => void, subscription: SubscriptionParams }) {
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

  const todayStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayWorkouts = history.filter(h => new Date(h.date).toDateString() === todayStr);
    const aggregated: Record<string, { seconds: number, reps: string }> = {};
    
    todayWorkouts.forEach(workout => {
      if (workout.exerciseStats) {
        workout.exerciseStats.forEach(stat => {
          if (!aggregated[stat.name]) {
            aggregated[stat.name] = { seconds: 0, reps: stat.reps || '' };
          }
          aggregated[stat.name].seconds += stat.durationSeconds;
          if (stat.reps && !aggregated[stat.name].reps.includes(stat.reps)) {
            aggregated[stat.name].reps += `, ${stat.reps}`;
          }
        });
      }
    });
    
    return Object.entries(aggregated).map(([name, data]) => ({
      name,
      seconds: data.seconds,
      reps: data.reps
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
    
    let baseWeight = 85; 
    let baseStrength = 100;
    let baseEndurance = 100; 

    // Simulation mapping
    const data = chronos.map((h, i) => {
      const dateStr = new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const res: any = { dateStr, label: dateStr, minutos: Math.round(h.totalDuration / 60) };
      
      // Simulate progress over time based on goal to show some cool charts
      if (profile.goal === 'lose_weight') {
        baseWeight -= (Math.random() * 0.3 + 0.1); 
        res.kg = parseFloat(baseWeight.toFixed(1));
      } else if (profile.goal === 'gain_muscle') {
        baseStrength += (Math.random() * 2 + 1);
        res.fuerza = parseFloat(baseStrength.toFixed(1));
      } else if (profile.goal === 'endurance') {
        baseEndurance += (Math.random() * 1.5 + 0.5);
        res.resistencia = parseFloat(baseEndurance.toFixed(1));
      }
      return res;
    });

    // Group by day to avoid duplicate dots on the same day
    const aggregated = data.reduce((acc: any, curr) => {
       if(!acc[curr.dateStr]) acc[curr.dateStr] = curr;
       else {
         acc[curr.dateStr].minutos += curr.minutos;
         if(curr.kg) acc[curr.dateStr].kg = curr.kg;
         if(curr.fuerza) acc[curr.dateStr].fuerza = curr.fuerza;
         if(curr.resistencia) acc[curr.dateStr].resistencia = curr.resistencia;
       }
       return acc;
    }, {});

    return Object.values(aggregated);
  }, [displayHistory, profile.goal]);

  const chartConfig = useMemo(() => {
    switch(profile.goal) {
      case 'lose_weight': return { dataKey: 'kg', color: '#14b8a6', title: 'Progreso de Peso (Est.)', unit: 'kg' };
      case 'gain_muscle': return { dataKey: 'fuerza', color: '#f97316', title: 'Índice de Fuerza', unit: 'pts' };
      case 'endurance': return { dataKey: 'resistencia', color: '#6366f1', title: 'Mejora Cardiovascular', unit: 'pts' };
      default: return { dataKey: 'minutos', color: '#8b5cf6', title: 'Minutos Actividad', unit: 'min' };
    }
  }, [profile.goal]);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-50 max-w-md mx-auto font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-slate-900">Mi Historial</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5 overflow-y-auto pb-10">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-orange-100">
            <Flame size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{streak}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Racha días</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-indigo-100">
            <Trophy size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{completedCount}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Completados</div>
          </div>
          <div className="bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-teal-100">
            <Clock size={20} className="mx-auto mb-1" />
            <div className="text-2xl font-black">{totalMinutes}</div>
            <div className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Minutos</div>
          </div>
        </div>

        {/* Progreso Visual Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-black text-slate-800">{chartConfig.title}</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Basado en tu historial</p>
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
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 flex items-start gap-4 shadow-lg">
            <div className="bg-slate-700 p-2 rounded-xl text-amber-400 shrink-0">
              <Star size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Historial Limitado</p>
              <p className="text-xs text-slate-400 leading-relaxed">En el plan gratuito solo ves los últimos 7 días. Con PRO guardas todo para siempre.</p>
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
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tus Números de Hoy</h2>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <Target size={16} className="text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Total Acumulado</h3>
                  <p className="text-xs text-slate-500 font-medium">Ejercicios realizados hoy</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {todayStats.map((stat, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700 truncate mr-2">{stat.name}</span>
                      <span className="text-indigo-600 font-black shrink-0 whitespace-nowrap">
                         {formatDuration(stat.seconds)}
                      </span>
                    </div>
                    {stat.reps && <p className="text-xs text-slate-400 font-medium truncate block">Repeticiones aprox: {stat.reps.replace(/^, /, '')}</p>}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(5, (stat.seconds / 300) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Historial */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Entrenamientos</h2>
          {displayHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="text-5xl">🏃</div>
              <p className="text-slate-400 font-medium text-sm">Aún no hay entrenamientos.<br/>¡Completa tu primero hoy!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayHistory.map((record) => (
                <div key={record.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-4 ${record.completedFully ? 'border-green-100' : 'border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${record.completedFully ? 'bg-green-50' : 'bg-slate-100'}`}>
                    {record.completedFully ? <Trophy size={18} className="text-green-500" /> : <Dumbbell size={18} className="text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{record.workoutName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{formatDate(record.date)}</span>
                      <span className="text-slate-200">•</span>
                      <span className="text-xs text-slate-400">{formatDuration(record.totalDuration)}</span>
                      <span className="text-slate-200">•</span>
                      <span className="text-xs text-slate-400">{record.exercisesCompleted}/{record.totalExercises} ejercicios</span>
                    </div>
                  </div>
                  {record.completedFully && <Star size={14} className="text-amber-400 shrink-0" fill="currentColor" />}
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
      <div className="flex items-center justify-center h-screen bg-[#0A0A0F]">
        <Loader2 className="animate-spin text-[#FF4D1C]" size={48} />
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
  const [workoutData, setWorkoutData] = useState<WorkoutSummary>(defaultWorkout);
  const [currentView, setCurrentView] = useState<'home' | 'timer' | 'history' | 'settings'>('home');
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionParams>({ planCount: 0, isPro: false });

  // Timer state
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(defaultWorkout.workoutPlan[0].duration);
  const [isActive, setIsActive] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Cargar datos persistidos al inicio
  useEffect(() => {
    const savedProfile = loadFromStorage<UserProfile | null>(STORAGE_KEYS.PROFILE, null);
    const savedHistory = loadFromStorage<WorkoutRecord[]>(STORAGE_KEYS.HISTORY, []);
    const savedPlan = loadFromStorage<WorkoutSummary | null>(STORAGE_KEYS.PLAN, null);
    
    // Load subscription explicitly from base64 if it exists to match user code pattern
    let savedSub = { planCount: 0, isPro: false };
    try {
      const subStr = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (subStr) savedSub = JSON.parse(atob(subStr));
    } catch(e) {}
    
    setSubscription(savedSub);
    setHistory(savedHistory);
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
    const exerciseStats = completedExercises.map(e => ({ name: e.title, durationSeconds: e.duration, reps: e.reps }));

    const record: WorkoutRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      workoutName: workoutPlan.find(e => e.type !== 'WARMUP' && e.type !== 'RECOVERY' && e.type !== 'COMPLETE')?.title || 'Entrenamiento personalizado',
      totalDuration: duration,
      exercisesCompleted: Math.min(exercisesCompleted, nonRecovery.length),
      totalExercises: nonRecovery.length,
      completedFully,
      exerciseStats
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
          label = `NIVEL ${label}`;
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
  const handleNext = useCallback(() => {
    targetTimeRef.current = null;
    if (index < workoutPlan.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setTimeLeft(workoutPlan[nextIndex].duration);
      speak(`Siguiente: ${workoutPlan[nextIndex].title}.`);
      // Si llegamos al COMPLETE, guardamos el entreno
      if (workoutPlan[nextIndex].type === 'COMPLETE') {
        saveWorkoutRecord(true);
      }
    } else {
      setIsActive(false);
      speak("¡Completado! Eres una máquina.", 1.2);
    }
  }, [index, workoutPlan, speak, saveWorkoutRecord]);

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
    speak(workoutPlan[idx].title);
  };

  const toggleStart = () => {
    if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
    if (!isActive) {
      if (!sessionStartTime) setSessionStartTime(Date.now());
      if (timeLeft === currentStep.duration) speak(currentStep.title);
    }
    setIsActive(!isActive);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Gemini
  const generateProtocol = async (file: File | null, instructions: string) => {
    if (!subscription.isPro && subscription.planCount >= 10) {
      setShowPaywall(true);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    speak("Analizando. Espera.");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
      const currentDay = days[new Date().getDay()];
      const goalContext = profile ? `El usuario tiene como objetivo: ${GOALS.find(g => g.id === profile.goal)?.label}. Nivel: ${LEVELS.find(l => l.id === profile.level)?.label}.` : '';

      const systemPrompt = `Actúa como un Entrenador Personal Profesional. ${goalContext} Analiza la petición del usuario o el archivo adjunto para extraer o crear una rutina. Devuélvelo en formato JSON estricto. Usa nombres de ejercicios técnicos y serios (ej. "Flexiones", "Dominadas", "Peso Muerto"). Evita nombres infantiles o adjetivos como "Alegres" o "Estrella".

Estructura obligatoria por objeto de ejercicio:
{
  "title": "Nombre",
  "round": "Número de serie o 'FINAL'",
  "type": "WARMUP, STRENGTH, STABILITY, RECOVERY o ENDURANCE",
  "duration": tiempo estimado en segundos (usa 30 o 45 si no estás seguro y es por repeticiones),
  "reps": "Ej: 10-12, Al fallo, 15, etc. (Déjalo vacío si es puramente por tiempo)",
  "color": "Clase tailwind de texto",
  "border": "Clase tailwind de borde",
  "desc": "Instrucción motivadora en 1 frase",
  "imageKeyword": "Nombre en inglés del ejercicio (ej. 'barbell bench press', 'squat', 'push-up'), para cargar gifs/nombre.mp4"
}

DIRECTRICES:
1. Añade 2-3 ejercicios de CALENTAMIENTO al principio.
2. Al final, añade 2-3 estiramientos (type: RECOVERY, round: FINAL).
3. Escribe tips técnicos y profesionales sobre hidratación, nutrición y recuperación.
4. EXPANSIÓN DE SERIES: Repite el bloque para cada set con descansos entre ellos.
5. FILTRO DE DÍAS: HOY es ${currentDay.toUpperCase()}. Si el plan está dividido por días, extrae solo lo de hoy.
6. HÍBRIDO TIEMPO/REPETICIONES: Mezcla ejercicios por tiempo y por repeticiones según pida el usuario. Prioriza el llegar al fallo muscular (o casi) si aplica al objetivo.`;

      const parts: any[] = [{ text: systemPrompt }];
      if (instructions.trim()) parts.push({ text: `Petición: ${instructions.trim()}` });
      if (file) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        parts.push({ inlineData: { data: base64Data, mimeType: file.type } });
      }
      if (!file && !instructions.trim()) throw new Error("Proporciona una petición o sube una tabla.");

      // ✅ FIX #2: Modelo correcto
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              workoutPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING }, round: { type: Type.STRING },
                    type: { type: Type.STRING }, duration: { type: Type.NUMBER },
                    reps: { type: Type.STRING },
                    color: { type: Type.STRING }, border: { type: Type.STRING },
                    desc: { type: Type.STRING }, imageKeyword: { type: Type.STRING },
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
            required: ["workoutPlan","tips"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Respuesta vacía del modelo.");
      const result: WorkoutSummary = JSON.parse(text);

      if (result?.workoutPlan?.length > 0) {
        result.workoutPlan.push({
          title: "¡Entrenamiento Completado!", round: "ÉXITO", type: "COMPLETE", duration: 10,
          color: "text-violet-500", border: "border-violet-200",
          desc: "¡Eres increíble! Has terminado por hoy.", imageKeyword: "celebration"
        });
        result.workoutPlan = result.workoutPlan.map(w => ({
          ...w, color: w.color || 'text-indigo-500', border: w.border || 'border-indigo-200'
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
      console.error(error);
      if (error.message?.includes('API_KEY') || error.message?.includes('api key')) {
        setErrorMessage("Error de API Key. Revisa tu clave de Gemini.");
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
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
    return <HistoryScreen history={history} profile={profile} subscription={subscription} onBack={() => setCurrentView('home')} />;
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
      <div className="flex flex-col min-h-[100dvh] bg-slate-50 text-slate-800 px-4 py-6 sm:p-6 font-sans overflow-x-hidden overflow-y-auto max-w-md mx-auto relative shadow-xl shadow-slate-200/50">
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={64} />
            <h2 className="text-xl font-bold text-indigo-600 tracking-tight animate-pulse text-center px-4">✨ ¡Preparando tu plan! ✨</h2>
            <p className="text-xs text-indigo-400 font-medium mt-3">Analizando con IA...</p>
          </div>
        )}

        {/* Header con saludo personalizado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Logo className="w-14 h-14 bg-black rounded-lg" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[#1A91FF] text-[10px] font-black tracking-wider">MyAIronCoach</p>
                {subscription.isPro ? (
                  <span className="bg-[#FF4D1C] text-white text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm">PRO⚡</span>
                ) : (
                  <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded shadow-sm ${subscription.planCount >= 10 ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {10 - subscription.planCount} USOS
                  </span>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mt-0.5">
                Hola {profile?.name ? profile.name.split(' ')[0] : (auth.currentUser?.displayName ? auth.currentUser.displayName.split(' ')[0] : 'Atleta')} {todayDone ? '✅' : '💪'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('history')} className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
              <Calendar size={18} />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {history.length > 99 ? '99' : history.length}
                </span>
              )}
            </button>
            <button onClick={() => setCurrentView('settings')} className="relative p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
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
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-4 mb-4 flex flex-col gap-3 shrink-0">
          <textarea
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
            rows={2}
            placeholder="¿Qué te apetece entrenar hoy?..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <div className="flex gap-2">
            <div className="relative flex-1 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-300 transition-colors flex items-center justify-center cursor-pointer">
              <input
                type="file" ref={fileInputRef}
                onChange={(e) => { if (e.target.files?.[0]) generateProtocol(e.target.files[0], promptText); }}
                accept="image/*,application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              />
              <div className="flex items-center gap-1.5 p-3 text-slate-500 font-semibold text-xs pointer-events-none">
                <ScanLine size={16} className="text-indigo-500" />
                <span>📷 Cargar tabla</span>
              </div>
            </div>
            <button
              onClick={() => promptText.trim() ? generateProtocol(null, promptText) : setErrorMessage("¡Cuéntame qué quieres entrenar o sube una tabla!")}
              className="bg-indigo-500 hover:bg-indigo-600 text-white p-3 px-4 rounded-2xl transition-all shadow-md shadow-indigo-200 active:scale-95 font-bold text-sm"
            >
              ¡Crear!
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 shrink-0">💡 Consejos para ti</h2>
          <div className="space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-24">
            {[
              { icon: <Droplets size={18} className="text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-100', title: 'Hidratación', text: workoutData.tips.hydration },
              { icon: <Pill size={18} className="text-green-500" />, bg: 'bg-green-50', border: 'border-green-100', title: 'Energía Extra', text: workoutData.tips.supplementation },
              { icon: <Target size={18} className="text-yellow-500" />, bg: 'bg-yellow-50', border: 'border-yellow-100', title: '¡A por todas!', text: workoutData.tips.general },
            ].map((tip, i) => (
              <div key={i} className={`bg-white p-3.5 rounded-2xl border ${tip.border} shadow-sm flex gap-3 items-start`}>
                <div className={`mt-0.5 ${tip.bg} p-2 rounded-xl h-fit shrink-0`}>{tip.icon}</div>
                <div>
                  <h3 className="text-slate-800 font-bold mb-1 text-sm">{tip.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-4 right-4 z-20">
          <button
            onClick={() => setCurrentView('timer')}
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[24px] font-black text-lg text-white shadow-xl shadow-indigo-300 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            ¡A ENTRENAR! <Play size={18} fill="currentColor"/>
          </button>
        </div>
      </div>
    );
  }

  // Vista Timer
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-800 px-4 py-4 sm:p-6 font-sans overflow-hidden max-w-md mx-auto relative shadow-xl shadow-slate-200/50">

      {/* Sidebar */}
      <div className={`absolute inset-y-0 left-0 w-80 bg-white border-r border-slate-200 z-50 transform transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="text-indigo-500 font-black text-lg flex items-center gap-2">
            <List size={20}/> {isEditingPlan ? 'EDITANDO' : 'TUS EJERCICIOS'}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditingPlan(!isEditingPlan)} className={`p-2 rounded-lg transition-colors ${isEditingPlan ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-200'}`}>
              <Settings2 size={20} />
            </button>
            <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-slate-800 p-2 -mr-2"><X size={24}/></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 pb-10">
          {isEditingPlan && (
            <div className="px-6 py-5 bg-indigo-50/50 border-b border-indigo-100 mb-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-3 text-center">⏱️ Tiempo de Descanso Global</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setAllRests(Math.max(5, recoveryDuration - 5))} className="p-3 bg-white text-slate-500 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm active:scale-95">
                  <Minus size={20} />
                </button>
                <div className="flex-1 bg-white p-3 rounded-xl border border-indigo-200 text-center shadow-inner">
                  <span className="font-black text-slate-800 text-xl">{recoveryDuration}</span>
                  <span className="text-slate-400 font-bold ml-1 text-sm">seg</span>
                </div>
                <button onClick={() => setAllRests(recoveryDuration + 5)} className="p-3 bg-white text-slate-500 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm active:scale-95">
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}

          {groupedSessions.map((group, groupIdx) => (
            <div key={`${group.label}-${groupIdx}`}>
              <div className="px-6 py-3 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-y border-slate-100 sticky top-0 z-10">
                {group.label}
              </div>
              {group.items.map((step) => (
                <div key={step.originalIndex}
                  className={`w-full text-left px-5 py-3 border-b border-slate-50 flex items-start justify-between transition-all ${index === step.originalIndex && !isEditingPlan ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent hover:bg-slate-50'}`}
                >
                  <button onClick={() => { if(!isEditingPlan) selectExercise(step.originalIndex); }} className={`flex items-start gap-4 flex-1 text-left ${isEditingPlan ? 'cursor-default relative top-1' : 'cursor-pointer'}`}>
                    {step.imageKeyword && (
                      <div className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center mt-0.5 ${index === step.originalIndex && !isEditingPlan ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}>
                        <ExerciseImage keyword={step.imageKeyword} compact={true} />
                      </div>
                    )}
                    <div className="flex-1 pr-2">
                      <span className={`text-sm font-bold leading-tight block ${index === step.originalIndex && !isEditingPlan ? 'text-indigo-600' : 'text-slate-700'}`}>{step.title}</span>
                      
                      {!isEditingPlan ? (
                        <span className="text-xs text-slate-400 mt-1 block font-medium flex items-center gap-1 flex-wrap">
                          {step.reps && <span className="text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-widest">{step.reps} Reps</span>}
                          {step.duration > 0 && <span className="flex items-center gap-1"><Clock size={12} className="text-slate-300"/>{formatTime(step.duration)}</span>}
                          <span className="text-slate-300">•</span> {step.type}
                        </span>
                      ) : (
                        <div className="mt-2 flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                            <span className="w-12 uppercase tracking-widest">Tiempo</span>
                            <div className="flex items-center bg-white border border-slate-200 rounded overflow-hidden">
                              <button onClick={(e) => { e.stopPropagation(); updateExerciseDuration(step.originalIndex, -5); }} className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors active:bg-rose-100"><Minus size={12} strokeWidth={3}/></button>
                              <span className="w-10 text-center text-xs font-bold text-slate-700 tabular-nums">{step.duration}s</span>
                              <button onClick={(e) => { e.stopPropagation(); updateExerciseDuration(step.originalIndex, 5); }} className="w-6 h-6 flex items-center justify-center bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-colors active:bg-indigo-100"><Plus size={12} strokeWidth={3}/></button>
                            </div>
                          </label>
                          <label className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                           <span className="w-12 uppercase tracking-widest">Reps</span>
                           <input type="text" value={step.reps || ''} onChange={(e) => updateExerciseReps(step.originalIndex, e.target.value)} onClick={e => e.stopPropagation()} placeholder="Ej: 10, Al fallo..." className="flex-1 w-0 min-w-0 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
                          </label>
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {!isEditingPlan && (
                    index === step.originalIndex && <Activity size={18} className="text-indigo-500 shrink-0 ml-2 mt-2" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {isMenuOpen && <div className="absolute inset-0 bg-slate-900/20 z-40 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)} />}

      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_#e0e7ff_0%,_transparent_70%)]" />
      </div>

      <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/24/audio_3473f32c31.mp3" loop />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => { handleReset(); setCurrentView('home'); }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-all">
            <ArrowLeft size={18} />
          </button>
          <button onClick={() => setIsMenuOpen(true)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-all">
            <Menu size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { handleReset(); setCurrentView('history'); }} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-all">
            <Trophy size={18} />
          </button>
          <button onClick={() => setMusicEnabled(!musicEnabled)} className={`p-2.5 rounded-xl border transition-all ${musicEnabled ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
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
            const aggregated: Record<string, { seconds: number, reps: string }> = {};
            todayWorkouts.forEach(workout => {
              if (workout.exerciseStats) {
                workout.exerciseStats.forEach(stat => {
                  if (!aggregated[stat.name]) aggregated[stat.name] = { seconds: 0, reps: stat.reps || '' };
                  aggregated[stat.name].seconds += stat.durationSeconds;
                  if (stat.reps && !aggregated[stat.name].reps.includes(stat.reps)) aggregated[stat.name].reps += `, ${stat.reps}`;
                });
              }
            });
            const stats = Object.entries(aggregated).map(([name, data]) => ({ name, seconds: data.seconds, reps: data.reps })).sort((a,b) => b.seconds - a.seconds);

            return (
              <div className="w-full text-center px-4 fade-in">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-4">RESUMEN DE LA SESIÓN</div>
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl w-full text-left">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 mb-3">Total Acumulado Hoy</h3>
                  {stats.length === 0 ? <p className="text-sm text-slate-400">Aún no hay datos</p> : (
                    <div className="flex flex-col gap-3 max-h-[30vh] overflow-y-auto">
                      {stats.map((stat, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-700 truncate mr-2">{stat.name}</span>
                            <span className="text-indigo-600 font-black shrink-0 whitespace-nowrap">
                              {Math.floor(stat.seconds/60) > 0 ? `${Math.floor(stat.seconds/60)}m ${stat.seconds%60 > 0 ? stat.seconds%60+'s':''}` : `${stat.seconds}s`}
                            </span>
                          </div>
                          {stat.reps && <p className="text-xs text-slate-400 font-medium truncate block">Repeticiones aprox: {stat.reps.replace(/^, /, '')}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="relative w-[55%] max-w-[240px] shrink-0 aspect-square flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90 drop-shadow-xl overflow-visible">
              <circle cx="50%" cy="50%" r="46%" stroke="#e2e8f0" strokeWidth="8" fill="white" />
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
            <div className="text-center w-full px-2 relative z-10">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                {["FINAL","ÉXITO","WARMUP","CALENTAMIENTO"].includes(currentStep.round.toUpperCase()) ? currentStep.round : `Ronda ${currentStep.round}`}
              </div>
              
              {currentStep.duration > 0 ? (
                <div className="text-5xl font-black tracking-tighter tabular-nums text-slate-800 leading-none">
                  {formatTime(timeLeft)}
                </div>
              ) : (
                <div className="text-4xl font-black tracking-tight text-slate-800 leading-none px-2 py-4">
                  {currentStep.reps || "¡DALE!"}
                </div>
              )}
              
              {currentStep.duration > 0 && currentStep.reps && (
                 <div className="mt-1 -mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-500">{currentStep.reps} Reps</div>
              )}

              <div className={`mt-2 px-3 py-1 border-2 font-bold text-[9px] uppercase tracking-widest ${currentStep.border} ${currentStep.color} bg-white inline-block rounded-full shadow-sm`}>
                {currentStep.type}
              </div>
            </div>
          </div>
        )}

        <div className={`mt-4 w-full bg-white shadow-lg border-2 ${currentStep.border} p-4 rounded-2xl shrink-0`}>
          {currentStep.imageKeyword && <ExerciseImage keyword={currentStep.imageKeyword} />}
          <div className="flex justify-between items-start gap-2 mb-1">
            <h2 className="text-lg font-black text-slate-800 leading-tight">{currentStep.title}</h2>
            <Zap className={`${isActive ? 'text-amber-400 animate-bounce' : 'text-slate-300'} shrink-0 w-5 h-5`} fill={isActive ? 'currentColor' : 'none'} />
          </div>
          <p className="text-slate-600 text-[13px] font-medium leading-relaxed">{currentStep.desc}</p>
        </div>
      </div>

      {/* Controls */}
      {currentStep.type !== "COMPLETE" && (
        <div className="mt-4 flex items-center justify-center gap-5 mb-4 z-10 shrink-0">
          <button onClick={handleReset} className="p-3 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"><RotateCcw size={20} /></button>
          
          {currentStep.duration > 0 ? (
            <button onClick={toggleStart} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all active:scale-95 ${isActive ? 'bg-indigo-50 border-4 border-indigo-100 text-indigo-500' : 'bg-indigo-500 text-white shadow-xl shadow-indigo-200 hover:scale-105'}`}>
              {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
            </button>
          ) : (
            <button onClick={handleNext} className="h-16 px-8 rounded-[2rem] flex items-center justify-center transition-all active:scale-95 bg-indigo-500 text-white shadow-xl shadow-indigo-200 hover:scale-105 font-black tracking-widest uppercase">
              HECHO
            </button>
          )}

          <button onClick={handleNext} className="p-3 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"><SkipForward size={20} /></button>
        </div>
      )}

      {currentStep.type === "COMPLETE" && (
        <div className="mt-4 flex items-center justify-center mb-4 z-10 shrink-0">
          <button onClick={() => { handleReset(); setCurrentView('home'); }} className="py-4 px-8 rounded-[28px] bg-slate-900 text-white font-black tracking-widest active:scale-95 transition-transform flex items-center gap-2 shadow-xl shadow-slate-300 w-full">
            VOLVER AL INICIO
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="w-full z-10 pb-2 shrink-0">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PROGRESO</span>
          <span className="text-xs text-indigo-500 font-bold">{Math.round(totalProgress || 0)}%</span>
        </div>
        <div className="h-2.5 w-full bg-white border border-slate-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-[1s] rounded-full" style={{ width: `${totalProgress || 0}%` }} />
        </div>
      </div>
    </div>
  );
}
