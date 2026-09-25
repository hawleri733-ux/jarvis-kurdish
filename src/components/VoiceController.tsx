import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Square, AudioWaveform as Waveform, AlertCircle } from 'lucide-react';
import { VoiceState } from '../types/jarvis';
import { playSoundFx } from '../utils/audioEffects';

interface VoiceControllerProps {
  state: VoiceState;
  onSendMessage: (text: string) => void;
  onSendVoiceRecording: (audioBlob: Blob, mimeType: string) => void;
  onStopPlayback: () => void;
  soundFxEnabled: boolean;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  state,
  onSendMessage,
  onSendVoiceRecording,
  onStopPlayback,
  soundFxEnabled,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError(null);
    try {
      // Stop any current voice playback
      onStopPlayback();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      playSoundFx('listening', soundFxEnabled);

      // Determine supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 2000) {
          onSendVoiceRecording(audioBlob, mimeType);
        } else {
          setMicError('دەنگەکە زۆر کورت بوو، تکایە کەمێک درێژتر قسە بکە.');
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setMicError('تکایە ڕێگە بدە بە مایکرۆفۆن تا بتوانی بە دەنگ قسە بکەیت.');
      playSoundFx('error', soundFxEnabled);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      playSoundFx('sent', soundFxEnabled);
    }
    setIsRecording(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isRecording || state === 'thinking') return;

    onSendMessage(trimmed);
    setInputText('');
  };

  const isBusy = state === 'thinking';

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Mic permission or error banner */}
      {micError && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-kurdish">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}

      {/* Main Input Control Bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 bg-[#081220]/90 border border-cyan-500/30 rounded-2xl p-2 backdrop-blur-lg shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
      >
        {/* Glowing Voice Recording / Push-to-Talk Button */}
        <button
          type="button"
          onClick={() => {
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          disabled={isBusy}
          className={`relative p-3 sm:px-4 rounded-xl font-kurdish font-bold flex items-center justify-center gap-2 transition-all cursor-pointer select-none shrink-0 ${
            isRecording
              ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.8)] animate-pulse'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? 'کرتە بکە بۆ ناردنی دەنگ' : 'دەست لێبدە و بە کوردی قسە بکە'}
        >
          {isRecording ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span className="text-xs hidden sm:inline">
                وەستاندن (00:0{recordDuration})
              </span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span className="text-xs hidden sm:inline">قسەکردن بە دەنگ</span>
            </>
          )}

          {/* Ripple pulse on recording */}
          {isRecording && (
            <span className="absolute -inset-1 rounded-xl border-2 border-rose-500/80 animate-ping pointer-events-none" />
          )}
        </button>

        {/* Text Input with Kurdish placeholder */}
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isRecording || isBusy}
            placeholder={
              isRecording
                ? 'دەنگ تۆمار دەکرێت... بە کوردیی سۆرانی قسە بکە'
                : 'فەرمانێک بنووسە یان پرسیارێک بکە، جەنابی...'
            }
            className="w-full bg-[#030712]/80 border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none font-kurdish transition-all"
          />

          {isRecording && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400">
              <Waveform className="w-4 h-4 animate-pulse" />
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isRecording || isBusy}
          className="p-3 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
          title="ناردن"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
};
