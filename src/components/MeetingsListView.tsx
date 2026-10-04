import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Calendar, Clock, MapPin, Users, ArrowLeft, Filter, FileText } from 'lucide-react';
import { Meeting } from '../types';

interface MeetingsListViewProps {
  meetings: Meeting[];
  onSelectMeeting: (m: Meeting) => void;
  onOpenNewMeetingModal: () => void;
}

export const MeetingsListView: React.FC<MeetingsListViewProps> = ({
  meetings,
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
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            همه جلسات
          </button>
          <button
            onClick={() => setFilter('IN_REVIEW')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'IN_REVIEW'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            در حال بررسی
          </button>
          <button
            onClick={() => setFilter('SEALED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'SEALED'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            مهر و موم شده
          </button>
          <button
            onClick={() => setFilter('ARCHIVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === 'ARCHIVED'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            بایگانی شده
          </button>
        </div>

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
      <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
        {filtered.map((meeting) => {
          const isSealed = meeting.status === 'SEALED' || meeting.status === 'ARCHIVED';
          return (
            <motion.div
              key={meeting.id}
              onClick={() => onSelectMeeting(meeting)}
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: 'easeOut' } } }}
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
                <div className="flex items-center -space-x-2 space-x-reverse">
                  {meeting.participants.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={p.avatar}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                    />
                  ))}
                  <span className="text-[11px] text-slate-400 mr-3">
                    {meeting.signatureCount} از {meeting.totalSignaturesRequired} امضا
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:-translate-x-1 transition-transform">
                  <span>مشاهده سند</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
