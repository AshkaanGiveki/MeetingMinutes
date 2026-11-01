import React, { useEffect, useState } from 'react';
import { AnimatedModal } from './AnimatedModal';
import { X, Calendar, Clock, MapPin, Plus, Sparkles } from 'lucide-react';
import { Meeting, Participant, Template } from '../types';
import { JalaliDatePicker } from './JalaliDatePicker';
import { TimeRangePicker } from './TimeRangePicker';
import { CustomSelect } from './CustomSelect';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMeeting: (newMeeting: Meeting) => void;
  organizer?: Participant;
  organizationId?: string;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  onCreateMeeting,
  organizer,
  organizationId,
}) => {
  const [title, setTitle] = useState('');
  const [organizationMinuteId, setOrganizationMinuteId] = useState('');
  const [persianDate, setPersianDate] = useState('۱۵ مهر ۱۴۰۴');
  const [timeRange, setTimeRange] = useState('۱۰:۰۰ - ۱۱:۳۰');
  const [location, setLocation] = useState('اتاق جلسات اصلی');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [projectId, setProjectId] = useState('');
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsTemplatesLoading(true);
    fetch('/api/templates')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load templates')))
      .then((data) => setTemplates(Array.isArray(data?.templates) ? data.templates : []))
      .catch(() => setTemplates([]))
      .finally(() => setIsTemplatesLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !organizationId) return;
    void fetch('/api/projects').then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      const items = (data.projects || []).filter((item: { project: { organizationId: string } }) => item.project.organizationId === organizationId).map((item: { project: { id: string; name: string } }) => item.project);
      setProjects(items);
      setProjectId((current) => items.some((item: { id: string }) => item.id === current) ? current : items.find((item: { id: string }) => item.id === localStorage.getItem('accord:selected-project'))?.id || items[0]?.id || '');
    }).catch(() => { setProjects([]); setProjectId(''); });
  }, [isOpen, organizationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    const chosenTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!organizer) return;

    const newMeeting: Meeting = {
      id: `meet_${Date.now()}`,
      projectId,
      organizationMinuteId: organizationMinuteId ? Number(organizationMinuteId) : undefined,
      title: title.trim(),
      contentTemplateId: chosenTemplate?.id,
      persianDate: persianDate.trim(),
      timeRange: timeRange.trim(),
      location: location.trim(),
      status: 'DRAFT',
      statusLabel: 'پیش‌نویس',
      organizer,
      participants: [organizer],
      agenda: chosenTemplate
        ? chosenTemplate.agendaDefaults.map((text, idx) => ({
            id: `ag_${idx + 1}`,
            order: idx + 1,
            text,
          }))
        : [],
      discussion: '',
      aiSuggestion: {
        summary: '',
        applied: false,
      },
      decisions: [],
      actionItems: [],
      comments: [],
      signatureCount: 0,
      totalSignaturesRequired: 1,
    };

    onCreateMeeting(newMeeting);
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} contentClassName="w-full max-w-lg">
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
          <label className="flex flex-col gap-1 font-semibold text-slate-700 dark:text-slate-300">پروژه<select required value={projectId} onChange={(event) => { setProjectId(event.target.value); localStorage.setItem('accord:selected-project', event.target.value); }} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="">انتخاب پروژه</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
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

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">شماره صورت‌جلسه (اختیاری):</label>
            <input
              type="number"
              min="1"
              step="1"
              value={organizationMinuteId}
              onChange={(e) => setOrganizationMinuteId(e.target.value)}
              placeholder="خودکار از آخرین شماره ادامه می‌یابد"
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
            <p className="text-[10px] text-slate-400">برای ثبت صورت‌جلسه‌های قدیمی می‌توانید عددی مانند ۱۳۸۶ وارد کنید.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                تاریخ برگزاری:
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <JalaliDatePicker value={persianDate} onChange={setPersianDate} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                ساعت جلسه:
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <TimeRangePicker value={timeRange} onChange={setTimeRange} />
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
              قالب محتوایی (اختیاری):
            </label>
            <p className="text-[10px] leading-5 text-slate-400">قالب محتوایی: متن‌های اولیه و بندهای دستور جلسه را برای شروع سریع وارد می‌کند؛ ظاهر PDF بعداً جداگانه انتخاب می‌شود.</p>
            <CustomSelect
              value={selectedTemplateId}
              disabled={isTemplatesLoading}
              onChange={setSelectedTemplateId}
              className="w-full"
              options={[
                { value: '', label: 'بدون قالب (سند خام)' },
                ...templates.map((t) => ({ value: t.id, label: `${t.title} (${t.category})` })),
              ]}
            />
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
    </AnimatedModal>
  );
};
