import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, description, action, children, className = '' }) => (
  <header className={`page-header flex flex-col gap-4 rounded-[1.75rem] border border-indigo-100/80 bg-white/90 p-4 shadow-[0_20px_55px_-35px_rgba(79,70,229,0.55)] dark:border-indigo-900/50 dark:bg-slate-900/90 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}>
    <div className="min-w-0 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-0.5 hidden text-xs leading-5 text-slate-500 dark:text-slate-400 lg:block">{description}</p>
      </div>
    </div>

    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs leading-7 text-slate-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-slate-300 lg:hidden">
      {description}
    </div>

    {(action || children) && (
      <div className="flex w-full flex-col gap-2 lg:w-auto lg:shrink-0 lg:flex-row lg:items-center lg:justify-end">
        {children}
        {action}
      </div>
    )}
  </header>
);
