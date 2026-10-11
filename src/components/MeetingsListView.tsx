import React, { useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Plus, Search, Calendar, Clock, MapPin, Users, ArrowLeft, Filter, FileText, ClipboardList } from 'lucide-react';
import { Meeting } from '../types';
import { staggerContainerVariants, staggerItemVariants } from './stagger';
import { EmptyState } from './EmptyState';
import { MeetingCardsSkeleton } from './LoadingState';
import { UserAvatar } from './UserAvatar';

interface MeetingsListViewProps {
  meetings: Meeting[];
  isLoading?: boolean;
  onSelectMeeting: (m: Meeting) => void;
  onOpenNewMeetingModal: () => void;
}

export const MeetingsListView: React.FC<MeetingsListViewProps> = ({
  meetings,
  isLoading = false,
  onSelectMeeting,
  onOpenNewMeetingModal,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'IN_REVIEW' | 'SEALED' | 'ARCHIVED'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = meetings.filter((m) => {
    const matchesFilter = filter === 'ALL' || m.status === filter;
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.discussion.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            جلسات و صورت‌جلسات
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مشاهده، پیگیری امضا و مدیریت جلسات رسمی سازمان
          </p>
        </div>

        <button
          onClick={onOpenNewMeetingModal}
          className="py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد جلسه جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Filter Segmented Controls */}
        <LayoutGroup id="meeting-filters">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
          <motion.button
            onClick={() => setFilter('ALL')}
            className={`relative px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {filter === 'ALL' && <motion.span layoutId="meeting-filter-active-background" className="pointer-events-none absolute inset-0 rounded-lg bg-white shadow-xs dark:bg-slate-700" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            {filter === 'ALL' && <motion.span layoutId="meeting-filter-active-border" className="pointer-events-none absolute inset-0 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative z-10">همه جلسات</span>
          </motion.button>
          <motion.button
            onClick={() => setFilter('IN_REVIEW')}
            className={`relative px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'IN_REVIEW'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {filter === 'IN_REVIEW' && <motion.span layoutId="meeting-filter-active-background" className="pointer-events-none absolute inset-0 rounded-lg bg-white shadow-xs dark:bg-slate-700" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            {filter === 'IN_REVIEW' && <motion.span layoutId="meeting-filter-active-border" className="pointer-events-none absolute inset-0 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative z-10">در حال بررسی</span>
          </motion.button>
          <motion.button
            onClick={() => setFilter('SEALED')}
            className={`relative px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'SEALED'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {filter === 'SEALED' && <motion.span layoutId="meeting-filter-active-background" className="pointer-events-none absolute inset-0 rounded-lg bg-white shadow-xs dark:bg-slate-700" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            {filter === 'SEALED' && <motion.span layoutId="meeting-filter-active-border" className="pointer-events-none absolute inset-0 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative z-10">مهر و موم شده</span>
          </motion.button>
          <motion.button
            onClick={() => setFilter('ARCHIVED')}
            className={`relative px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'ARCHIVED'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {filter === 'ARCHIVED' && <motion.span layoutId="meeting-filter-active-background" className="pointer-events-none absolute inset-0 rounded-lg bg-white shadow-xs dark:bg-slate-700" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            {filter === 'ARCHIVED' && <motion.span layoutId="meeting-filter-active-border" className="pointer-events-none absolute inset-0 rounded-lg border border-indigo-200/80 dark:border-indigo-800/80" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
            <span className="relative z-10">بایگانی شده</span>
          </motion.button>
        </div>
        </LayoutGroup>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در جلسات..."
            className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Meeting Cards */}
      {isLoading ? (
        <MeetingCardsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search ? 'جلسه‌ای با این جست‌وجو پیدا نشد' : 'هنوز جلسه‌ای ثبت نشده است'}
          description={search ? 'عبارت دیگری را امتحان کنید یا فیلترها را تغییر دهید.' : 'برای شروع، اولین صورت‌جلسه سازمان خود را ایجاد کنید.'}
          action={!search ? <button onClick={onOpenNewMeetingModal} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20">ایجاد جلسه جدید</button> : undefined}
        />
      ) : (
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15 } } }}>
        <AnimatePresence mode="popLayout">
        {filtered.map((meeting, index) => {
          const isSealed = meeting.status === 'SEALED' || meeting.status === 'ARCHIVED';
          return (
            <motion.div
              key={meeting.id}
              onClick={() => onSelectMeeting(meeting)}
              initial="hidden"
              animate="show"
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.34, delay: index * 0.1, ease: 'easeOut' }}
              exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.2 } }}
              layout
              className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
                      isSealed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSealed ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'
                      }`}
                    />
                    <span>{meeting.statusLabel}</span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{meeting.persianDate}</span>
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {meeting.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {meeting.discussion}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <motion.div className="flex items-center -space-x-2 space-x-reverse" initial="hidden" animate="show" variants={staggerContainerVariants}>
                  {meeting.participants.filter(Boolean).slice(0, 3).map((p, index) => (
                    <motion.span
                      key={p.id || `participant-${index}`}
                      variants={staggerItemVariants}
                      layout
                    ><UserAvatar name={p.name} avatar={p.avatar} className="h-7 w-7 text-[9px] ring-2 ring-white dark:ring-slate-900" imageClassName="h-7 w-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-900" /></motion.span>
                  ))}
                  <span className="text-[11px] text-slate-400 mr-3">
                    {meeting.signatureCount} از {meeting.totalSignaturesRequired} امضا
                  </span>
                </motion.div>

                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:-translate-x-1 transition-transform">
                  <span>مشاهده سند</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
      )}
    </div>
  );
};
