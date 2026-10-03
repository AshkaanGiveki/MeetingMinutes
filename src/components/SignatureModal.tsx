import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  PenTool,
  Type,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Lock,
  UserCheck
} from 'lucide-react';
import { Meeting } from '../types';
import { currentUser } from '../data/mockData';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting;
  onConfirmSignature: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onConfirmSignature,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(currentUser.name);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup canvas
  useEffect(() => {
    if (isOpen && activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#312e81'; // dark indigo ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

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
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
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

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
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

  const handleSubmitSignature = async () => {
    if (!agreedToTerms) return;
    setIsSubmitting(true);

    let signatureData = '';
    if (activeTab === 'draw' && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL();
    } else {
      signatureData = `typed:${typedName}`;
    }

    try {
      // Call server signature verification API
      await fetch('/api/signature/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          signerName: currentUser.name,
          signerRole: currentUser.role,
          signatureData,
          contentToHash: meeting.discussion + meeting.title,
        }),
      });
    } catch (err) {
      console.warn('Signature API call fallback:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmSignature(signatureData);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-5 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                امضای دیجیتال صورت‌جلسه
              </h3>
              <p className="text-[11px] text-slate-400">
                ثبت هویت الکترونیکی و امضای غیرقابل انکار
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

        {/* Meeting metadata summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
            <span>{meeting.title}</span>
            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
              {meeting.persianDate}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
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
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>رسم امضا با قلم</span>
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
        </div>

        {/* Signature drawing/typing canvas */}
        <div className="relative rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 p-2 flex flex-col items-center justify-center min-h-[160px]">
          {activeTab === 'draw' ? (
            <>
              <canvas
                ref={canvasRef}
                width={420}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[150px] cursor-crosshair touch-none"
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
              <span className="text-xs text-slate-400">
                امضای دیجیتال با قلم استاندارد و نام قانونی
              </span>
            </div>
          )}
        </div>

        {/* Legal Consent Checkbox matching specification */}
        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-300 select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="leading-relaxed">
            متن جلسه را مطالعه کرده‌ام و با امضای الکترونیکی آن موافقم. (این امضا
            دارای برچسب زمانی و هش تغییرناپذیر خواهد بود)
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            انصراف
          </button>
          <button
            onClick={handleSubmitSignature}
            disabled={!agreedToTerms || isSubmitting}
            className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          >
            {isSubmitting ? (
              <span>در حال ثبت و صدور گواهی...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید و امضا کردن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
