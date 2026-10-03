import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Plus, Sparkles } from 'lucide-react';
import { Meeting, Template } from '../types';
import { currentUser, sampleParticipants, sampleTemplates } from '../data/mockData';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMeeting: (newMeeting: Meeting) => void;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  onCreateMeeting,
}) => {
  const [title, setTitle] = useState('');
  const [persianDate, setPersianDate] = useState('۱۵ مهر ۱۴۰۴');
  const [timeRange, setTimeRange] = useState('۱۰:۰۰ - ۱۱:۳۰');
  const [location, setLocation] = useState('اتاق جلسات اصلی');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenTemplate = sampleTemplates.find((t) => t.id === selectedTemplateId);

    const newMeeting: Meeting = {
      id: `meet_${Date.now()}`,
      title: title.trim(),
      persianDate: persianDate.trim(),
      timeRange: timeRange.trim(),
      location: location.trim(),
      status: 'DRAFT',
      statusLabel: 'پیش‌نویس',
      organizer: currentUser,
      participants: [currentUser, sampleParticipants[0], sampleParticipants[1]],
      agenda: chosenTemplate
        ? chosenTemplate.agendaDefaults.map((text, idx) => ({
            id: `ag_${idx + 1}`,
            order: idx + 1,
            text,
          }))
        : [
            { id: 'ag_1', order: 1, text: 'بررسی دستور جلسه' },
            { id: 'ag_2', order: 2, text: 'تصمیم‌گیری و تعیین مسئولیت‌ها' },
          ],
      discussion: chosenTemplate
        ? `این جلسه بر اساس قالب «${chosenTemplate.title}» ایجاد شده است.`
        : 'جلسه با حضور اعضا رسمیت یافت و موضوعات مطروحه مورد بحث قرار گرفت.',
      aiSuggestion: {
        summary: 'پیشنهاد اولیه هوش مصنوعی پس از ورود متن صورت‌جلسه تولید خواهد شد.',
        applied: false,
      },
      decisions: [],
      actionItems: [],
      comments: [],
      signatureCount: 0,
      totalSignaturesRequired: 3,
    };

    onCreateMeeting(newMeeting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              ایجاد صورت‌جلسه جدید
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              عنوان جلسه:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: جلسه بازنگری معماری فنی سامانه چهارم"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                تاریخ برگزاری:
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={persianDate}
                  onChange={(e) => setPersianDate(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                ساعت جلسه:
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              محل برگزاری / لینک جلسه آنلاین:
            </label>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <MapPin className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              قالب پیش‌فرض (اختیاری):
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            >
              <option value="">بدون قالب (سند خام)</option>
              {sampleTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
            >
              ایجاد و شروع نگارش
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
