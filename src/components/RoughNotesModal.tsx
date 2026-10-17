import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedModal } from './AnimatedModal';
import { X, Sparkles, Wand2, Loader2, Mic, Square, RotateCcw, ChevronRight, Play, Pause } from 'lucide-react';
import { Meeting, Participant } from '../types';
import { ParticlesOrb, type OrbState } from './ParticlesOrb';
import BlurText from './BlurText';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackState, setPlaybackState] = useState<'not-started' | 'playing' | 'paused' | 'ended'>('not-started');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!recordedAudio) {
      playbackAudioRef.current?.pause();
      playbackAudioRef.current = null;
      setIsPlaying(false);
      return undefined;
    }
    const audio = new Audio(recordedAudio.url);
    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackState('ended');
    };
    setPlaybackState('not-started');
    playbackAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.onended = null;
      if (playbackAudioRef.current === audio) playbackAudioRef.current = null;
    };
  }, [recordedAudio]);

  const toPersianDigits = (value: string) => value.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const formattedRecordingTime = toPersianDigits(`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`);
  const orbState: OrbState = isPlaying ? 'speaking' : isConnecting ? 'connecting' : isLoading ? 'thinking' : isRecording ? 'listening' : playbackState === 'paused' ? 'connecting' : 'idle';
  const voiceMessageKey = isPlaying ? 'speaking' : isConnecting ? 'connecting' : isLoading ? 'loading' : isRecording ? 'recording' : playbackState === 'paused' ? 'paused' : recordedAudio ? 'ready' : 'idle';
  const voiceMessages = useMemo(() => ({
    connecting: ['در حال اتصال به میکروفون…', 'لطفاً دسترسی ضبط صدا را تأیید کنید'],
    loading: ['در حال تحلیل جلسه…', 'در حال ساخت صورت‌جلسه…'],
    recording: ['با آرامش صحبت کنید', 'موضوعات و تصمیم‌ها را بیان کنید', 'مسئولیت‌ها و گام‌های بعدی را بگویید'],
    speaking: ['در حال پخش یادداشت صوتی', 'برای مکث، دکمه را لمس کنید'],
    paused: ['پخش یادداشت متوقف شده است', 'برای ادامه، دکمه را لمس کنید'],
    ready: ['یادداشت صوتی آماده است', 'برای شنیدن دوباره، دکمه را بزنید', 'پس از تأیید، صورت‌جلسه ساخته می‌شود'],
    idle: ['آماده شنیدن هستم', 'طبیعی صحبت کنید', 'من نکات جلسه را ساختاریافته می‌کنم'],
  }[voiceMessageKey]), [voiceMessageKey]);
  const [voiceMessageIndex, setVoiceMessageIndex] = useState(0);

  useEffect(() => {
    setVoiceMessageIndex(0);
    if (inputMode !== 'voice') return undefined;
    const timer = window.setInterval(() => setVoiceMessageIndex((index) => (index + 1) % voiceMessages.length), 2400);
    return () => window.clearInterval(timer);
  }, [inputMode, voiceMessageKey, voiceMessages.length]);

  const currentVoiceMessage = voiceMessages[voiceMessageIndex % voiceMessages.length];

  const startRecording = async () => {
    setError(null);
    setIsConnecting(true);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('ضبط صدا در این مرورگر پشتیبانی نمی‌شود.');
      setIsConnecting(false);
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
      setRecordingSeconds(0);
      setIsConnecting(false);
      setIsRecording(true);
    } catch (recordingError) {
      setIsConnecting(false);
      setError(recordingError instanceof Error ? recordingError.message : 'دسترسی به میکروفون تأیید نشد.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const clearRecording = () => {
    playbackAudioRef.current?.pause();
    setIsPlaying(false);
    setPlaybackState('not-started');
    if (recordedAudio) URL.revokeObjectURL(recordedAudio.url);
    setRecordedAudio(null);
    setRecordingSeconds(0);
  };

  const togglePlayback = async () => {
    const audio = playbackAudioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setPlaybackState('paused');
      return;
    }
    try {
      setIsPlaying(true);
      setPlaybackState('playing');
      await audio.play();
    } catch {
      setIsPlaying(false);
      setPlaybackState('paused');
      setError('پخش یادداشت صوتی ممکن نیست. دوباره تلاش کنید.');
    }
  };

  const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('خواندن فایل ضبط‌شده ممکن نیست.'));
    reader.readAsDataURL(blob);
  });

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMode === 'text' && !roughText.trim()) return;
    if (inputMode === 'voice' && !recordedAudio) {
      setError('پیش از تبدیل، ابتدا یک یادداشت صوتی ضبط کنید.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = inputMode === 'voice'
        ? { action: 'convert_voice_notes', audioData: await blobToBase64(recordedAudio!.blob), audioMimeType: recordedAudio!.blob.type, meetingTitle: 'یادداشت‌های خام جلسه' }
        : { action: 'convert_rough_notes', text: roughText, meetingTitle: 'یادداشت‌های خام جلسه' };
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody,
          meetingTitle: 'جلسه هماهنگی تیم محصول',
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData?.success || !resData?.data) {
        throw new Error(resData?.error || 'تبدیل یادداشت‌ها با هوش مصنوعی انجام نشد.');
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
      setError(err instanceof Error ? err.message : 'تبدیل یادداشت‌ها انجام نشد. تنظیمات مدل هوش مصنوعی را بررسی و دوباره تلاش کنید.');
      return;
      setError('خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش نمایید.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderVoiceAssistant = () => (
    <form dir="rtl" onSubmit={handleConvert} className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-black dark:text-white sm:h-[min(860px,100dvh)] sm:max-w-md sm:rounded-[2rem] sm:shadow-2xl">

      <div className="relative z-10 flex items-center justify-between px-5 pb-3 pt-5">
        <button type="button" onClick={() => setInputMode('text')} aria-label="بازگشت به یادداشت متنی" className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-slate-500 shadow-sm backdrop-blur transition hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.08em] text-indigo-500 dark:text-indigo-300">هوش جلسه</p>
          <h2 className="mt-1 text-sm font-extrabold">یادداشت صوتی جلسه</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="بستن" className="grid h-10 w-10 place-items-center rounded-full text-slate-400 transition hover:bg-white/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-4 text-center">
        <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
          <ParticlesOrb state={orbState} size={212} speed={1} colorFrom="#4039c5" colorTo="#4039c5" />
        </div>

        <div className="mt-6 flex min-h-[84px] items-center justify-center px-4 text-center">
          <BlurText key={`${voiceMessageKey}-${voiceMessageIndex}`} text={currentVoiceMessage} effect="blur" animateBy="words" direction="top" staggerFrom="start" trigger="load" delay={120} stepDuration={0.35} blur={10} distance={50} className="text-xl font-bold leading-9 text-slate-800 dark:text-slate-100" />
        </div>

        {error && <p className="mt-4 max-w-xs rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium leading-5 text-rose-600 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      </div>

      <div className="relative z-10 px-6 pb-8 pt-2">
        <div className="flex items-center justify-center gap-5">
          <button type="button" onClick={recordedAudio ? clearRecording : undefined} disabled={!recordedAudio || isRecording} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/75 text-slate-400 transition enabled:hover:border-indigo-200 enabled:hover:text-indigo-600 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-slate-500" aria-label="ضبط دوباره">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" disabled={isConnecting || isLoading} onClick={isRecording ? stopRecording : recordedAudio ? () => { void togglePlayback(); } : () => { void startRecording(); }} className={`group relative grid h-24 w-24 place-items-center rounded-full text-white shadow-[0_18px_38px_rgba(79,70,229,0.3)] transition active:scale-95 disabled:cursor-wait disabled:opacity-70 ${isRecording ? 'bg-rose-500 shadow-rose-500/30' : 'bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500'}`} aria-label={isRecording ? 'توقف ضبط' : recordedAudio ? (isPlaying ? 'توقف پخش' : 'پخش یادداشت صوتی') : 'شروع ضبط'}>
            <span className={`absolute inset-[-8px] rounded-full border border-indigo-300/40 transition ${isRecording ? 'animate-ping border-rose-300/40' : 'group-hover:scale-105'}`} />
            {isRecording ? <Square className="relative h-7 w-7 fill-current" /> : recordedAudio ? (isPlaying ? <Pause className="relative h-8 w-8" /> : <Play className="relative h-8 w-8 translate-x-0.5" />) : <Mic className="relative h-8 w-8" />}
          </button>
          <div className="flex h-11 w-11 items-center justify-center text-center text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-500">{isRecording ? formattedRecordingTime : '۲ دقیقه'}</div>
        </div>

        {recordedAudio && !isRecording && <button type="submit" disabled={isLoading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-slate-900/15 transition hover:bg-indigo-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-100"><Sparkles className="h-4 w-4" />{isLoading ? 'در حال تحلیل جلسه…' : 'ساخت صورت‌جلسه ساختاریافته'}</button>}
      </div>
    </form>
  );

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} className={inputMode === 'voice' ? 'p-0 sm:p-4' : ''} contentClassName={inputMode === 'voice' ? 'w-full max-w-md' : 'w-full max-w-2xl'}>
      {inputMode === 'voice' ? renderVoiceAssistant() : <div dir="rtl" className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
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
            <button type="button" onClick={() => setInputMode('text')} className={`flex-1 rounded-lg px-3 py-2 font-semibold ${inputMode === 'text' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-slate-500'}`}>یادداشت متنی</button>
            <button type="button" onClick={() => setInputMode('voice')} className="flex-1 rounded-lg px-3 py-2 font-semibold text-slate-500">یادداشت صوتی</button>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>متن خام یا پیش‌نویس جلسه:</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                مدل Gemini Flash
              </span>
            </label>
            <textarea
              rows={6}
              required
              value={roughText}
              onChange={(e) => setRoughText(e.target.value)}
              placeholder="نکات مطرح شده، مصوبات شفاهی یا گفتگوهای ضبط شده را اینجا وارد کنید..."
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none"
            />
          </div>

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
      </div>}
    </AnimatedModal>
  );
};
