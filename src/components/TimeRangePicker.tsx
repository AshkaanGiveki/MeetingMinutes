import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Minus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const toPersianDigits = (value: string | number) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
const toLatinDigits = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
const pad = (value: number) => String(value).padStart(2, '0');

const parseTime = (value: string, fallback: string) => {
  const match = toLatinDigits(value).match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) return fallback;
  return `${pad(Math.min(23, Number(match[1])))}:${pad(Math.min(59, Number(match[2])))}`;
};

const formatRange = (start: string, end: string) => `${toPersianDigits(start)} - ${toPersianDigits(end)}`;
const addMinutes = (time: string, minutes: number) => {
  const [hours, mins] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, (hours * 60) + mins + minutes);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

interface TimeRangePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange }) => {
  const [rawStart, rawEnd] = value.split('-').map((part) => part.trim());
  const start = parseTime(rawStart || '', '10:00');
  const end = parseTime(rawEnd || '', '11:30');
  const [isOpen, setIsOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(start);
  const [draftEnd, setDraftEnd] = useState(end);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    const handlePickerOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === 'jalali-date') setIsOpen(false);
    };
    document.addEventListener('metameet:picker-open', handlePickerOpen);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('metameet:picker-open', handlePickerOpen);
    };
  }, []);

  const openPicker = () => {
    setDraftStart(start);
    setDraftEnd(end);
    if (!isOpen) document.dispatchEvent(new CustomEvent('metameet:picker-open', { detail: 'time-range' }));
    setIsOpen((open) => !open);
  };

  const apply = () => {
    onChange(formatRange(draftStart, draftEnd));
    setIsOpen(false);
  };

  const setDuration = (duration: number) => {
    setDraftEnd(addMinutes(draftStart, duration));
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" dir="rtl">
      <button type="button" onClick={openPicker} className="flex w-full items-center gap-2 text-right text-slate-800 dark:text-slate-100">
        <span className="min-w-0 flex-1 truncate font-sans text-xs">{value || 'انتخاب زمان'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.18 }} className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[min(21rem,calc(100vw-2rem))] rounded-3xl border border-slate-200/90 bg-white p-4 text-right shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-800/70">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              <div className="flex flex-1 items-center gap-2">
                <TimeField label="شروع" value={draftStart} onChange={setDraftStart} />
                <Minus className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <TimeField label="پایان" value={draftEnd} onChange={setDraftEnd} />
              </div>
            </div>
            <p className="mb-2 text-[10px] font-semibold text-slate-400">مدت جلسه</p>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 90].map((duration) => <button type="button" key={duration} onClick={() => setDuration(duration)} className="rounded-xl border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300">{duration === 30 ? 'نیم ساعت' : duration === 60 ? 'یک ساعت' : 'یک‌ونیم ساعت'}</button>)}
            </div>
            <button type="button" onClick={apply} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"><Check className="h-3.5 w-3.5" />تأیید زمان</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TimeField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => {
  const [hours, minutes] = value.split(':').map(Number);
  const [isOpen, setIsOpen] = useState(false);
  const fieldId = useRef(`time-field-${Math.random().toString(36).slice(2)}`).current;
  useEffect(() => {
    const handlePickerOpen = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail?.startsWith('time-field:') && detail !== `time-field:${fieldId}`) setIsOpen(false);
    };
    document.addEventListener('metameet:picker-open', handlePickerOpen);
    return () => document.removeEventListener('metameet:picker-open', handlePickerOpen);
  }, [fieldId]);
  const update = (nextHours: number, nextMinutes: number) => onChange(`${pad(nextHours)}:${pad(nextMinutes)}`);
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[9px] font-semibold text-slate-400">{label}</span>
      <button type="button" dir="ltr" onClick={() => { if (!isOpen) document.dispatchEvent(new CustomEvent('metameet:picker-open', { detail: `time-field:${fieldId}` })); setIsOpen((open) => !open); }} className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-2 font-sans dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{toPersianDigits(pad(hours))}</span>
        <span className="px-0.5 text-sm font-bold text-indigo-500">:</span>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{toPersianDigits(pad(minutes))}</span>
      </button>
      <AnimatePresence>
        {isOpen && <motion.div dir="ltr" initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} transition={{ duration: 0.14 }} className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid w-40 grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
          <div className="min-w-0"><p className="mb-1 px-1 text-[9px] font-semibold text-slate-400">ساعت</p><div className="max-h-36 overflow-y-auto rounded-xl bg-slate-50 p-1 dark:bg-slate-800/70">{Array.from({ length: 24 }, (_, hour) => <button type="button" key={hour} onClick={() => update(hour, minutes)} className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold ${hours === hour ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300'}`}>{toPersianDigits(pad(hour))}</button>)}</div></div>
          <div className="min-w-0"><p className="mb-1 px-1 text-[9px] font-semibold text-slate-400">دقیقه</p><div className="max-h-36 overflow-y-auto rounded-xl bg-slate-50 p-1 dark:bg-slate-800/70">{Array.from({ length: 12 }, (_, index) => index * 5).map((minute) => <button type="button" key={minute} onClick={() => { update(hours, minute); setIsOpen(false); }} className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold ${minutes === minute ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300'}`}>{toPersianDigits(pad(minute))}</button>)}</div></div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
};
