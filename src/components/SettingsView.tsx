import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Bell,
  Smartphone,
  Save,
  PenTool,
  CheckCircle2
  ,RotateCcw, Camera, Trash2
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { PageHeader } from './PageHeader';
import { useSnackbar } from './Snackbar';

interface SettingsViewProps {
  onAvatarChanged?: (avatar?: string) => void;
  onSignatureChanged?: (signatureData?: string) => void;
}

interface SettingsToggleProps {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ checked, label, onChange }) => (
  <label className="settings-toggle" aria-label={label}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="settings-toggle-track" aria-hidden="true">
      <span className="settings-toggle-thumb" />
    </span>
  </label>
);

export const SettingsView: React.FC<SettingsViewProps> = ({ onAvatarChanged, onSignatureChanged }) => {
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('Participant');
  const [emailNotification, setEmailNotification] = useState(true);
  const [telegramNotification, setTelegramNotification] = useState(true);
  const [autoSeal, setAutoSeal] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramPairingUrl, setTelegramPairingUrl] = useState('');
  const [isPairingTelegram, setIsPairingTelegram] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (saveError) showSnackbar({ type: 'error', message: saveError });
  }, [saveError, showSnackbar]);

  useEffect(() => {
    if (savedSuccess) showSnackbar({ type: 'success', message: 'تغییرات با موفقیت ذخیره شد.' });
  }, [savedSuccess, showSnackbar]);

  useEffect(() => {
    fetch('/api/auth/me').then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.user) {
        setName(data.user.name || '');
        const fallbackParts = String(data.user.name || '').trim().split(/\s+/);
        setFirstName(data.user.firstName || fallbackParts.shift() || '');
        setLastName(data.user.lastName || fallbackParts.join(' '));
        setPhoneNumber(data.user.phoneNumber || '');
        setRole(data.user.role || '');
        setSignatureData(data.user.signatureData || '');
        setAvatar(data.user.avatar || undefined);
      }
    }).catch(() => undefined);
    fetch('/api/settings')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('تنظیمات قابل دریافت نیست.')))
      .then((data) => {
        const preferences = data.preferences || {};
        if (typeof preferences.emailNotification === 'boolean') setEmailNotification(preferences.emailNotification);
        if (typeof preferences.telegramNotification === 'boolean') setTelegramNotification(preferences.telegramNotification);
        if (typeof preferences.autoSeal === 'boolean') setAutoSeal(preferences.autoSeal);
      })
      .catch(() => setSaveError('تنظیمات از سرور دریافت نشد.'));
  }, []);

  const saveAvatar = async (nextAvatar?: string) => {
    setIsSavingAvatar(true);
    setSaveError('');
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: nextAvatar || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Avatar could not be updated.');
      const savedAvatar = data.avatar || undefined;
      setAvatar(savedAvatar);
      onAvatarChanged?.(savedAvatar);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Avatar could not be updated.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleAvatarFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setSaveError('Please choose an image file.');
    if (file.size > 2_500_000) return setSaveError('Avatar images must be smaller than 2.5 MB.');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') void saveAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetch('/api/telegram/status')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Telegram status unavailable.')))
      .then((data) => {
        setTelegramLinked(Boolean(data.linked));
        setTelegramUsername(data.username || '');
      })
      .catch(() => undefined);
  }, []);

  const pairTelegram = async () => {
    setIsPairingTelegram(true);
    setSaveError('');
    try {
      const response = await fetch('/api/telegram/link-token', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to create a Telegram pairing link.');
      if (!data.deepLink) throw new Error(data?.error || 'Telegram bot username is not configured.');
      const pairingUrl = data.deepLink;
      setTelegramPairingUrl(pairingUrl);
      window.open(pairingUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to connect Telegram.');
    } finally {
      setIsPairingTelegram(false);
    }
  };

  const unpairTelegram = async () => {
    const response = await fetch('/api/telegram/link', { method: 'DELETE' });
    if (!response.ok) return;
    setTelegramLinked(false);
    setTelegramUsername('');
    setTelegramPairingUrl('');
  };

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !signatureData.startsWith('data:image/')) return;
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = signatureData;
  }, [signatureData]);

  const getCanvasPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in event ? event.touches[0] : event;
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startSignatureDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    const point = getCanvasPoint(event);
    if (!canvas || !point) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.strokeStyle = document.documentElement.classList.contains('dark') ? '#a5b4fc' : '#312e81';
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const drawSignature = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const point = getCanvasPoint(event);
    const context = signatureCanvasRef.current?.getContext('2d');
    if (!point || !context) return;
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const saveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    setIsSavingSignature(true);
    setSaveError('');
    try {
      const nextSignature = canvas.toDataURL('image/png');
      const response = await fetch('/api/profile/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData: nextSignature, replace: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ذخیره امضا انجام نشد.');
      setSignatureData(nextSignature);
      onSignatureChanged?.(nextSignature);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ذخیره امضا انجام نشد.');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    try {
      const profileResponse = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!profileResponse.ok) throw new Error('Unable to save profile.');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotification, telegramNotification, autoSeal }),
      });
      if (!response.ok) throw new Error('ذخیره تنظیمات انجام نشد.');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ذخیره تنظیمات انجام نشد.');
    }
  };

  return (
    <div className="responsive-page flex-1 max-w-4xl mx-auto flex flex-col gap-6 p-6">
      <PageHeader
        icon={Settings}
        title={'\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u062d\u0633\u0627\u0628 \u06a9\u0627\u0631\u0628\u0631\u06cc'}
        description={'\u0634\u062e\u0635\u06cc\u200c\u0633\u0627\u0632\u06cc \u067e\u0631\u0648\u0641\u0627\u06cc\u0644\u060c \u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0627\u0645\u0636\u0627\u06cc \u0627\u0644\u06a9\u062a\u0631\u0648\u0646\u06cc\u06a9\u06cc \u0648 \u0633\u06cc\u0627\u0633\u062a\u200c\u0647\u0627\u06cc \u0627\u0645\u0646\u06cc\u062a\u06cc.'}
      />
      {/* Header */}
      <div className="hidden flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            تنظیمات حساب کاربری و امضای دیجیتال
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            شخصی‌سازی پروفایل، تنظیمات گواهی امضای الکترونیکی و سیاست‌های امنیتی
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <User className="w-4 h-4 text-indigo-500" />
            <span>مشخصات فردی و سازمانی</span>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-white to-violet-50/50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <UserAvatar name={name || 'کاربر'} avatar={avatar} className="h-16 w-16 text-lg ring-4 ring-white shadow-lg dark:ring-slate-800" imageClassName="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg dark:ring-slate-800" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">تصویر پروفایل</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">برای شناسایی سریع‌تر در جلسات و سازمان، تصویر خود را اضافه کنید.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              <button type="button" disabled={isSavingAvatar} onClick={() => avatarInputRef.current?.click()} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50"><Camera className="h-3.5 w-3.5" />{isSavingAvatar ? 'در حال ذخیره…' : avatar ? 'تغییر تصویر' : 'افزودن تصویر'}</button>
              {avatar && <button type="button" disabled={isSavingAvatar} onClick={() => void saveAvatar()} className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" />حذف</button>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                نام و نام‌خانوادگی:
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">{'\u0634\u0645\u0627\u0631\u0647 \u062a\u0644\u0641\u0646:'}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                عنوان شغلی:
              </label>
              <input
                type="text"
                value={role}
                readOnly
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Digital Signature Profile */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <PenTool className="w-4 h-4 text-indigo-500" />
            <span>پروفایل امضای دیجیتال شما</span>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            امضای شما یک‌بار در پروفایل ذخیره می‌شود و هنگام امضای صورت‌جلسه‌های بعدی به‌صورت خودکار استفاده خواهد شد. هر زمان خواستید می‌توانید آن را جایگزین کنید.
          </p>

          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-2 dark:border-indigo-900/70 dark:bg-indigo-950/20">
            <canvas
              ref={signatureCanvasRef}
              width={900}
              height={280}
              onMouseDown={startSignatureDrawing}
              onMouseMove={drawSignature}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onTouchStart={startSignatureDrawing}
              onTouchMove={drawSignature}
              onTouchEnd={() => setIsDrawing(false)}
              className="h-52 w-full cursor-crosshair touch-none rounded-xl bg-white dark:bg-slate-950 sm:h-64"
            />
            <span className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400">امضای خود را داخل کادر رسم کنید</span>
            <button type="button" onClick={clearSignature} className="absolute left-4 top-4 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm hover:text-rose-500 dark:bg-slate-900/90"><RotateCcw className="h-3 w-3" />پاک کردن</button>
          </div>
          {signatureData && <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />امضای ذخیره‌شده فعال است</div>}
          <div className="flex justify-end">
            <button type="button" onClick={() => void saveSignature()} disabled={isSavingSignature} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" />{isSavingSignature ? 'در حال ذخیره…' : 'ذخیره امضا'}</button>
          </div>
        </div>

        {/* Telegram Integration */}
        <div className="hidden">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Smartphone className="w-4 h-4 text-sky-500" />
            <span>اتصال به تلگرام و ربات هوشمند</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900 text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-sky-950 dark:text-sky-200">
                شناسه متصل: @arash_fathi
              </span>
              <span className="text-[11px] text-sky-700 dark:text-sky-400">
                دریافت اعلانات جلسات و امضا از طریق تلگرام فعال است.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-semibold text-[10px]">
              متصل شد
            </span>
          </div>
        </div>

        <div className="settings-telegram-card rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-sm dark:border-sky-900/60 dark:bg-slate-900/90">
          <div className="settings-telegram-heading flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">اتصال به تلگرام</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">درخواست‌های امضای صورت‌جلسه را مستقیم در گفت‌وگوی تلگرام دریافت کنید.</p>
            </div>
            {telegramLinked ? (
              <button type="button" onClick={() => void unpairTelegram()} className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300">قطع اتصال</button>
            ) : (
              <button type="button" onClick={() => void pairTelegram()} disabled={isPairingTelegram} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">{isPairingTelegram ? 'در حال آماده‌سازی…' : 'اتصال تلگرام'}</button>
            )}
          </div>
          <p className="mt-4 text-xs font-semibold text-sky-700 dark:text-sky-300">{telegramLinked ? `حساب متصل${telegramUsername ? `: @${telegramUsername}` : ''}` : 'حسابی متصل نشده است'}</p>
          {telegramPairingUrl && !telegramLinked && <p className="mt-3 break-all rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-500 dark:bg-slate-950 dark:text-slate-400">لینک اتصال: {telegramPairingUrl}</p>}
        </div>

        {/* Notification & Organization Policies */}
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Bell className="w-4 h-4 text-indigo-500" />
            <span>تنظیمات اعلانات و سیاست‌های سازمان</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                ارسال ایمیل اطلاع‌رسانی هنگام ثبت امضا و مهر و موم سند
              </span>
              <SettingsToggle
                checked={emailNotification}
                label="ارساï¿½„ ایï¿½…یï¿½„ اطï¿½„اعï¿½€ï¿½رساï¿½†ی"
                onChange={setEmailNotification}
              />
            </div>

            <div className="flex items-center justify-between gap-5">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                مهر و موم خودکار سند بلافاصله پس از تکمیل تمام امضاها
              </span>
              <SettingsToggle
                checked={autoSeal}
                label="مهر و موم خودکار سند"
                onChange={setAutoSeal}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saveError && <span className="text-xs text-rose-600 dark:text-rose-400">{saveError}</span>}
          {savedSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>تنظیمات با موفقیت ذخیره شد</span>
            </span>
          )}
          <button
            type="submit"
            className="py-2.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات</span>
          </button>
        </div>
      </form>
    </div>
  );
};
