import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Copy, Check, Trash2, Bot, User, Radio } from 'lucide-react';
import { ChatMessage } from '../types/jarvis';

interface ChatHUDProps {
  messages: ChatMessage[];
  onPlayAudio: (msg: ChatMessage) => void;
  currentlyPlayingId: string | null;
  onClearHistory: () => void;
  onStopAudio: () => void;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onPlayAudio,
  currentlyPlayingId,
  onClearHistory,
  onStopAudio,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentlyPlayingId]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col bg-[#070e1a]/85 border border-cyan-500/20 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl flex-1 max-h-[460px] sm:max-h-[520px]">
      {/* HUD Header */}
      <div className="px-4 py-2.5 border-b border-cyan-500/15 flex items-center justify-between bg-cyan-950/20">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-hud text-xs tracking-wider text-cyan-300 font-semibold">
            NEURAL LOGS & TRANSCRIPTS
          </span>
          <span className="text-[11px] font-mono text-cyan-500/60">
            ({messages.length})
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-[11px] font-kurdish text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-rose-950/30"
            title="سڕینەوەی مێژوو"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاککردنەوە</span>
          </button>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-kurdish">
        {messages.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              <Bot className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              جاڕڤیس ئامادەیە، فەرموو پرسیارێک بکە یان دەست بنێ بە دوگمەی مایکرۆفۆنەکەدا
            </p>
            <p className="text-xs text-cyan-400/60 font-hud mt-1">
              READY FOR VOCAL PROTOCOL • CENTRAL KURDISH
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isJarvis = msg.role === 'assistant';
            const isPlayingThis = currentlyPlayingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-sm ${
                  isJarvis ? 'justify-start' : 'justify-end flex-row-reverse'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    isJarvis
                      ? 'bg-cyan-950/80 border-cyan-400/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-indigo-950/80 border-indigo-400/40 text-indigo-300'
                  }`}
                >
                  {isJarvis ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 relative transition-all ${
                    isJarvis
                      ? 'bg-[#091526] border border-cyan-500/25 text-slate-100 rounded-tr-sm shadow-[0_2px_15px_rgba(0,0,0,0.3)]'
                      : 'bg-[#121c33] border border-indigo-500/30 text-indigo-50 rounded-tl-sm'
                  }`}
                >
                  {/* Speaker Label & Timestamp */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-white/5 pb-1">
                    <span
                      className={`text-[11px] font-hud font-bold tracking-wide ${
                        isJarvis ? 'text-cyan-400' : 'text-indigo-400'
                      }`}
                    >
                      {isJarvis ? 'J.A.R.V.I.S (جاڕڤیس)' : 'جەنابی ئێوە'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-kurdish text-slate-200">
                    {msg.text}
                  </div>

                  {/* Actions Bar for Jarvis Messages */}
                  {isJarvis && (
                    <div className="mt-2.5 pt-2 border-t border-cyan-500/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Play / Replay Voice Button */}
                        <button
                          onClick={() => {
                            if (isPlayingThis) {
                              onStopAudio();
                            } else {
                              onPlayAudio(msg);
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-kurdish font-medium border transition-all cursor-pointer ${
                            isPlayingThis
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] animate-pulse'
                              : 'bg-cyan-950/60 hover:bg-cyan-900/60 border-cyan-500/30 text-cyan-300'
                          }`}
                          title="خوێندنەوەی بە دەنگ"
                        >
                          {isPlayingThis ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>وەستاندن</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>لێدانەوەی دەنگ</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="لەبەرگرتنەوەی دەق"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
