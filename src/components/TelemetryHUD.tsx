import React from 'react';
import { Volume2, VolumeX, Bell, BellOff, Cpu, ShieldCheck, Activity, Zap } from 'lucide-react';
import { VoiceOption } from '../types/jarvis';

interface TelemetryHUDProps {
  voices: VoiceOption[];
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  soundFxEnabled: boolean;
  onToggleSoundFx: () => void;
  onRunDiagnostics: () => void;
  latencyMs: number;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  voices,
  selectedVoice,
  onVoiceChange,
  isMuted,
  onToggleMute,
  soundFxEnabled,
  onToggleSoundFx,
  onRunDiagnostics,
  latencyMs,
}) => {
  return (
    <div className="w-full bg-[#081220]/80 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
        {/* Left: Stark Industries Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-hud font-bold tracking-widest text-cyan-300 text-sm">
                STARK INDUSTRIES
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                MK-85
              </span>
            </div>
            <div className="text-[11px] font-kurdish text-slate-400 flex items-center gap-1.5">
              <span>جاڕڤیسی هۆشمەند بە کوردی سۆرانی</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Diagnostic Button */}
          <button
            onClick={onRunDiagnostics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-kurdish font-medium bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 transition-colors cursor-pointer"
            title="پشکنینی خێرای سیستم"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">پشکنینی سیستم</span>
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60'
            }`}
            title={isMuted ? 'دەنگ بێدەنگ کراوە (کرتە بکە بۆ چالاککردن)' : 'دەنگ چالاکە'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSoundFx}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              soundFxEnabled
                ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60'
                : 'bg-slate-900/60 border-slate-700/40 text-slate-400'
            }`}
            title={soundFxEnabled ? 'دەنگی سیستەم چالاکە' : 'دەنگی سیستەم ناچالاکە'}
          >
            {soundFxEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
        {/* Metric 1: System Status */}
        <div className="bg-[#040810]/70 border border-cyan-500/10 rounded-xl p-2.5">
          <div className="text-[10px] font-kurdish text-slate-400 flex items-center justify-between">
            <span>دۆخی سیستەم</span>
            <Activity className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="mt-1 font-hud font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>ONLINE • 100%</span>
          </div>
        </div>

        {/* Metric 2: Voice Model Selector */}
        <div className="bg-[#040810]/70 border border-cyan-500/10 rounded-xl p-2.5">
          <div className="text-[10px] font-kurdish text-slate-400 flex items-center justify-between">
            <span>دەنگی جاڕڤیس</span>
            <Zap className="w-3 h-3 text-cyan-400" />
          </div>
          <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="mt-1 w-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-200 text-xs rounded px-1.5 py-0.5 outline-none font-kurdish cursor-pointer"
          >
            {voices.map((v) => (
              <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                {v.kurdishLabel} ({v.name})
              </option>
            ))}
          </select>
        </div>

        {/* Metric 3: Response latency */}
        <div className="bg-[#040810]/70 border border-cyan-500/10 rounded-xl p-2.5">
          <div className="text-[10px] font-kurdish text-slate-400 flex items-center justify-between">
            <span>خێرایی وەڵامدانەوە</span>
            <span className="font-hud text-[10px] text-cyan-400">PING</span>
          </div>
          <div className="mt-1 font-hud font-semibold text-cyan-300 text-xs">
            {latencyMs > 0 ? `${latencyMs} ms` : 'STABLE (HD)'}
          </div>
        </div>

        {/* Metric 4: Neural Engine */}
        <div className="bg-[#040810]/70 border border-cyan-500/10 rounded-xl p-2.5">
          <div className="text-[10px] font-kurdish text-slate-400 flex items-center justify-between">
            <span>مۆدێلی ژیری</span>
            <span className="font-hud text-[10px] text-amber-400">AI</span>
          </div>
          <div className="mt-1 font-hud font-semibold text-slate-200 text-xs truncate">
            Gemini 3.8 Flash
          </div>
        </div>
      </div>
    </div>
  );
};
