import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PenTool,
  Type,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Lock,
  UserCheck,
  Smartphone,
  KeyRound,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Meeting } from '../types';
import { AnimatedModal } from './AnimatedModal';

const toLatinDigits = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onConfirmSignature: (signatureDataUrl: string) => void;
  currentUser: { name: string; phoneNumber: string; email: string; role: string; signatureData?: string };
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onConfirmSignature,
  currentUser,
}) => {
  const [step, setStep] = useState<'sign' | 'otp'>('sign');
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'saved'>('draw');
  const [typedName, setTypedName] = useState(currentUser.name);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(120);
  const [otpError, setOtpError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasSavedSignature = Boolean(currentUser.signatureData?.startsWith('data:image/') || currentUser.signatureData?.startsWith('typed:'));

  // Setup canvas
  useEffect(() => {
    if (isOpen && step === 'sign' && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const isDark = document.documentElement.classList.contains('dark');
        ctx.strokeStyle = isDark ? '#a5b4fc' : '#312e81';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (currentUser.signatureData?.startsWith('data:image/')) {
          const savedSignature = new Image();
          savedSignature.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(savedSignature, 0, 0, canvas.width, canvas.height);
          };
          savedSignature.src = currentUser.signatureData;
        }
      }
    }
  }, [isOpen, step, activeTab, currentUser.signatureData]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'otp' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('sign');
      if (hasSavedSignature) {
        setActiveTab('saved');
        setTypedName(currentUser.name);
      } else if (currentUser.signatureData?.startsWith('typed:')) {
        setActiveTab('type');
        setTypedName(currentUser.signatureData.slice('typed:'.length) || currentUser.name);
      } else {
        setActiveTab('draw');
        setTypedName(currentUser.name);
      }
      setAgreedToTerms(false);
      setOtpCode('');
      setOtpError('');
      setTimerSeconds(120);
    }
  }, [isOpen, currentUser.name, currentUser.signatureData, hasSavedSignature]);

  if (!meeting) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * (canvas.width / rect.width), (clientY - rect.top) * (canvas.height / rect.height));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo((clientX - rect.left) * (canvas.width / rect.width), (clientY - rect.top) * (canvas.height / rect.height));
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Step 1: Proceed to OTP verification
  const handleProceedToOtp = async () => {
    if (!agreedToTerms) return;
    setIsSubmitting(true);
    setOtpError('');

    try {
      const res = await fetch('/api/signature/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          signerPhone: currentUser.phoneNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send verification code.');
      if (data?.demoOtp) {
        setDemoOtpHint(data.demoOtp);
      }
      setOtpSent(true);
      setTimerSeconds(120);
      setStep('otp');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Unable to send verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP and finalize signature
  const handleVerifyOtpAndSign = async () => {
    const normalizedOtp = toLatinDigits(otpCode).replace(/\D/g, '');
    if (normalizedOtp.length < 6) {
      setOtpError('لطفاً کد ۶ رقمی را به صورت کامل وارد کنید.');
      return;
    }

    setIsSubmitting(true);
    setOtpError('');

    let signatureData = '';
    if (activeTab === 'saved' && currentUser.signatureData) {
      signatureData = currentUser.signatureData;
    } else if (activeTab === 'draw' && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL();
    } else {
      signatureData = `typed:${typedName}`;
    }

    try {
      // 1. Verify OTP with server
      const verifyRes = await fetch('/api/signature/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          signerPhone: currentUser.phoneNumber,
          otp: normalizedOtp,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setOtpError(verifyData.error || 'کد تأیید نامعتبر است.');
        setIsSubmitting(false);
        return;
      }

      // The parent submits the signature after OTP verification. Keeping the
      // final write in one place prevents the signature from being submitted
      // twice and then incorrectly resetting the local signed state.
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Signature could not be saved.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onConfirmSignature(signatureData);
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose} contentClassName="w-full max-w-2xl">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0f172a] shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-5 overflow-hidden text-right transition-colors">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              {step === 'sign' ? <PenTool className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {step === 'sign' ? 'امضای دیجیتال صورت‌جلسه' : 'تأیید هویت دومرحله‌ای (OTP)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'sign'
                  ? 'مرحله اول: تنظیم طرح امضا و گواهی حقوقی'
                  : 'مرحله دوم: تأیید نهایی با رمز یک‌بار مصرف قانونی'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: Draw or Type Signature */}
        {step === 'sign' && (
          <>
            {/* Meeting metadata summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>{meeting.title}</span>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  {meeting.persianDate}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    امضاکننده: <strong>{currentUser.name}</strong> ({currentUser.role})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>احراز هویت شده</span>
                </div>
              </div>
            </div>

            {/* Tabs: Draw or Type */}
            {!hasSavedSignature && <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {currentUser.signatureData?.startsWith('data:image/') && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'saved'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>امضای ذخیره‌شده</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('draw')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'draw'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>رسم امضا با قلم یا ماوس</span>
              </button>
              <button
                onClick={() => setActiveTab('type')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'type'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>تایپ نام و امضا</span>
              </button>
            </div>}

            {/* Signature drawing/typing canvas */}
            <div className="relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 p-2 flex flex-col items-center justify-center min-h-[250px]">
              {hasSavedSignature ? (
                <div className="flex w-full flex-col items-center justify-center gap-3 py-8">
                  {currentUser.signatureData?.startsWith('data:image/') ? <img src={currentUser.signatureData} alt="امضای ذخیره‌شده" className="h-36 max-w-full select-none object-contain" draggable={false} /> : <span className="font-serif text-4xl font-semibold italic text-indigo-900 dark:text-indigo-200">{currentUser.signatureData?.slice('typed:'.length)}</span>}
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" />امضای ذخیره‌شده از تنظیمات استفاده می‌شود و قابل ویرایش نیست.</span>
                </div>
              ) : activeTab === 'draw' ? (
                <>
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={240}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[220px] sm:h-[240px] cursor-crosshair touch-none"
                  />
                  <button
                    onClick={clearCanvas}
                    className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-500 hover:text-rose-500 shadow-xs text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    title="پاک کردن"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>پاک کردن</span>
                  </button>
                  <span className="absolute bottom-2 text-[10px] text-slate-400 pointer-events-none">
                    امضای خود را با ماوس یا لمس داخل کادر رسم کنید
                  </span>
                </>
              ) : (
                <div className="w-full flex flex-col items-center justify-center gap-3 py-6">
                  <input
                    type="text"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    className="text-center font-bold text-xl text-indigo-900 dark:text-indigo-300 bg-transparent border-b-2 border-indigo-300 dark:border-indigo-600 pb-1 focus:outline-none w-3/4"
                    placeholder="نام خود را وارد کنید"
                  />
                  <span className="text-[11px] text-slate-400">
                    قلم رسمی خوشنویسی سازمانی اکورد
                  </span>
                </div>
              )}
            </div>

            {/* Legal consent checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer shrink-0"
              />
              <span className="text-[11px] text-amber-900 dark:text-amber-200/90 leading-relaxed">
                اینجانب با آگاهی کامل از مفاد صورت‌جلسه، صحت مندرجات آن را تأیید نموده و موافقت خود را جهت صدور کد تأیید امضای الکترونیک اعلام می‌دارم.
              </span>
            </label>

            {/* Step 1 Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleProceedToOtp}
                disabled={!agreedToTerms || isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ارسال کد...' : 'دریافت رمز یک‌بار مصرف (OTP)'}</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 'otp' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold">
                <Smartphone className="w-4 h-4" />
                <span>کد تأیید ۶ رقمی ارسال شد</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                کد یک‌بار مصرف امن به شماره همراه و ایمیل سازمانی شما ارسال گردید. لطفاً کد را در کادر زیر وارد فرمایید.
              </p>
              {demoOtpHint && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900 mt-1">
                  <span className="text-[10px] text-slate-500">کد پیامک‌شده تستی:</span>
                  <span className="font-mono font-bold text-sm tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                    {demoOtpHint}
                  </span>
                </div>
              )}
            </div>

            {/* OTP Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                کد ۶ رقمی OTP:
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(toLatinDigits(e.target.value).replace(/[^0-9]/g, ''));
                  setOtpError('');
                }}
                placeholder="• • • • • •"
                className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 text-center font-mono text-xl tracking-[0.4em] font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {otpError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* Countdown timer & resend */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">
                اعتبار کد: {Math.floor(timerSeconds / 60)}:
                {String(timerSeconds % 60).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={handleProceedToOtp}
                disabled={timerSeconds > 0}
                className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-30 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>ارسال مجدد کد</span>
              </button>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('sign')}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium cursor-pointer"
              >
                بازگشت
              </button>
              <button
                type="button"
                onClick={handleVerifyOtpAndSign}
                disabled={otpCode.length < 6 || isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال تأیید امضا...' : 'تأیید نهایی و امضای سند'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};
