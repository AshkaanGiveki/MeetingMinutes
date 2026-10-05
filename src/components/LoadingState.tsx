import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'در حال بارگذاری…', compact = false }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className={`flex w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/70 text-center dark:border-slate-800 dark:bg-slate-900/60 ${compact ? 'px-5 py-8' : 'px-6 py-14'}`}
    dir="rtl"
  >
    <LoaderCircle className="h-7 w-7 animate-spin text-indigo-500" />
    <span className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
  </motion.div>
);
