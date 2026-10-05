import React from 'react';
import { Inbox, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.32, ease: 'easeOut' }}
    className={`flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/75 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/70 ${compact ? 'px-5 py-8' : 'px-6 py-14'}`}
    dir="rtl"
  >
    <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
      <div className="absolute inset-1 rounded-xl border border-indigo-100 dark:border-indigo-900/70" />
      <Icon className="relative h-6 w-6" strokeWidth={1.7} />
    </div>
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
    <p className="mt-1.5 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
);
