import React, { useState, useEffect, useRef } from 'react';
import { ArcReactorCore } from './components/ArcReactorCore';
import { TelemetryHUD } from './components/TelemetryHUD';
import { ChatHUD } from './components/ChatHUD';
import { QuickPrompts } from './components/QuickPrompts';
import { VoiceController } from './components/VoiceController';
import { ChatMessage, VoiceOption, VoiceState } from './types/jarvis';
import {
  playSoundFx,
  playWavAudio,
  stopCurrentAudio,
  speakWithBrowserKurdish,
  getAudioContext,
} from './utils/audioEffects';
import { Shield, Sparkles } from 'lucide-react';

const VOICES: VoiceOption[] = [
  {
    id: 'Fenrir',
    name: 'Fenrir',
    kurdishLabel: 'فێنریر (دەنگی جاڕڤیسی بەڕێز)',
    desc: 'دەنگێکی قووڵ و سەنگین وەک جاڕڤیسی ڕاستەقینە',
    gender: 'male',
  },
  {
    id: 'Puck',
    name: 'Puck',
    kurdishLabel: 'پەک (چالاک و ڕوون)',
    desc: 'دەنگێکی نەرم و دۆستانە',
    gender: 'male',
  },
  {
    id: 'Charon',
    name: 'Charon',
    kurdishLabel: 'چارۆن (فەرمی و باڵا)',
    desc: 'دەنگێکی دەسەڵاتدار و هێمن',
    gender: 'male',
  },
  {
    id: 'Kore',
    name: 'Kore',
    kurdishLabel: 'کۆری (کچانەی هێمن)',
    desc: 'دەنگێکی میهرەبان و زانستی',
    gender: 'female',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    kurdishLabel: 'زێفیر (هاوسەنگ)',
    desc: 'دەنگێکی پاراو و ئاسایی',
    gender: 'male',
  },
];

const INITIAL_GREETING: ChatMessage = {
  id: 'jarvis-welcome-1',
  role: 'assistant',
  text: 'سڵاو و ڕێز، جەنابی! من جـاڕڤیـس (J.A.R.V.I.S)م، یاریدەدەری هۆشمەندی دەستکردی ئێوە. سیستەمەکان بە تەواوی ئامادەن و بە زمانی کوردیی سۆرانی بە دەنگ وەڵامتان دەدەمەوە. فەرمانتان لەسەر چاو، چۆن دەتوانم ئەمڕۆ یارمەتیت بدەم؟',
  timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
  voiceName: 'Fenrir',
};

