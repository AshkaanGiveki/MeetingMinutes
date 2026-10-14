import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const toLatinDigits = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
const toPersianDigits = (value: string | number) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

const div = (a: number, b: number) => Math.floor(a / b);

const gregorianToJalali = (gy: number, gm: number, gd: number) => {
  const daysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + daysInMonth[gm - 1];
  let jy = -1595 + (33 * div(days, 12053));
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
};

const jalaliToGregorian = (jy: number, jm: number, jd: number) => {
  let year = jy + 1595;
  let days = -355668 + (365 * year) + div(year, 33) * 8 + div((year % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const monthDays = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]) {
    gd -= monthDays[gm];
    gm += 1;
  }
  return { gy, gm, gd };
};

const parseJalali = (value: string) => {
  const latin = toLatinDigits(value);
  const numeric = latin.match(/(13|14)\d{2}/)?.[0];
  const day = latin.match(/(?:^|\s)(\d{1,2})(?=\s|$)/)?.[1];
  const monthFromName = monthNames.findIndex((month) => value.includes(month));
  if (!numeric || !day || monthFromName < 0) return null;
  const parsed = { jy: Number(numeric), jm: monthFromName + 1, jd: Number(day) };
  if (parsed.jd < 1 || parsed.jd > (parsed.jm <= 6 ? 31 : parsed.jm <= 11 ? 30 : 30)) return null;
  return parsed;
};

const formatJalali = ({ jy, jm, jd }: { jy: number; jm: number; jd: number }) => `${toPersianDigits(jd)} ${monthNames[jm - 1]} ${toPersianDigits(jy)}`;

interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({ value, onChange }) => {
  const parsedValue = parseJalali(value) || gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const [isOpen, setIsOpen] = useState(false);
  const [selectionPanel, setSelectionPanel] = useState<'month' | 'year' | null>(null);
  const [view, setView] = useState({ jy: parsedValue.jy, jm: parsedValue.jm });
  const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const positionPicker = () => {
    const bounds = rootRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const popupWidth = Math.min(320, window.innerWidth - 32);
    const popupHeight = 520;
    const right = Math.min(
      Math.max(16, window.innerWidth - bounds.right),
      Math.max(16, window.innerWidth - popupWidth - 16),
    );
    const opensAbove = bounds.bottom + popupHeight > window.innerHeight && bounds.top > popupHeight;
    setPickerStyle({
      right,
      top: opensAbove
        ? Math.max(16, bounds.top - popupHeight - 12)
        : Math.min(Math.max(16, bounds.bottom + 12), Math.max(16, window.innerHeight - popupHeight - 16)),
      width: popupWidth,
      maxHeight: Math.max(240, window.innerHeight - 32),
      overflowY: 'auto',
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    const handlePickerOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === 'time-range') {
        setIsOpen(false);
        setSelectionPanel(null);
      }
    };
    document.addEventListener('metameet:picker-open', handlePickerOpen);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('metameet:picker-open', handlePickerOpen);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    positionPicker();
    window.addEventListener('resize', positionPicker);
    window.addEventListener('scroll', positionPicker, true);
    return () => {
      window.removeEventListener('resize', positionPicker);
      window.removeEventListener('scroll', positionPicker, true);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const first = jalaliToGregorian(view.jy, view.jm, 1);
    const firstDay = new Date(first.gy, first.gm - 1, first.gd).getDay();
    const rtlOffset = (firstDay + 1) % 7;
    const totalDays = view.jm <= 6 ? 31 : view.jm <= 11 ? 30 : 29;
    return Array.from({ length: rtlOffset + totalDays }, (_, index) => index < rtlOffset ? null : index - rtlOffset + 1);
  }, [view]);

  const shiftMonth = (amount: number) => {
    const next = view.jm + amount;
    setView(next < 1 ? { jy: view.jy - 1, jm: 12 } : next > 12 ? { jy: view.jy + 1, jm: 1 } : { jy: view.jy, jm: next });
  };

  const shiftYear = (amount: number) => {
    setView((current) => ({ ...current, jy: current.jy + amount }));
  };

  const selectDay = (jd: number) => {
    onChange(formatJalali({ jy: view.jy, jm: view.jm, jd }));
    setIsOpen(false);
  };

  const today = gregorianToJalali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  const togglePicker = () => {
    if (!isOpen) {
      document.dispatchEvent(new CustomEvent('metameet:picker-open', { detail: 'jalali-date' }));
      positionPicker();
    }
    setIsOpen((open) => !open);
    setSelectionPanel(null);
  };

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" dir="rtl">
      <button type="button" onClick={togglePicker} className="flex w-full items-center gap-2 text-right text-slate-800 dark:text-slate-100">
        <span className="min-w-0 flex-1 truncate font-sans text-xs">{value || 'انتخاب تاریخ'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.18 }} style={pickerStyle} className="fixed z-[60] rounded-3xl border border-slate-200/90 bg-white p-4 text-right shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => selectionPanel === 'year' ? shiftYear(1) : shiftMonth(1)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setSelectionPanel(selectionPanel === 'month' ? null : 'month')} className={`rounded-xl px-2.5 py-2 text-sm font-bold transition-colors ${selectionPanel === 'month' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800'}`}>{monthNames[view.jm - 1]}</button>
                <button type="button" onClick={() => setSelectionPanel(selectionPanel === 'year' ? null : 'year')} className={`rounded-xl px-2.5 py-2 font-sans text-xs font-bold transition-colors ${selectionPanel === 'year' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{toPersianDigits(view.jy)}</button>
              </div>
              <button type="button" onClick={() => selectionPanel === 'year' ? shiftYear(-1) : shiftMonth(-1)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {selectionPanel === 'month' && <motion.div key="months" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-3 grid grid-cols-3 gap-1.5">{monthNames.map((month, index) => <button type="button" key={month} onClick={() => { setView({ ...view, jm: index + 1 }); setSelectionPanel(null); }} className={`rounded-xl px-1 py-2 text-[11px] font-semibold ${view.jm === index + 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300'}`}>{month}</button>)}</motion.div>}
              {selectionPanel === 'year' && <motion.div key="years" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-3 grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto">{Array.from({ length: 12 }, (_, index) => view.jy - 5 + index).map((year) => <button type="button" key={year} onClick={() => { setView({ ...view, jy: year }); setSelectionPanel(null); }} className={`rounded-xl px-1 py-2 font-sans text-[11px] font-semibold ${view.jy === year ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300'}`}>{toPersianDigits(year)}</button>)}</motion.div>}
              {selectionPanel === null && <motion.div key="days" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">{weekDays.map((day) => <span key={day} className="py-1">{day}</span>)}</div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => day === null ? <span key={`empty-${index}`} className="h-9" /> : <button type="button" key={day} onClick={() => selectDay(day)} className={`relative flex h-9 items-center justify-center rounded-xl text-xs font-medium transition-colors ${parsedValue.jy === view.jy && parsedValue.jm === view.jm && parsedValue.jd === day ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300'} ${today.jy === view.jy && today.jm === view.jm && today.jd === day ? 'ring-1 ring-indigo-300 dark:ring-indigo-700' : ''}`}>{toPersianDigits(day)}{parsedValue.jy === view.jy && parsedValue.jm === view.jm && parsedValue.jd === day && <Check className="absolute bottom-0.5 left-0.5 h-2.5 w-2.5 opacity-70" />}</button>)}
                </div>
              </motion.div>}
            </AnimatePresence>
            <button type="button" onClick={() => { onChange(formatJalali(today)); setView({ jy: today.jy, jm: today.jm }); setIsOpen(false); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/50 dark:text-indigo-300"><CalendarDays className="h-3.5 w-3.5" />امروز</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
