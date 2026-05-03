import React from 'react';

export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-[28%] ${className}`}>
      <img src="/logo.png" alt="MyAIronCoach" className="w-full h-full object-cover scale-[1.05]" onError={(e) => {
        // Fallback in case they haven't uploaded it yet
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement?.classList.add('bg-gradient-to-tr', 'from-[#0A0A0F]', 'to-slate-900', 'shadow-[0_4px_20px_rgba(26,145,255,0.3)]', 'border', 'border-white/5');
        const fallbackIcon = document.createElement('div');
        fallbackIcon.innerHTML = `<span class="text-[#1A91FF] font-black text-xl italic">AI</span>`;
        e.currentTarget.parentElement?.appendChild(fallbackIcon);
      }} />
    </div>
  );
}
