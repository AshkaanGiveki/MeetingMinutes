import React from 'react';
import { Layers, Plus, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Template } from '../types';
import { sampleTemplates } from '../data/mockData';

interface TemplatesViewProps {
  onUseTemplate: (t: Template) => void;
  onOpenNewTemplate?: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onUseTemplate,
  onOpenNewTemplate,
}) => {
  return (
    <div className="flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            قالب‌های آماده صورت‌جلسه
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            شروع سریع جلسات سازمانی با چارچوب‌های استاندارد، دستور جلسات و مصوبات پیش‌فرض
          </p>
        </div>

        <button
          onClick={() => alert('ایجاد قالب سفارشی سازمانی')}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد قالب سفارشی</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sampleTemplates.map((t) => (
          <div
            key={t.id}
            className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                  {t.category}
                </span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {t.title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.description}
              </p>

              {/* Agenda defaults list */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  بندهای دستور جلسه پیش‌فرض:
                </span>
                {t.agendaDefaults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-[11px] text-slate-500"
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[9px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onUseTemplate(t)}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-600 font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>استفاده از این قالب برای جلسه جدید</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
