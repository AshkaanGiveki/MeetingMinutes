import React, { useState, useEffect } from 'react';
import { Search, X, Calendar, FileText, CheckCircle, User, ArrowLeft } from 'lucide-react';
import { Meeting } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: Meeting[];
  onSelectMeeting: (meeting: Meeting) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  meetings,
  onSelectMeeting,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();

  // Search through meetings, agendas, decisions, and participants
  const filteredMeetings = meetings.filter((m) => {
    if (!normalizedQuery) return true;
    const titleMatch = m.title.toLowerCase().includes(normalizedQuery);
    const discMatch = m.discussion.toLowerCase().includes(normalizedQuery);
    const agendaMatch = m.agenda.some((a) => a.text.toLowerCase().includes(normalizedQuery));
    const decMatch = m.decisions.some((d) => d.text.toLowerCase().includes(normalizedQuery));
    const partMatch = m.participants.some((p) => p.name.toLowerCase().includes(normalizedQuery));
    return titleMatch || discMatch || agendaMatch || decMatch || partMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در جلسات، مصوبات، شرکت‌کنندگان و دستور جلسات..."
            autoFocus
            className="w-full text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 bg-transparent focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 flex flex-col gap-1.5">
          {filteredMeetings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              موردی مطابق با جستجوی شما یافت نشد.
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => {
                  onSelectMeeting(meeting);
                  onClose();
                }}
                className="w-full p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between text-right transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                      {meeting.title}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {meeting.persianDate}
                      </span>
                      <span>·</span>
                      <span>{meeting.statusLabel}</span>
                      <span>·</span>
                      <span>{meeting.participants.length} شرکت‌کننده</span>
                    </div>
                  </div>
                </div>

                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between px-5">
          <span>برای انتخاب کلیک کنید</span>
          <span className="font-mono">{filteredMeetings.length} جلسه پیدا شد</span>
        </div>
      </div>
    </div>
  );
};