export default function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [selectedVoice, setSelectedVoice] = useState<string>('Fenrir');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [soundFxEnabled, setSoundFxEnabled] = useState<boolean>(true);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [systemTime, setSystemTime] = useState<string>('');

  const stopAudioRef = useRef<(() => void) | null>(null);

  // Live HUD Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Humanize and clean error messages into courteous Kurdish
  const formatErrorMessage = (err: any): string => {
    const raw = String(err?.message || err || '');
    if (raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')) {
      return 'جەنابی بەڕێز، بەهۆی گەیشتن بە سنووری کووتای داواکارییەکان (Rate Limit)، تکایە چەند چرکەیەکی کەم چاوەڕێ بفەرموون و دووبارە فەرمان بدەن.';
    }
    if (raw.includes('503') || raw.includes('UNAVAILABLE')) {
      return 'سیستەمەکانی جاڕڤیس کەمێک قەرەباڵغن، تکایە چەند چرکەیەکی تر تاقی بکەرەوە.';
    }
    return 'ببوورە جەنابی، پەیوەندی لەگەڵ ناوەندی هۆشمەند لەکارکەوت، تکایە دووبارەی بکەرەوە.';
  };

  // Handle playing audio for a message
  const handlePlayAudio = (message: ChatMessage) => {
    // Stop any existing playback
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    stopCurrentAudio();

    if (message.audioUrl) {
      setVoiceState('speaking');
      setCurrentlyPlayingId(message.id);

      const cancelFn = playWavAudio(
        message.audioUrl,
        () => {
          setVoiceState('speaking');
          setCurrentlyPlayingId(message.id);
        },
        () => {
          setVoiceState('idle');
          setCurrentlyPlayingId(null);
          stopAudioRef.current = null;
        }
      );
      stopAudioRef.current = cancelFn;
    } else {
      // Browser speech synthesis fallback
      setVoiceState('speaking');
      setCurrentlyPlayingId(message.id);
      speakWithBrowserKurdish(
        message.text,
        () => {
          setVoiceState('speaking');
          setCurrentlyPlayingId(message.id);
        },
        () => {
          setVoiceState('idle');
          setCurrentlyPlayingId(null);
        }
      );
    }
  };

  const handleStopAudio = () => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    stopCurrentAudio();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('idle');
    setCurrentlyPlayingId(null);
  };

  // Send text message to Jarvis
  const handleSendMessage = async (text: string) => {
    handleStopAudio();
    playSoundFx('click', soundFxEnabled);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setVoiceState('thinking');

    const startTime = performance.now();

    try {
      // Format chat history for context
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          voiceName: selectedVoice,
          generateAudio: !isMuted,
        }),
      });

      const data = await res.json();
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to communicate with Jarvis');
      }

      playSoundFx('reply', soundFxEnabled);

      const jarvisMsg: ChatMessage = {
        id: `jarvis-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        audioUrl: data.audio || null,
        timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
        voiceName: selectedVoice,
      };

      setMessages((prev) => [...prev, jarvisMsg]);

      // Automatically play voice if not muted
      if (!isMuted && data.audio) {
        handlePlayAudio(jarvisMsg);
      } else {
        setVoiceState('idle');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setVoiceState('error');
      playSoundFx('error', soundFxEnabled);

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: formatErrorMessage(err),
        timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);

      setTimeout(() => {
        setVoiceState('idle');
      }, 3500);
    }
  };

  // Send direct audio recording to Jarvis (Speech-to-Speech pipeline)
  const handleSendVoiceRecording = async (audioBlob: Blob, mimeType: string) => {
    handleStopAudio();
    setVoiceState('thinking');

    const startTime = performance.now();

    try {
      // Convert Blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;

          const historyPayload = messages.map((m) => ({
            role: m.role,
            text: m.text,
          }));

          const res = await fetch('/api/voice-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType,
              history: historyPayload,
              voiceName: selectedVoice,
            }),
          });

          const data = await res.json();
          const endTime = performance.now();
          setLatencyMs(Math.round(endTime - startTime));

          if (!res.ok) {
            throw new Error(data.error || 'Voice processing error');
          }

          if (data.userText) {
            const userMsg: ChatMessage = {
              id: `user-${Date.now()}`,
              role: 'user',
              text: data.userText,
              timestamp: new Date().toLocaleTimeString('ku', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };

            const jarvisMsg: ChatMessage = {
              id: `jarvis-${Date.now() + 1}`,
              role: 'assistant',
              text: data.text,
              audioUrl: data.audio || null,
              timestamp: new Date().toLocaleTimeString('ku', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              voiceName: selectedVoice,
            };

            setMessages((prev) => [...prev, userMsg, jarvisMsg]);
            playSoundFx('reply', soundFxEnabled);

            if (!isMuted && data.audio) {
              handlePlayAudio(jarvisMsg);
            } else {
              setVoiceState('idle');
            }
          } else {
            setVoiceState('idle');
          }
        } catch (innerErr: any) {
          console.error('Inner voice processing error:', innerErr);
          setVoiceState('error');
          playSoundFx('error', soundFxEnabled);
          const errorMsg: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            text: formatErrorMessage(innerErr),
            timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, errorMsg]);
          setTimeout(() => setVoiceState('idle'), 3500);
        }
      };
    } catch (err: any) {
      console.error('Voice send error:', err);
      setVoiceState('error');
      playSoundFx('error', soundFxEnabled);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: formatErrorMessage(err),
        timestamp: new Date().toLocaleTimeString('ku', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setTimeout(() => setVoiceState('idle'), 3500);
    }
  };

  // Run full system diagnostics and voice test
  const handleRunDiagnostics = () => {
    playSoundFx('activate', soundFxEnabled);
    getAudioContext(); // Ensure AudioContext is warm

    handleSendMessage(
      'جاڕڤیس، پشکنینێکی تەواوی سیستەم، باڵیۆزی دەنگی کوردی و ئاستی زیرەکیی دەستکرد بکە و بە دەنگ ڕاپۆرتێکم پێ بدە.'
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-between hud-grid relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Holographic background ambient lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Futuristic Iron Man / Stark Header */}
      <header className="w-full max-w-6xl px-4 py-3 border-b border-cyan-500/20 bg-[#050b14]/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-[1px] shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <div className="w-full h-full bg-[#030712] rounded-[11px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-hud font-bold tracking-wider text-base sm:text-lg text-cyan-300">
                J.A.R.V.I.S
              </h1>
              <span className="font-kurdish font-bold text-xs sm:text-sm text-slate-200">
                جاڕڤیسی هۆشمەند بە زمانی کوردی
              </span>
            </div>
            <div className="text-[10px] font-hud text-cyan-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span>MARK 85 NEURAL MATRIX</span>
              <span>•</span>
              <span className="text-emerald-400">ONLINE</span>
            </div>
          </div>
        </div>

        {/* HUD Clock & System Telemetry */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Kurdish Sorani (سۆرانی)</span>
          </div>
          <div className="font-hud text-cyan-400 text-sm tracking-widest px-2.5 py-1 rounded bg-[#020617] border border-cyan-500/20">
            {systemTime || '00:00:00'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl px-4 py-4 flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 z-10">
        {/* Left / Center Section: Arc Reactor & Telemetry HUD */}
        <div className="w-full lg:w-5/12 flex flex-col items-center gap-5">
          {/* Animated Arc Reactor Core */}
          <div className="w-full flex justify-center py-2">
            <ArcReactorCore
              state={voiceState}
              onCoreClick={() => {
                playSoundFx('activate', soundFxEnabled);
                handleSendMessage('سڵاو جاڕڤیس، بڵێ فەرمانتان سەرسەرم گەورەم.');
              }}
              isListening={voiceState === 'listening'}
            />
          </div>

          {/* Telemetry HUD & Voice Controls */}
          <TelemetryHUD
            voices={VOICES}
            selectedVoice={selectedVoice}
            onVoiceChange={(v) => {
              setSelectedVoice(v);
              playSoundFx('click', soundFxEnabled);
            }}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((prev) => !prev)}
            soundFxEnabled={soundFxEnabled}
            onToggleSoundFx={() => setSoundFxEnabled((prev) => !prev)}
            onRunDiagnostics={handleRunDiagnostics}
            latencyMs={latencyMs}
          />
        </div>

        {/* Right Section: Chat HUD, Quick Prompts & Voice Controller */}
        <div className="w-full lg:w-7/12 flex flex-col gap-4">
          {/* Chat Feed */}
          <ChatHUD
            messages={messages}
            onPlayAudio={handlePlayAudio}
            currentlyPlayingId={currentlyPlayingId}
            onClearHistory={() => {
              handleStopAudio();
              setMessages([INITIAL_GREETING]);
            }}
            onStopAudio={handleStopAudio}
          />

          {/* Quick Prompts Chips in Kurdish */}
          <QuickPrompts
            onSelectPrompt={(text) => handleSendMessage(text)}
            disabled={voiceState === 'thinking'}
          />

          {/* Microphone & Voice Input Bar */}
          <VoiceController
            state={voiceState}
            onSendMessage={handleSendMessage}
            onSendVoiceRecording={handleSendVoiceRecording}
            onStopPlayback={handleStopAudio}
            soundFxEnabled={soundFxEnabled}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-2.5 px-4 text-center border-t border-cyan-500/10 bg-[#02050e]/80 text-[11px] font-kurdish text-slate-500 z-10 flex flex-wrap items-center justify-center gap-4">
        <span>سیستەمی جاڕڤیس بە زمانی کوردیی سۆرانی لەگەڵ ناسینەوە و وەڵامدانەوەی دەنگ</span>
        <span className="font-hud text-cyan-400/50">STARK INDUSTRIES • POWERED BY GEMINI 3.8 FLASH</span>
      </footer>
    </div>
  );
}
