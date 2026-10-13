import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  FileText,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  X
} from 'lucide-react';
import { Template } from '../types';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { TemplateCardsSkeleton } from './LoadingState';
import { CustomSelect } from './CustomSelect';
import { AnimatedModal } from './AnimatedModal';

const templateGridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const templateCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: 'easeOut' as const },
  },
};

interface TemplatesViewProps {
  isAuthenticated?: boolean;
  organizationId?: string;
  onUseTemplate: (template: Template) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ isAuthenticated = true, organizationId, onUseTemplate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('مدیریتی');
  const [newDescription, setNewDescription] = useState('');
  const [newAgendas, setNewAgendas] = useState('بررسی دستور جلسه اصلی\nتصویب تصمیمات و مسئولیت‌ها');

  // Load from API if available
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    fetch('/api/templates')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'بارگذاری قالب‌ها انجام نشد.');
        setTemplates(data?.templates || []);
      })
      .catch(() => setTemplates([]))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, organizationId]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const agendaDefaults = newAgendas
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const createdTemplate: Template = {
      id: `tpl_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim() || 'قالب اختصاصی سازمان',
      agendaDefaults: agendaDefaults.length > 0 ? agendaDefaults : ['بررسی دستور جلسه'],
    };

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdTemplate),
      });
      if (!response.ok) throw new Error('Unable to create template.');
      const data = await response.json();
      setTemplates((current) => [data.template || createdTemplate, ...current]);
    } catch (error) {
      return;
    }
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  const handleDeleteTemplate = async (id: string) => {
    const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (response.ok) setTemplates((current) => current.filter((t) => t.id !== id));
  };

  const handleDuplicate = (tpl: Template) => {
    const copy: Template = {
      ...tpl,
      id: `tpl_${Date.now()}`,
      title: `${tpl.title} (کپی)`,
    };
    void fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
    }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      setTemplates((current) => [data.template || copy, ...current]);
    });
  };

  return (
    <div className="responsive-page flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              قالب‌های محتوایی صورت‌جلسه
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              این قالب‌ها متن اولیه، دستور جلسه و ساختار محتوایی را آماده می‌کنند؛ قالب چاپ PDF جداگانه داخل هر صورت‌جلسه انتخاب می‌شود.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد قالب جدید</span>
        </button>
      </div>

      {/* Grid of Templates */}
      {isLoading ? (
        <TemplateCardsSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="هنوز قالبی ساخته نشده است"
          description="یک قالب استاندارد بسازید تا ایجاد صورت‌جلسه‌های بعدی سریع‌تر و منظم‌تر انجام شود."
          action={<button onClick={() => setIsCreateModalOpen(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20">ایجاد قالب جدید</button>}
        />
      ) : (
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        initial="hidden"
        animate="show"
        variants={templateGridVariants}
      >
        <AnimatePresence mode="popLayout">
        {templates.map((tpl, index) => (
          <motion.div
            key={tpl.id}
            initial="hidden"
            animate="show"
            variants={{ hidden: templateCardVariants.hidden, show: { ...templateCardVariants.show, transition: { ...templateCardVariants.show.transition, delay: index * 0.1 } } }}
            exit={{ opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.2 } }}
            layout
            className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 group hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all hover:shadow-md"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold">
                  {tpl.category}
                </span>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    title="تکثیر قالب"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    title="حذف قالب"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {tpl.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tpl.description}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">بندهای پیش‌فرض:</div>
              <motion.ul className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400" initial="hidden" animate="show" variants={staggerContainerVariants}>
                {tpl.agendaDefaults.slice(0, 3).map((item, idx) => (
                  <motion.li key={idx} layout variants={staggerItemVariants} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span className="truncate">{item}</span>
                  </motion.li>
                ))}
                {tpl.agendaDefaults.length > 3 && (
                  <motion.li variants={staggerItemVariants} className="text-[10px] text-slate-400">
                    + {tpl.agendaDefaults.length - 3} بند دیگر...
                  </motion.li>
                )}
              </motion.ul>

              <button
                onClick={() => onUseTemplate(tpl)}
                className="mt-2 w-full py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>استفاده از این قالب و ایجاد جلسه</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Modal for creating a new template */}
      <AnimatedModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} contentClassName="w-full max-w-md">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                ایجاد قالب صورت‌جلسه جدید
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  عنوان قالب:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: جلسه بازنگری حقوقی قراردادها"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  دسته‌بندی:
                </label>
                <CustomSelect
                  value={newCategory}
                  onChange={setNewCategory}
                  className="w-full"
                  options={[
                    { value: 'مدیریتی', label: 'مدیریتی' },
                    { value: 'فنی و محصول', label: 'فنی و محصول' },
                    { value: 'حقوقی', label: 'حقوقی' },
                    { value: 'مالی و منابع انسانی', label: 'مالی و منابع انسانی' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  توضیحات مختصر:
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="کاربرد این قالب برای سازمان چیست؟"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  بندهای پیش‌فرض دستور جلسه (هر خط یک بند):
                </label>
                <textarea
                  rows={4}
                  value={newAgendas}
                  onChange={(e) => setNewAgendas(e.target.value)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
                >
                  ذخیره قالب
                </button>
              </div>
            </form>
          </div>
      </AnimatedModal>
    </div>
  );
};
