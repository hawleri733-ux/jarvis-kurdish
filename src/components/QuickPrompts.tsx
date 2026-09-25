import React from 'react';
import { Sparkles, Terminal } from 'lucide-react';

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  {
    title: 'سیستەمی جاڕڤیس',
    query: 'سڵاو جاڕڤیس، باری سیستەم و ئامادەیی خۆت پشکنین بکە و وەڵامم بدەرەوە.',
    tag: 'سیستەم',
  },
  {
    title: 'کەشوهەوا و ژینگە',
    query: 'کەشوهەوای ئەمڕۆ چۆنە و کەشناسی چۆن کار دەکات، بەڕێزم؟',
    tag: 'کەشوهەوا',
  },
  {
    title: 'نوکتەی کوردی',
    query: 'نوکتەیەکی کوردیی شیرین و بەپێکەنیم بۆ بگێڕەوە، جەنابی.',
    tag: 'پێکەنین',
  },
  {
    title: 'تۆنی ستارک',
    query: 'تۆنی ستارک چۆن دروستی کردیت و پەیوەندیتان چۆن بوو؟',
    tag: 'مێژوو',
  },
  {
    title: 'گەردوونناسی',
    query: 'کونە ڕەشەکان لە گەردووندا چۆن دروست دەبن و چ کاریگەرییەکیان هەیە؟',
    tag: 'زانست',
  },
  {
    title: 'پەندی کوردی',
    query: 'پەندێکی پێشینانی کوردیی زۆر بەمانا و پوختم لەگەڵ شیکردنەوەکەی پێ بڵێ.',
    tag: 'فەرهەنگ',
  },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-kurdish font-medium text-slate-300">
          فەرمانە پێشنیارکراوەکانی دەنگ:
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(p.query)}
            disabled={disabled}
            className="group relative text-right p-2.5 rounded-xl bg-[#06101c]/80 hover:bg-cyan-950/50 border border-cyan-500/15 hover:border-cyan-400/40 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Subtle glow highlight */}
            <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/5 group-hover:bg-cyan-500/15 rounded-full blur-xl pointer-events-none transition-all" />

            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-mono font-hud text-cyan-400/70 border border-cyan-500/20 px-1 rounded bg-cyan-950/40">
                {p.tag}
              </span>
              <Sparkles className="w-3 h-3 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>

            <p className="text-xs font-kurdish font-semibold text-slate-200 group-hover:text-cyan-200 transition-colors line-clamp-1">
              {p.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
