import React, { useRef, useState } from 'react';
import { AnimatedModal } from './AnimatedModal';
import { X, Sparkles, Wand2, FileText, ArrowLeft, Loader2, Mic, Square, RotateCcw } from 'lucide-react';
import { Meeting, Participant } from '../types';

interface RoughNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated: (meeting: Meeting) => void;
  organizer?: Participant;
}

export const RoughNotesModal: React.FC<RoughNotesModalProps> = ({
  isOpen,
  onClose,
  onMeetingCreated,
  organizer,
}) => {
  const [roughText, setRoughText] = useState(
    `- بچه‌ها با محصول جدید موافق بودن ولی گفتن روی سرعت API کار بشه
- سارا قراره داکیومنت دیزاین رو تا شنبه آینده آماده کنه
- علی مسئول بهینه‌سازی سرورها شد
- بودجه فاز اول هم تصویب شد`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported by this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedAudio((previous) => { if (previous) URL.revokeObjectURL(previous.url); return { blob, url: URL.createObjectURL(blob) }; });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : 'Microphone permission was not granted.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const clearRecording = () => {
    if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    setRecordedAudio(null);
  };

  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Unable to read the recording.'));
    reader.readAsDataURL(blob);
  });

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'text' && !roughText.trim()) return;
    if (inputMode === 'voice' && !recordedAudio) {
      setError('Record a voice note before converting it.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = inputMode === 'voice'
        ? { action: 'convert_voice_notes', audioData: await blobToBase64(recordedAudio!.blob), audioMimeType: recordedAudio!.blob.type, meetingTitle: 'Raw meeting notes' }
        : { action: 'convert_rough_notes', text: roughText, meetingTitle: 'Raw meeting notes' };
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody,
          meetingTitle: 'جلسه هماهنگی تیم محصول',
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData?.success || !resData?.data) {
        throw new Error(resData?.error || 'AI conversion failed.');
      }
      const aiData = resData.data;
      const suggestedParticipants = (Array.isArray(aiData?.participants) ? aiData.participants : [])
        .filter((person: any) => person?.memberId && person.memberId !== organizer?.id)
        .map((person: any, idx: number) => {
          const roles = Array.from(new Set([...(Array.isArray(person.roles) ? person.roles : []), person.role || 'Viewer'])) as any[];
          const primaryRole = roles.includes('Reviewer') ? 'Reviewer' : roles.includes('Editor') ? 'Editor' : roles.includes('Signer') ? 'Signer' : 'Viewer';
          return {
            id: person.memberId,
            name: person.name || `Participant ${idx + 1}`,
            role: primaryRole,
            roles,
            email: person.email || '',
            avatar: person.avatar,
            requiresSignature: roles.includes('Signer'),
          } as Participant;
        });

      const newMeeting: Meeting = {
        id: `meet_${Date.now()}`,
        title: aiData?.title || 'جلسه بازنگری و هماهنگی فنی سامانه',
        persianDate: '۱۵ مهر ۱۴۰۴',
        timeRange: '۱۰:۰۰ - ۱۱:۳۰',
        location: 'اتاق جلسات اصلی',
        status: 'DRAFT',
        statusLabel: 'پیش‌نویس',
        organizer: organizer || { id: 'unknown', name: 'کاربر فعلی', role: 'Participant', email: '', avatar: '' },
        participants: organizer ? [organizer, ...suggestedParticipants] : suggestedParticipants,
        agenda: (aiData?.agenda || ['بررسی معماری', 'تخصیص وظایف']).map((text: string, idx: number) => ({
          id: `ag_${idx + 1}`,
          order: idx + 1,
          text,
        })),
        discussion:
          aiData?.discussion ||
          'جلسه با حضور اعضا رسمیت یافت و موضوعات کلیدی بررسی و تصمیم‌گیری شد.',
        aiSuggestion: {
          summary: '',
          applied: true,
        },
        decisions: (aiData?.keyDecisions || ['تصویب برنامه اجرایی']).map((text: string, idx: number) => ({
          id: `dec_${idx + 1}`,
          text,
          approved: true,
        })),
        actionItems: (aiData?.suggestedTasks || []).map((t: any, idx: number) => ({
          id: `act_${idx + 1}`,
          task: t.task || 'پیگیری موارد تعیین‌شده',
          assignee: organizer || { id: 'unknown', name: 'کاربر فعلی', role: 'Participant', email: '', avatar: '' },
          assigneeName: t.role || 'مسئول پیگیری',
          assigneeAvatar: organizer?.avatar,
          dueDate: t.deadline || '۱۰ روز آینده',
          completed: false,
        })).map((item: any, index: number) => {
          const task = Array.isArray(aiData?.suggestedTasks) ? aiData.suggestedTasks[index] : undefined;
          const assignee = suggestedParticipants.find((person: Participant) => person.id === task?.assigneeId || person.name === task?.assigneeName) || organizer;
          return assignee ? { ...item, assignee, assigneeId: task?.assigneeId || assignee.id, assigneeName: task?.assigneeName || assignee.name, assigneeAvatar: assignee.avatar } : item;
        }),
        comments: [],
        signatureCount: 0,
        totalSignaturesRequired: [organizer, ...suggestedParticipants].filter((person: Participant | undefined) => person?.requiresSignature).length,
      };

      onMeetingCreated(newMeeting);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI conversion failed. Check the configured provider and try again.');
      return;
      setError('خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش نمایید.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} contentClassName="w-full max-w-2xl">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                تبدیل هوشمند یادداشت‌های خام به صورت‌جلسه
              </h3>
              <p className="text-[11px] text-slate-500">
                با موتور Gemini 3.8 Flash یادداشت‌های پراکنده یا متن پیاده‌شده صوت را رسمی کنید
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConvert} className="flex flex-col gap-3 text-xs">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" onClick={() => setInputMode('text')} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${inputMode === 'text' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'}`}>Text notes</button>
            <button type="button" onClick={() => setInputMode('voice')} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${inputMode === 'voice' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'}`}>Voice note</button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>متن خام یا پیش‌نویس جلسه:</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                Gemini Flash Model
              </span>
            </label>
            <textarea
              rows={6}
              required
              value={roughText}
              onChange={(e) => setRoughText(e.target.value)}
              disabled={inputMode === 'voice'}
              placeholder="نکات مطرح شده، مصوبات شفاهی یا گفتگوهای ضبط شده را اینجا وارد کنید..."
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none"
            />
          </div>

          {inputMode === 'voice' && <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
            <div className="flex items-center gap-2">
              {!isRecording ? <button type="button" onClick={() => { void startRecording(); }} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white"><Mic className="h-4 w-4" />Start recording</button> : <button type="button" onClick={stopRecording} className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white"><Square className="h-3.5 w-3.5 fill-current" />Stop recording</button>}
              {recordedAudio && <button type="button" onClick={clearRecording} className="flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 font-semibold text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"><RotateCcw className="h-4 w-4" />Record again</button>}
            </div>
            {recordedAudio && <audio className="mt-3 w-full" controls src={recordedAudio.url} />}
            <p className="mt-2 text-[11px] leading-5 text-indigo-700/80 dark:text-indigo-300/80">Speak naturally. The recording will first be transcribed, then analyzed into the same formal meeting structure as text notes.</p>
          </div>}

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال نگارش و ساختارسازی...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تبدیل و ساخت صورت‌جلسه</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModal>
  );
};
