import React, { useEffect, useRef, useState } from 'react';
import { VoiceState } from '../types/jarvis';
import { getAudioAnalyser } from '../utils/audioEffects';

interface ArcReactorCoreProps {
  state: VoiceState;
  onCoreClick?: () => void;
  isListening: boolean;
}

export const ArcReactorCore: React.FC<ArcReactorCoreProps> = ({
  state,
  onCoreClick,
  isListening,
}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencies, setFrequencies] = useState<number[]>(new Array(24).fill(10));
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const updateAudioData = () => {
      if (!active) return;

      try {
        const analyser = getAudioAnalyser();
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;

        // Sample 24 bars for circular visualizer
        const sampled: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 24));
        for (let i = 0; i < 24; i++) {
          const val = dataArray[i * step] || 0;
          sampled.push(val);
        }

        // If speaking or listening, apply real or synthetic waveform
        if (state === 'speaking' || isListening) {
          setAudioLevel(avg / 255);
          setFrequencies(sampled);
        } else if (state === 'thinking') {
          // Dynamic swirling frequencies during thinking
          const time = Date.now() / 200;
          const fakeFreqs = Array.from({ length: 24 }, (_, i) => {
            return 30 + Math.sin(time + i * 0.5) * 25 + Math.random() * 15;
          });
          setFrequencies(fakeFreqs);
          setAudioLevel(0.4);
        } else {
          // Idle breathing
          setAudioLevel(0.1);
          setFrequencies(new Array(24).fill(12));
        }
      } catch (err) {
        // Fallback
      }

      animFrameRef.current = requestAnimationFrame(updateAudioData);
    };

    updateAudioData();

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, isListening]);

  // Color schemes based on state
  const stateColor = {
    idle: {
      primary: '#06b6d4', // Cyan
      secondary: '#0284c7',
      glow: 'rgba(6, 182, 212, 0.4)',
      text: 'جاڕڤیس: ئامادەیە بۆ فەرمان',
      subtext: 'JARVIS SYSTEM ONLINE • STANDBY',
      badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/40',
    },
    listening: {
      primary: '#10b981', // Emerald / Green
      secondary: '#059669',
      glow: 'rgba(16, 185, 129, 0.6)',
      text: 'گوێ دەگرێت... قسە بکە جەنابی',
      subtext: 'AUDIO STREAM ACTIVE • RECORDING',
      badge: 'border-emerald-500/60 text-emerald-400 bg-emerald-950/50 animate-pulse',
    },
    thinking: {
      primary: '#f59e0b', // Amber / Gold
      secondary: '#d97706',
      glow: 'rgba(245, 158, 11, 0.6)',
      text: 'پڕۆسێس دەکرێت... بیرکردنەوە',
      subtext: 'NEURAL COMPUTATION IN PROGRESS',
      badge: 'border-amber-500/60 text-amber-400 bg-amber-950/50 animate-pulse',
    },
    speaking: {
      primary: '#38bdf8', // Light sky blue
      secondary: '#0284c7',
      glow: 'rgba(56, 189, 248, 0.7)',
      text: 'جاڕڤیس وەڵام دەداتەوە...',
      subtext: 'NEURAL SPEECH SYNTHESIS ACTIVE',
      badge: 'border-sky-400 text-sky-300 bg-sky-950/60 shadow-[0_0_15px_rgba(56,189,248,0.5)]',
    },
    error: {
      primary: '#ef4444',
      secondary: '#b91c1c',
      glow: 'rgba(239, 68, 68, 0.6)',
      text: 'کێشە لە پەیوەندی',
      subtext: 'ANOMALY DETECTED • CHECK API KEY',
      badge: 'border-rose-500 text-rose-400 bg-rose-950/50',
    },
  }[state];

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Outer Telemetry Compass Ring */}
      <div
        onClick={onCoreClick}
        title="کورتەکرتە بکە بۆ قسەکردن لەگەڵ جاڕڤیس"
        className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center cursor-pointer group select-none transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
      >
        {/* Ambient Glow Aura */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-700 blur-2xl opacity-60"
          style={{
            backgroundColor: stateColor.glow,
            transform: `scale(${1 + audioLevel * 0.4})`,
          }}
        />

        {/* Circular Audio Waveform Bars (24 radial segments) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 320">
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stateColor.primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={stateColor.secondary} stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {frequencies.map((freq, index) => {
            const angle = (index * 360) / 24;
            const barLength = Math.min(32, 6 + (freq / 255) * 28 * (1 + audioLevel));
            const innerRadius = 138;
            const outerRadius = innerRadius + barLength;
            const rad = ((angle - 90) * Math.PI) / 180;

            const x1 = 160 + innerRadius * Math.cos(rad);
            const y1 = 160 + innerRadius * Math.sin(rad);
            const x2 = 160 + outerRadius * Math.cos(rad);
            const y2 = 160 + outerRadius * Math.sin(rad);

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stateColor.primary}
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-75"
                opacity={0.4 + (freq / 255) * 0.6}
              />
            );
          })}
        </svg>

        {/* Outer Ring 1 - Slow Clockwise */}
        <div
          className={`absolute w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-full border border-dashed border-cyan-500/30 ${
            state === 'thinking' ? 'animate-spin' : 'animate-spin-slow'
          }`}
          style={{ borderColor: `${stateColor.primary}40` }}
        />

        {/* Outer Ring 2 - Tech HUD with Markers */}
        <div
          className="absolute w-[230px] h-[230px] sm:w-[245px] sm:h-[245px] rounded-full border border-cyan-400/20 animate-spin-reverse-slow"
          style={{ borderColor: `${stateColor.primary}30` }}
        >
          {/* Tech Degree Markers */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-hud text-cyan-400/60">
            000°
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono font-hud text-cyan-400/60">
            180°
          </span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono font-hud text-cyan-400/60">
            270°
          </span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono font-hud text-cyan-400/60">
            090°
          </span>
        </div>

        {/* Segmented Ring 3 - Iron Man Arc Reactor Coil Brackets */}
        <div
          className="absolute w-[180px] h-[180px] sm:w-[195px] sm:h-[195px] rounded-full border-2 border-cyan-500/40 animate-spin-medium"
          style={{
            borderColor: `${stateColor.primary}60`,
            borderStyle: 'double',
            borderWidth: '3px',
          }}
        />

        {/* Inner Ring with Reactor Triangular / Hexagonal Elements */}
        <div
          className="absolute w-[130px] h-[130px] sm:w-[145px] sm:h-[145px] rounded-full border border-cyan-300/50 flex items-center justify-center bg-cyan-950/30 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(6,182,212,0.3)] transition-all duration-300"
          style={{
            borderColor: stateColor.primary,
            boxShadow: `inset 0 0 25px ${stateColor.glow}, 0 0 20px ${stateColor.glow}`,
          }}
        >
          {/* Inner Spinning HUD Geometric Crosshair */}
          <div
            className={`absolute inset-2 rounded-full border border-dashed opacity-75 ${
              state === 'thinking' ? 'animate-spin duration-1000' : 'animate-spin-reverse-slow'
            }`}
            style={{ borderColor: stateColor.primary }}
          />

          {/* Central Glowing Energy Core */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              state === 'speaking' || isListening ? 'scale-110' : 'animate-pulse-core'
            }`}
            style={{
              background: `radial-gradient(circle, #ffffff 0%, ${stateColor.primary} 50%, #031422 100%)`,
              boxShadow: `0 0 35px ${stateColor.primary}, 0 0 70px ${stateColor.glow}`,
            }}
          >
            {/* Holographic Jarvis Symbol / Arc Center */}
            <div className="text-center font-hud font-black text-slate-950 tracking-wider text-xs sm:text-sm select-none">
              J•A•R•V•I•S
            </div>
          </div>
        </div>

        {/* Floating Holographic Compass Ticks */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
            style={{ opacity: 0.7 }}
          />
          <div
            className="h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent absolute"
            style={{ opacity: 0.7 }}
          />
        </div>
      </div>

      {/* State Status Banner in Kurdish */}
      <div className="mt-5 text-center flex flex-col items-center">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 ${stateColor.badge}`}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stateColor.primary }}
          />
          <span className="font-kurdish">{stateColor.text}</span>
        </div>

        <p className="mt-1 text-[11px] font-hud text-cyan-400/60 uppercase tracking-widest">
          {stateColor.subtext}
        </p>
      </div>
    </div>
  );
};
