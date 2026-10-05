import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Printer,
  Edit3,
  Check,
  Plus,
  Trash2,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Table as TableIcon,
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Paperclip,
  Eye,
  FileText,
  User,
  ArrowRight,
  Download,
  Upload,
  ChevronUp,
  ChevronDown,
  Quote,
  Code,
  Eraser,
  X
} from 'lucide-react';
import { Meeting, AgendaItem, DecisionItem, ActionItem, Participant } from '../types';
import { motion } from 'motion/react';
import { staggerContainerVariants, staggerItemVariants } from './stagger';

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
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(meeting.title);

  // Editor states
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');
  const [discussionText, setDiscussionText] = useState(meeting.discussion);
  const [history, setHistory] = useState<string[]>([meeting.discussion]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Meeting ID tracker to avoid clobbering keystrokes during active typing
  const currentMeetingIdRef = useRef(meeting.id);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Agenda inline add / edit state
  const [isAddingAgenda, setIsAddingAgenda] = useState(false);
  const [newAgendaText, setNewAgendaText] = useState('');
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editingAgendaText, setEditingAgendaText] = useState('');

  // Decisions inline add / edit state
  const [isAddingDecision, setIsAddingDecision] = useState(false);
  const [newDecisionText, setNewDecisionText] = useState('');
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [editingDecisionText, setEditingDecisionText] = useState('');

  // Action Items inline add / edit state
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState(meeting.participants[0]?.id || 'usr_arash');
  const [newTaskDeadline, setNewTaskDeadline] = useState('۱۵ آبان ۱۴۰۴');

  // Link Insertion Modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Only reset discussion and title when switching to a DIFFERENT meeting!
  useEffect(() => {
    if (meeting.id !== currentMeetingIdRef.current) {
      currentMeetingIdRef.current = meeting.id;
      setDiscussionText(meeting.discussion);
      setHistory([meeting.discussion]);
      setHistoryIndex(0);
      setTitleInput(meeting.title);
      setEditingAgendaId(null);
      setEditingDecisionId(null);
    }
  }, [meeting.id]);

  // Debounced autosave that only sends updates outwards without touching local state
  const debouncedSaveDiscussion = useCallback(
    (textToSave: string) => {
      setSaveStatus('saving');
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        onUpdateMeeting({ discussion: textToSave });
        setSaveStatus('saved');
      }, 600);
    },
    [onUpdateMeeting]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  const handleDiscussionChange = (val: string) => {
    setDiscussionText(val);
    debouncedSaveDiscussion(val);

    // Push to undo history after brief delay
    const newHist = history.slice(0, historyIndex + 1);
    if (newHist[newHist.length - 1] !== val) {
      newHist.push(val);
      if (newHist.length > 50) newHist.shift();
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const val = history[newIdx];
      setDiscussionText(val);
      debouncedSaveDiscussion(val);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const val = history[newIdx];
      setDiscussionText(val);
      debouncedSaveDiscussion(val);
    }
  };

  // Robust Text Formatting Engine
  const executeFormat = (type: 'bold' | 'italic' | 'underline' | 'strike' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'task' | 'quote' | 'code' | 'clear') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = discussionText.substring(start, end);

    let replacement = '';
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    switch (type) {
      case 'bold':
        if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
          replacement = selected.slice(2, -2);
          selectionOffsetStart = 0;
          selectionOffsetEnd = replacement.length;
        } else {
          replacement = selected ? `**${selected}**` : '**متن پررنگ**';
          selectionOffsetStart = 2;
          selectionOffsetEnd = replacement.length - 2;
        }
        break;

      case 'italic':
        if (selected.startsWith('*') && selected.endsWith('*') && selected.length >= 2) {
          replacement = selected.slice(1, -1);
          selectionOffsetStart = 0;
          selectionOffsetEnd = replacement.length;
        } else {
          replacement = selected ? `*${selected}*` : '*متن مورب*';
          selectionOffsetStart = 1;
          selectionOffsetEnd = replacement.length - 1;
        }
        break;

      case 'underline':
        if (selected.startsWith('<u>') && selected.endsWith('</u>')) {
          replacement = selected.slice(3, -4);
          selectionOffsetStart = 0;
          selectionOffsetEnd = replacement.length;
        } else {
          replacement = selected ? `<u>${selected}</u>` : '<u>متن زیرخط‌دار</u>';
          selectionOffsetStart = 3;
          selectionOffsetEnd = replacement.length - 4;
        }
        break;

      case 'strike':
        replacement = selected ? `~~${selected}~~` : '~~متن خط‌خورده~~';
        selectionOffsetStart = 2;
        selectionOffsetEnd = replacement.length - 2;
        break;

      case 'h1':
        replacement = `\n# ${selected || 'عنوان اصلی'}\n`;
        selectionOffsetStart = 3;
        selectionOffsetEnd = replacement.length - 1;
        break;

      case 'h2':
        replacement = `\n## ${selected || 'عنوان بخش'}\n`;
        selectionOffsetStart = 4;
        selectionOffsetEnd = replacement.length - 1;
        break;

      case 'h3':
        replacement = `\n### ${selected || 'زیرعنوان'}\n`;
        selectionOffsetStart = 5;
        selectionOffsetEnd = replacement.length - 1;
        break;

      case 'bullet':
        if (selected) {
          replacement = selected
            .split('\n')
            .map((line) => (line.startsWith('• ') ? line : `• ${line}`))
            .join('\n');
        } else {
          replacement = '\n• بند اول\n• بند دوم\n';
        }
        selectionOffsetStart = 0;
        selectionOffsetEnd = replacement.length;
        break;

      case 'number':
        if (selected) {
          replacement = selected
            .split('\n')
            .map((line, idx) => `${idx + 1}. ${line.replace(/^[0-9]+[.)]\s*/, '')}`)
            .join('\n');
        } else {
          replacement = '\n1. مورد اول\n2. مورد دوم\n';
        }
        selectionOffsetStart = 0;
        selectionOffsetEnd = replacement.length;
        break;

      case 'task':
        replacement = selected ? `\n- [ ] ${selected}\n` : '\n- [ ] وظیفه جدید پیگیری شود\n';
        selectionOffsetStart = 7;
        selectionOffsetEnd = replacement.length - 1;
        break;

      case 'quote':
        replacement = selected ? `\n> ${selected}\n` : '\n> نقل قول و مصوبه کلیدی جلسه\n';
        selectionOffsetStart = 3;
        selectionOffsetEnd = replacement.length - 1;
        break;

      case 'code':
        replacement = `\n\`\`\`\n${selected || '// کدهای فنی یا دستورات'}\n\`\`\`\n`;
        selectionOffsetStart = 5;
        selectionOffsetEnd = replacement.length - 5;
        break;

      case 'clear':
        replacement = selected
          .replace(/[*_~`#]/g, '')
          .replace(/<u>|<\/u>/g, '')
          .replace(/^[-•*]\s*/gm, '');
        selectionOffsetStart = 0;
        selectionOffsetEnd = replacement.length;
        break;
    }

    const nextText = discussionText.substring(0, start) + replacement + discussionText.substring(end);
    handleDiscussionChange(nextText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + selectionOffsetStart, start + selectionOffsetEnd);
    }, 30);
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const label = linkText.trim() || linkUrl.trim();
    const markdownLink = `[${label}](${linkUrl.trim()})`;

    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextText = discussionText.substring(0, start) + markdownLink + discussionText.substring(end);
    handleDiscussionChange(nextText);

    setIsLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');
  };

  const handleInsertTable = () => {
    const tableTemplate =
      '\n\n| رديف | موضوع مصوب | مسئول پيگيری | وضعیت |\n| :--- | :--- | :--- | :--- |\n| ۱ | بررسی نیازمندی‌های فاز اول | تیم محصول | در حال انجام |\n| ۲ | بهینه‌سازی سرورها و API | توسعه‌دهنده ارشد | تصویب شد |\n\n';
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const nextText = discussionText.substring(0, start) + tableTemplate + discussionText.substring(end);
    handleDiscussionChange(nextText);
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== meeting.title) {
      onUpdateMeeting({ title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  // Agenda handlers (Add, Inline Edit, Delete, Reorder)
  const handleSaveNewAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaText.trim()) return;
    const newItem: AgendaItem = {
      id: `ag_${Date.now()}`,
      order: meeting.agenda.length + 1,
      text: newAgendaText.trim(),
    };
    onUpdateMeeting({ agenda: [...meeting.agenda, newItem] });
    setNewAgendaText('');
    setIsAddingAgenda(false);
  };

  const handleStartEditAgenda = (item: AgendaItem) => {
    setEditingAgendaId(item.id);
    setEditingAgendaText(item.text);
  };

  const handleSaveEditAgenda = (id: string) => {
    if (!editingAgendaText.trim()) return;
    const updated = meeting.agenda.map((a) =>
      a.id === id ? { ...a, text: editingAgendaText.trim() } : a
    );
    onUpdateMeeting({ agenda: updated });
    setEditingAgendaId(null);
  };

  const handleDeleteAgenda = (id: string) => {
    const filtered = meeting.agenda.filter((a) => a.id !== id);
    onUpdateMeeting({ agenda: filtered });
  };

  const handleMoveAgenda = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= meeting.agenda.length) return;
    const newItems = [...meeting.agenda];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    onUpdateMeeting({ agenda: newItems });
  };

  // Decision handlers
  const handleSaveNewDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecisionText.trim()) return;
    const newDec: DecisionItem = {
      id: `dec_${Date.now()}`,
      text: newDecisionText.trim(),
      approved: true,
    };
    onUpdateMeeting({ decisions: [...meeting.decisions, newDec] });
    setNewDecisionText('');
    setIsAddingDecision(false);
  };

  const handleStartEditDecision = (dec: DecisionItem) => {
    setEditingDecisionId(dec.id);
    setEditingDecisionText(dec.text);
  };

  const handleSaveEditDecision = (id: string) => {
    if (!editingDecisionText.trim()) return;
    const updated = meeting.decisions.map((d) =>
      d.id === id ? { ...d, text: editingDecisionText.trim() } : d
    );
    onUpdateMeeting({ decisions: updated });
    setEditingDecisionId(null);
  };

  const handleToggleDecision = (id: string) => {
    const updated = meeting.decisions.map((d) =>
      d.id === id ? { ...d, approved: !d.approved } : d
    );
    onUpdateMeeting({ decisions: updated });
  };

  const handleDeleteDecision = (id: string) => {
    onUpdateMeeting({ decisions: meeting.decisions.filter((d) => d.id !== id) });
  };

  // Action Items handlers
  const handleSaveNewAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const assignee =
      meeting.participants.find((p) => p.id === newTaskAssigneeId) ||
      meeting.participants[0] ||
      meeting.organizer;

    const newAction: ActionItem = {
      id: `act_${Date.now()}`,
      task: newTaskTitle.trim(),
      assignee,
      dueDate: newTaskDeadline.trim() || '۱۰ روز آینده',
      completed: false,
    };
    onUpdateMeeting({ actionItems: [...meeting.actionItems, newAction] });
    setNewTaskTitle('');
    setIsAddingAction(false);
  };

  const handleToggleAction = (id: string) => {
    const updated = meeting.actionItems.map((a) =>
      a.id === id ? { ...a, completed: !a.completed } : a
    );
    onUpdateMeeting({ actionItems: updated });
  };

  const handleDeleteAction = (id: string) => {
    onUpdateMeeting({ actionItems: meeting.actionItems.filter((a) => a.id !== id) });
  };

  // Render markdown-like preview
  const renderPreview = (text: string) => {
    const paragraphs = text.split('\n\n');
    return (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        {paragraphs.map((p, idx) => {
          if (p.startsWith('# ')) {
            return (
              <h1 key={idx} className="font-extrabold text-lg text-slate-900 dark:text-white mt-3 pb-1 border-b border-slate-200 dark:border-slate-800">
                {p.replace('# ', '')}
              </h1>
            );
          }
          if (p.startsWith('## ')) {
            return (
              <h2 key={idx} className="font-bold text-base text-indigo-600 dark:text-indigo-400 mt-2">
                {p.replace('## ', '')}
              </h2>
            );
          }
          if (p.startsWith('### ')) {
            return (
              <h3 key={idx} className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-1">
                {p.replace('### ', '')}
              </h3>
            );
          }
          if (p.startsWith('> ')) {
            return (
              <blockquote key={idx} className="p-3 my-1 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border-r-4 border-indigo-500 text-slate-700 dark:text-slate-300 italic">
                {p.replace('> ', '')}
              </blockquote>
            );
          }
          if (p.startsWith('• ') || p.startsWith('- ')) {
            const items = p.split('\n');
            return (
              <ul key={idx} className="list-disc list-inside space-y-1.5 pr-2">
                {items.map((it, i) => (
                  <li key={i}>{it.replace(/^[-•*]\s*/, '')}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx} className="leading-relaxed">{p}</p>;
        })}
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-4xl mx-auto flex flex-col gap-6 pb-12 select-text">
      {/* Central White / Dark Document Canvas */}
      <div className="relative rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-8 flex flex-col gap-6 transition-colors duration-200">
        
        {/* Document Top Bar */}
        <div className="flex items-center justify-between no-print pb-3 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer group"
          >
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>بازگشت به فهرست جلسات</span>
          </button>

          {/* Badges on left */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrintPdf}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="چاپ یا خروجی PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{meeting.statusLabel}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 dark:bg-indigo-700 text-white text-xs font-medium shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-mono">{meeting.persianDate}</span>
            </div>
          </div>
        </div>

        {/* Meeting Title Header */}
        <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-indigo-400 focus:outline-none"
              />
              <button
                onClick={handleTitleSubmit}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold cursor-pointer"
              >
                تأیید
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-black text-slate-900 dark:text-white tracking-tight cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-right"
                title="کلیک برای ویرایش عنوان جلسه"
              >
                {meeting.title}
              </h1>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Metadata Row */}
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

        {/* Section 1: دستور جلسه (Agenda) with Working Inline Editing & Reordering */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                دستور جلسه (Agenda)
              </h2>
            </div>

            <button
              onClick={() => setIsAddingAgenda(true)}
              className="no-print py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>افزودن بند جدید</span>
            </button>
          </div>

          {/* Inline Add Agenda Form */}
          {isAddingAgenda && (
            <form onSubmit={handleSaveNewAgenda} className="flex items-center gap-2 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs">
              <input
                type="text"
                autoFocus
                required
                value={newAgendaText}
                onChange={(e) => setNewAgendaText(e.target.value)}
                placeholder="عنوان بند جدید دستور جلسه را وارد کنید..."
                className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="py-2 px-3.5 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer"
              >
                ثبت
              </button>
              <button
                type="button"
                onClick={() => setIsAddingAgenda(false)}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
            </form>
          )}

          {/* Agenda items list with In-Place Edit */}
          <motion.div className="flex flex-col gap-2" initial="hidden" animate="show" variants={staggerContainerVariants}>
            {meeting.agenda.map((item, idx) => (
              <motion.div
                key={item.id}
                variants={staggerItemVariants}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group text-xs text-slate-700 dark:text-slate-300"
              >
                {editingAgendaId === item.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editingAgendaText}
                      onChange={(e) => setEditingAgendaText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditAgenda(item.id)}
                      className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-600 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveEditAgenda(item.id)}
                      className="p-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                      title="ذخیره"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingAgendaId(null)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
                      title="انصراف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span
                        onClick={() => handleStartEditAgenda(item)}
                        className="leading-relaxed font-medium cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="کلیک برای ویرایش متن بند"
                      >
                        {item.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMoveAgenda(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="انتقال به بالا"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveAgenda(idx, 'down')}
                        disabled={idx === meeting.agenda.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                        title="انتقال به پایین"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleStartEditAgenda(item)}
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="ویرایش بند"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgenda(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="حذف بند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Section 2: مشروح مذاکرات (Functional Rich Text Editor) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                مشروح مذاکرات و شرح جلسه
              </h2>
            </div>

            {/* View Mode Toggle: Edit vs Preview */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEditorMode('edit')}
                className={`py-1 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایشگر متن</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('preview')}
                className={`py-1 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش سند</span>
              </button>
            </div>
          </div>

          {/* Full Working Formatting Toolbar */}
          {editorMode === 'edit' && (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs flex-wrap gap-1">
              <div className="flex items-center gap-1">
                {/* Undo / Redo */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Headings */}
                <button
                  type="button"
                  onClick={() => executeFormat('h1')}
                  className="py-1 px-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                  title="تیتر بزرگ (H1)"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('h2')}
                  className="py-1 px-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                  title="تیتر بخش (H2)"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('h3')}
                  className="py-1 px-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                  title="زیرتیتر (H3)"
                >
                  H3
                </button>

                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Text Formatting */}
                <button
                  type="button"
                  onClick={() => executeFormat('bold')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                  title="پررنگ (Bold)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('italic')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  title="مورب (Italic)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('underline')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  title="خط زیرین (Underline)"
                >
                  <UnderlineIcon className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Lists & Quotes */}
                <button
                  type="button"
                  onClick={() => executeFormat('bullet')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="لیست بالت‌دار"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('number')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="لیست شماره‌دار"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('task')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="چک‌لیست وظایف"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('quote')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="نقل‌قول"
                >
                  <Quote className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                {/* Insert Link & Table */}
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="افزودن لینک"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  title="درج جدول ساختاریافته"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => executeFormat('clear')}
                  className="p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title="حذف فرمت و بازنشانی"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              {/* Autosave status indicator */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 select-none font-mono">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-500 animate-pulse">در حال ذخیره...</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>ذخیره در سرور</span>
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Editor Body */}
          {editorMode === 'edit' ? (
            <textarea
              ref={textareaRef}
              rows={8}
              value={discussionText}
              onChange={(e) => handleDiscussionChange(e.target.value)}
              placeholder="مشروح مذاکرات، نظرات، تصمیمات و بندهای مطرح شده جلسه را اینجا بنویسید..."
              className="w-full text-xs text-slate-800 dark:text-slate-100 leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:outline-none focus:border-indigo-500 font-sans resize-y"
            />
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[140px]">
              {renderPreview(discussionText)}
            </div>
          )}
        </section>

        {/* Section 3: پیشنهاد هوش مصنوعی (AI Suggestion Box) */}
        <section className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-pink-50/40 dark:from-purple-950/20 dark:via-indigo-950/30 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>تحلیل هوشمند جلسه با Gemini</span>
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
              onClick={() => {
                const combined = `${discussionText}\n\n### خلاصه هوش مصنوعی\n${meeting.aiSuggestion.summary}`;
                handleDiscussionChange(combined);
                onUpdateMeeting({
                  aiSuggestion: { ...meeting.aiSuggestion, applied: true },
                });
              }}
              disabled={meeting.aiSuggestion.applied}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                meeting.aiSuggestion.applied
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{meeting.aiSuggestion.applied ? 'به متن اضافه شد' : 'افزودن به متن صورت‌جلسه'}</span>
            </button>
          </div>
        </section>

        {/* Section 4: تصمیمات و مصوبات (Decisions) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                تصمیمات و مصوبات جلسه
              </h2>
            </div>
            <button
              onClick={() => setIsAddingDecision(true)}
              className="no-print py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت مصوبه جدید</span>
            </button>
          </div>

          {/* Inline Add Decision Form */}
          {isAddingDecision && (
            <form onSubmit={handleSaveNewDecision} className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
              <input
                type="text"
                autoFocus
                required
                value={newDecisionText}
                onChange={(e) => setNewDecisionText(e.target.value)}
                placeholder="متن تصمیم مصوب را وارد نمایید..."
                className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="py-2 px-3.5 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
              >
                ثبت مصوبه
              </button>
              <button
                type="button"
                onClick={() => setIsAddingDecision(false)}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                انصراف
              </button>
            </form>
          )}

          <motion.div className="flex flex-col gap-2" initial="hidden" animate="show" variants={staggerContainerVariants}>
            {meeting.decisions.map((dec) => (
              <motion.div
                key={dec.id}
                variants={staggerItemVariants}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 group transition-all"
              >
                {editingDecisionId === dec.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editingDecisionText}
                      onChange={(e) => setEditingDecisionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditDecision(dec.id)}
                      className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveEditDecision(dec.id)}
                      className="p-2 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingDecisionId(null)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => handleToggleDecision(dec.id)}
                      className="flex items-center gap-2.5 cursor-pointer select-none"
                    >
                      {dec.approved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          dec.approved
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400 line-through'
                        }`}
                      >
                        {dec.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEditDecision(dec)}
                        className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        title="ویرایش مصوبه"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDecision(dec.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="حذف تصمیم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Section 5: اقدامات و وظایف (Action Items Table) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                اقدامات و مسئولیت‌ها (Action Items)
              </h2>
            </div>
            <button
              onClick={() => setIsAddingAction(true)}
              className="no-print py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>اقدام جدید</span>
            </button>
          </div>

          {/* Inline Add Action Form */}
          {isAddingAction && (
            <form onSubmit={handleSaveNewAction} className="flex flex-col gap-2 p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="عنوان اقدام / وظیفه..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="sm:col-span-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="مهلت (مثال: ۲۰ مهر ۱۴۰۴)"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">مسئول:</span>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                  >
                    {meeting.participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAction(false)}
                    className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 rounded-xl bg-sky-600 text-white font-bold cursor-pointer"
                  >
                    ثبت اقدام
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Table of Actions */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-4 w-10"></th>
                  <th className="py-2.5 px-4">شرح وظیفه</th>
                  <th className="py-2.5 px-4">مسئول پیگیری</th>
                  <th className="py-2.5 px-4">مهلت انجام</th>
                  <th className="py-2.5 px-4 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <motion.tbody className="divide-y divide-slate-100 dark:divide-slate-800/80" initial="hidden" animate="show" variants={staggerContainerVariants}>
                {meeting.actionItems.map((act) => (
                  <motion.tr
                    key={act.id}
                    variants={staggerItemVariants}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                      act.completed ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <input
                        type="checkbox"
                        checked={act.completed}
                        onChange={() => handleToggleAction(act.id)}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <span className={act.completed ? 'line-through text-slate-400' : ''}>
                        {act.task}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            act.assignee.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={act.assignee.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-slate-600 dark:text-slate-300">{act.assignee.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                      {act.dueDate}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteAction(act.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="حذف وظیفه"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </section>

        {/* Section 6: پیوست‌ها (Attachments) */}
        <section className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <Paperclip className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                پیوست‌ها و اسناد پشتیبان
              </h2>
            </div>

            <label className="no-print py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>پیوست فایل جدید</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const note = `\n\n[پیوست سند]: ${file.name} (${Math.round(file.size / 1024)} KB)`;
                    handleDiscussionChange(discussionText + note);
                  }
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span className="font-mono text-[11px]">مستند_فنی_سامانه.pdf</span>
              <span className="text-[10px] text-slate-400 font-mono">(۲.۴ MB)</span>
              <button
                onClick={onPrintPdf}
                className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                title="دانلود پیوست"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Insert Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              درج پیوند (Link)
            </h3>
            <form onSubmit={handleInsertLink} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-600 dark:text-slate-300">متن پیوند:</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="مثال: گزارش عملکرد سالانه"
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-600 dark:text-slate-300">آدرس URL:</label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none font-mono text-[11px]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  درج پیوند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
