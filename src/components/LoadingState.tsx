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

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`} />
);

export const MeetingCardsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Loading meetings">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex min-h-[174px] flex-col justify-between gap-4 rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <div className="space-y-2 pt-1"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2"><div className="flex -space-x-2 space-x-reverse"><Skeleton className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900" /><Skeleton className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900" /><Skeleton className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900" /></div><Skeleton className="h-3 w-16" /></div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    ))}
  </div>
);

export const MeetingListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="responsive-page mx-auto flex max-w-5xl flex-1 flex-col gap-6 p-6" dir="rtl" aria-label="Loading meetings page">
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-2"><Skeleton className="h-6 w-44 rounded-lg" /><Skeleton className="h-3 w-64 max-w-full rounded-full" /></div>
      <Skeleton className="h-10 w-32 shrink-0 rounded-2xl" />
    </div>
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sm:flex-row">
      <div className="flex w-full gap-1 overflow-hidden rounded-xl bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto"><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div>
      <Skeleton className="h-8 w-full rounded-xl sm:w-64" />
    </div>
    <MeetingCardsSkeleton count={count} />
  </div>
);

export const TemplateCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Loading templates">
    {Array.from({ length: count }, (_, index) => <div key={index} className="flex min-h-[240px] flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"><div className="space-y-4"><Skeleton className="h-5 w-24 rounded-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div><div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-2/3" /><Skeleton className="h-10 w-full rounded-2xl" /></div></div>)}
  </div>
);

export const TableSkeleton: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 5 }) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90" aria-label="Loading table"><div className="h-11 border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50" /><div className="divide-y divide-slate-100 dark:divide-slate-800">{Array.from({ length: rows }, (_, row) => <div key={row} className="grid items-center gap-4 px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, column) => <Skeleton key={column} className={`h-4 ${column === 0 ? 'w-4/5' : 'w-3/5'}`} />)}</div>)}</div></div>
);

export const TableRowsSkeleton: React.FC<{ columns: number; rows?: number }> = ({ columns, rows = 5 }) => (
  <>{Array.from({ length: rows }, (_, row) => <tr key={row} className="animate-pulse">{Array.from({ length: columns }, (_, column) => <td key={column} className="px-4 py-4"><Skeleton className={`h-4 ${column === 0 ? 'w-4/5' : 'w-3/5'}`} /></td>)}</tr>)}</>
);

export const OrganizationCardsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="flex flex-col gap-4" aria-label="Loading organizations">
    {Array.from({ length: count }, (_, index) => <div key={index} className="org-card group relative">
      <div className="org-card-surface relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="org-card-content flex flex-col gap-5 p-4 pr-14 sm:p-5 sm:pr-16 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:p-6 lg:pr-20">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-3 w-3/4 rounded-full" />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="org-member-avatars inline-flex items-center">
                <Skeleton className="org-member-avatar h-7 w-7 rounded-full border-2 border-white dark:border-slate-900" />
                <Skeleton className="org-member-avatar -mr-1.5 h-7 w-7 rounded-full border-2 border-white dark:border-slate-900" />
                <Skeleton className="org-member-avatar -mr-1.5 h-7 w-7 rounded-full border-2 border-white dark:border-slate-900" />
                <Skeleton className="org-member-avatar -mr-1.5 h-7 w-7 rounded-full border-2 border-white dark:border-slate-900" />
              </span>
              <span className="org-card-badges inline-flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-40">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="org-card-identity">
        <div className="org-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white/80 dark:bg-slate-800 dark:ring-slate-900/80">
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>)}
  </div>
);

export const GuestSigningSkeleton: React.FC = () => (
  <main className="min-h-screen bg-slate-50 px-4 py-10" aria-label="Loading document">
    <div className="mx-auto max-w-3xl space-y-5"><div className="rounded-3xl bg-indigo-700 p-7"><Skeleton className="h-5 w-48 bg-indigo-400/50" /><Skeleton className="mt-5 h-8 w-2/3 bg-indigo-400/50" /><Skeleton className="mt-3 h-4 w-1/2 bg-indigo-400/50" /></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><Skeleton className="h-6 w-40" /><div className="mt-5 space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div><div className="mt-6 grid gap-4 md:grid-cols-2"><div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div><div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div></div></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><Skeleton className="h-5 w-44" /><Skeleton className="mt-4 h-12 w-full rounded-xl" /><Skeleton className="mt-3 h-12 w-full rounded-xl" /><Skeleton className="mt-4 h-12 w-full rounded-xl" /></div></div>
  </main>
);

export const MeetingWorkspaceSkeleton: React.FC = () => (
  <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 pb-6" dir="rtl" aria-label="در حال بارگذاری جلسه">
    <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-lg shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/20 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <div className="flex items-center gap-2"><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-4 w-28 rounded-full" /></div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-7 w-2/3 rounded-lg" /><Skeleton className="h-3 w-1/2 rounded-full" /></div>
        <Skeleton className="hidden h-4 w-32 rounded-full sm:block" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-slate-900/80">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}
      </div>
    </div>

    <div className="flex flex-col items-stretch gap-6 pt-4 xl:flex-row xl:items-start">
      <div className="order-2 w-full space-y-4 xl:order-1 xl:w-72"><Skeleton className="h-[22rem] rounded-3xl" /><Skeleton className="h-44 rounded-3xl" /></div>
      <div className="order-1 min-w-0 flex-1 xl:order-2 xl:max-w-4xl">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800"><Skeleton className="h-9 w-40 rounded-xl" /><div className="flex gap-2"><Skeleton className="h-10 w-32 rounded-xl" /><Skeleton className="h-10 w-10 rounded-xl" /></div></div>
          <div className="mt-7 space-y-4"><Skeleton className="h-5 w-40 rounded-lg" /><Skeleton className="h-12 w-full rounded-2xl" /><Skeleton className="h-12 w-11/12 rounded-2xl" /><Skeleton className="h-12 w-4/5 rounded-2xl" /></div>
          <div className="mt-8 space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800"><Skeleton className="h-5 w-48 rounded-lg" /><Skeleton className="h-28 w-full rounded-2xl" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-20 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div></div>
        </div>
      </div>
      <div className="order-3 w-full space-y-4 xl:w-72"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-44 rounded-3xl" /></div>
    </div>
  </div>
);

export const AppBootSkeleton: React.FC = () => (
  <div className="min-h-screen bg-[#f4f7fb] p-3" aria-label="Loading application"><div className="mx-auto max-w-7xl space-y-4"><div className="h-[4.5rem] rounded-[22px] border border-slate-200/80 bg-white/90" /><div className="grid grid-cols-[18rem_minmax(0,1fr)] gap-3"><div className="h-[calc(100vh-6rem)] rounded-[22px] border border-slate-200/80 bg-white/90" /><div className="space-y-4"><MeetingCardsSkeleton count={4} /></div></div></div></div>
);
