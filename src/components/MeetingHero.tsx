import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  ListOrdered,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListFilter,
  Link as LinkIcon,
  Table as TableIcon,
  Paperclip,
  Smile,
  Send,
  Plus,
  Check,
  ChevronDown,
  Printer,
  CheckCircle2
} from 'lucide-react';
import { Meeting, AgendaItem, ActionItem } from '../types';

interface MeetingHeroProps {
  meeting: Meeting;
  onUpdateMeeting: (updated: Partial<Meeting>) => void;
  onBackToList: () => void;
  onTriggerAI: () => void;
  isAiLoading: boolean;
  onPrintPdf: () => void;
}

export const MeetingHero: React.FC<MeetingHeroProps> = ({
  meeting,
  onUpdateMeeting,
  onBackToList,
  onTriggerAI,
  isAiLoading,
  onPrintPdf,
}) => {
  const [quickNote, setQuickNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(meeting.title);
  const [activeFormat, setActiveFormat] = useState({ bold: false, italic: false, underline: false });

  // Handle autosave simulation on change
  const triggerAutosave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
    }, 600);
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onUpdateMeeting({ title: titleInput.trim() });
      triggerAutosave();
    }
  };

  const handleApplyAiSuggestion = () => {
    onUpdateMeeting({
      discussion: `${meeting.discussion}\n\n${meeting.aiSuggestion.summary}`,
      aiSuggestion: {
        ...meeting.aiSuggestion,
        applied: true,
      },
    });
    triggerAutosave();
  };

  const toggleActionItem = (itemId: string) => {
    const updated = meeting.actionItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateMeeting({ actionItems: updated });
    triggerAutosave();
  };

  const handleAddAgendaItem = () => {
    const newText = prompt('عنوان بند جدید دستور جلسه را وارد کنید:');
    if (!newText?.trim()) return;

    const newItem: AgendaItem = {
      id: `ag_${Date.now()}`,
      order: meeting.agenda.length + 1,
      text: newText.trim(),
    };

    onUpdateMeeting({ agenda: [...meeting.agenda, newItem] });
    triggerAutosave();
  };

  const handleAddDecision = () => {
    const newText = prompt('متن مصوبه یا تصمیم جدید را وارد کنید:');
    if (!newText?.trim()) return;

    onUpdateMeeting({
      decisions: [
        ...meeting.decisions,
        { id: `dec_${Date.now()}`, text: newText.trim(), approved: true },
      ],
    });
    triggerAutosave();
  };

  const handleAddActionItem = () => {
    const task = prompt('عنوان اقدام / وظیفه:');
    if (!task?.trim()) return;
    const deadline = prompt('مهلت انجام (مثلاً ۱۵ آبان ۱۴۰۴):') || '۱۰ روز آینده';

    const newItem: ActionItem = {
      id: `act_${Date.now()}`,
      task: task.trim(),
      assignee: meeting.participants[0],
      dueDate: deadline,
      completed: false,
    };

    onUpdateMeeting({ actionItems: [...meeting.actionItems, newItem] });
    triggerAutosave();
  };

  const handleSendQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    onUpdateMeeting({
      discussion: `${meeting.discussion}\n\n• یادداشت الحاقی: ${quickNote.trim()}`,
    });
    setQuickNote('');
    triggerAutosave();
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto flex flex-col gap-6 pb-12 select-text">
      {/* Central White Document Canvas */}
      <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-8 flex flex-col gap-6">
        
        {/* Document Top Bar */}
        <div className="flex items-center justify-between no-print">
          {/* Back button */}
          <button
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>جلسات</span>
          </button>

          {/* Badges on left side of header */}
          <div className="flex items-center gap-2">
            {/* Print button */}
            <button
              onClick={onPrintPdf}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="چاپ یا خروجی PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Status pill matching screenshot */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{meeting.statusLabel}</span>
            </div>

            {/* Date pill matching screenshot */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-medium shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-mono">۱۴۰۴/۰۷/۰۴</span>
            </div>
          </div>
        </div>

        {/* Meeting Title */}
        <div className="flex flex-col gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-indigo-400 focus:outline-none"
              />
              <button
                onClick={handleTitleSubmit}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
              >
                تأیید
              </button>
            </div>
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-right"
              title="برای ویرایش کلیک کنید"
            >
              {meeting.title}
            </h1>
          )}

          {/* Metadata Row matching screenshot */}
          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{meeting.persianDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{meeting.timeRange}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{meeting.location}</span>
            </div>
          </div>
        </div>

        {/* Rich Editor Toolbar matching screenshot */}
        <div className="no-print flex items-center justify-between py-2 px-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1">
            <button
              onClick={() => alert('بازگشت به حالت قبلی')}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('انجام مجدد')}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Format dropdown */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer">
              <span>متن عادی</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => setActiveFormat(p => ({ ...p, bold: !p.bold }))}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                activeFormat.bold ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveFormat(p => ({ ...p, italic: !p.italic }))}
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                activeFormat.italic ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveFormat(p => ({ ...p, underline: !p.underline }))}
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                activeFormat.underline ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="لیست بالت‌دار"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="لیست شماره‌دار"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="لیست وظایف"
            >
              <ListFilter className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="درج پیوند"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-500 cursor-pointer"
              title="درج جدول"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Autosave status */}
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 select-none font-mono">
            {saveStatus === 'saving' ? (
              <span className="text-amber-500 animate-pulse">در حال ذخیره...</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>ذخیره شد</span>
                <Check className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Section 1: دستور جلسه (Agenda) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ListOrdered className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                دستور جلسه
              </h2>
            </div>
            <button
              onClick={handleAddAgendaItem}
              className="no-print p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن بند</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 pr-2">
            {meeting.agenda.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 group"
              >
                <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[11px] flex items-center justify-center font-mono">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: بحث و گفتگو (Discussion) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              بحث و گفتگو
            </h2>
          </div>

          <div className="pr-2">
            <textarea
              value={meeting.discussion}
              onChange={(e) => {
                onUpdateMeeting({ discussion: e.target.value });
                triggerAutosave();
              }}
              rows={4}
              className="w-full text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-transparent resize-y border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-700 rounded-xl p-2 transition-all"
            />
          </div>
        </section>

        {/* Section 3: پیشنهاد هوش مصنوعی (AI Suggestion Box matching screenshot) */}
        <section className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-pink-50/40 dark:from-purple-950/20 dark:via-indigo-950/30 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>پیشنهاد هوش مصنوعی</span>
            </div>

            <button
              onClick={onTriggerAI}
              disabled={isAiLoading}
              className="no-print text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              <span>{isAiLoading ? 'در حال تحلیل...' : 'تولید مجدد با جمینای'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-2">
            {meeting.aiSuggestion.summary}
          </p>

          <div className="no-print flex items-center justify-end pt-1">
            <button
              onClick={handleApplyAiSuggestion}
              disabled={meeting.aiSuggestion.applied}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                meeting.aiSuggestion.applied
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{meeting.aiSuggestion.applied ? 'پیشنهاد اعمال شد' : 'اعمال پیشنهاد'}</span>
            </button>
          </div>
        </section>

        {/* Section 4: تصمیمات (Decisions) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                تصمیمات
              </h2>
            </div>
            <button
              onClick={handleAddDecision}
              className="no-print p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت تصمیم</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 pr-2">
            {meeting.decisions.map((dec) => (
              <div
                key={dec.id}
                className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">{dec.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: وظایف و اقدامات (Action Items table matching screenshot) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                وظایف و اقدامات
              </h2>
            </div>
            <button
              onClick={handleAddActionItem}
              className="no-print p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن اقدام</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center">وضعیت</th>
                  <th className="py-2.5 px-3">مسئول</th>
                  <th className="py-2.5 px-3">وظیفه</th>
                  <th className="py-2.5 px-3">مهلت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {meeting.actionItems.map((act) => (
                  <tr
                    key={act.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleActionItem(act.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          act.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                        }`}
                      >
                        {act.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <img
                          src={act.assignee.avatar}
                          alt={act.assignee.name}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span>{act.assignee.name}</span>
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-slate-700 dark:text-slate-300 ${
                        act.completed ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {act.task}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {act.dueDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Note Input Bar at bottom of document matching screenshot */}
        <div className="no-print mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <form
            onSubmit={handleSendQuickNote}
            className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60"
          >
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="یادداشت جدید..."
              className="flex-1 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 bg-transparent focus:outline-none"
            />

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                className="p-1 rounded-lg hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                title="پیوست فایل"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 rounded-lg hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                title="ایموجی"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!quickNote.trim()}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
