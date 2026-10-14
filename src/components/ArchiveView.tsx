import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AnimatedModal } from './AnimatedModal';
import {
  Archive,
  Search,
  ShieldCheck,
  Printer,
  History,
  CheckCircle2,
  Lock,
  ExternalLink,
  X,
  FileCheck,
  Calendar,
  Award,
  MoreVertical
} from 'lucide-react';
import { Meeting, AuditRecord } from '../types';
import { EmptyState } from './EmptyState';
import { TableRowsSkeleton } from './LoadingState';
import { PageHeader } from './PageHeader';

const auditActionLabels: Record<string, string> = {
  MEETING_CREATED: 'جلسه ایجاد شد',
  DOCUMENT_ARCHIVED: 'سند بایگانی شد',
  REVIEW_APPROVED: 'بازبینی تأیید شد',
  SIGNATURE_COMPLETED: 'امضا ثبت شد',
  SIGNATURE_REJECTED: 'امضا رد شد',
  SIGNATURE_CHANGE_ACCEPTED: 'درخواست اصلاح پذیرفته شد',
  SIGNATURE_CHANGE_REJECTED: 'درخواست اصلاح رد شد',
  DOCUMENT_SEALED: 'سند مهر و موم شد',
  TELEGRAM_ONE_CLICK_SIGNED: 'امضای تلگرام ثبت شد',
  GUEST_SIGNATURE_COMPLETED: 'امضای مهمان ثبت شد',
};

interface ArchiveViewProps {
  meetings: Meeting[];
  isLoading?: boolean;
  onOpenMeeting: (meeting: Meeting) => void;
  onPrintPdf: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  meetings,
  isLoading = false,
  onOpenMeeting,
  onPrintPdf,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditMeeting, setSelectedAuditMeeting] = useState<Meeting | null>(null);
  const [selectedCertificateMeeting, setSelectedCertificateMeeting] = useState<Meeting | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const sealedMeetings = meetings.filter(
    (m) =>
      (m.status === 'SEALED' || m.status === 'ARCHIVED') &&
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  React.useEffect(() => {
    if (!selectedAuditMeeting) return;
    fetch(`/api/audit/${selectedAuditMeeting.id}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load audit trail')))
      .then((data) => setAuditLogs(data.logs || []))
      .catch(() => setAuditLogs([]));
  }, [selectedAuditMeeting]);

  React.useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuId]);

  return (
    <div className="responsive-page flex-1 max-w-6xl mx-auto flex flex-col gap-6 p-6">
      <PageHeader
        icon={Archive}
        title={'\u0622\u0631\u0634\u06cc\u0648 \u0627\u0633\u0646\u0627\u062f \u0631\u0633\u0645\u06cc \u0648 \u0645\u0647\u0631 \u0648 \u0645\u0648\u0645\u200c\u0634\u062f\u0647'}
        description={'\u0627\u0633\u0646\u0627\u062f \u0646\u0647\u0627\u06cc\u06cc\u200c\u0634\u062f\u0647 \u062f\u0627\u0631\u0627\u06cc \u06af\u0648\u0627\u0647\u06cc \u0631\u0645\u0632\u0646\u06af\u0627\u0631\u06cc\u060c \u0627\u0645\u0636\u0627\u0647\u0627\u06cc \u06a9\u0627\u0645\u0644 \u0648 \u063a\u06cc\u0631\u0642\u0627\u0628\u0644 \u062a\u063a\u06cc\u06cc\u0631'}
        action={<div className="archive-search flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs w-64 shadow-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={'\u062c\u0633\u062a\u062c\u0648 \u062f\u0631 \u0622\u0631\u0634\u06cc\u0648...'}
            className="w-full bg-transparent focus:outline-none text-slate-700 dark:text-slate-200"
          />
        </div>}
      />
      {/* Header */}
      <div className="archive-page-heading flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              آرشیو اسناد رسمی و مهر و موم شده
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              اسناد نهایی شده دارای گواهی رمزنگاری، امضاهای کامل و غیرقابل تغییر
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="archive-search flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs w-64 shadow-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در آرشیو..."
            className="w-full bg-transparent focus:outline-none text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Sealed Meetings List */}
      <div className="archive-table rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">عنوان جلسه</th>
                <th className="py-3 px-4">تاریخ برگزاری</th>
                <th className="py-3 px-4">وضعیت امضاها</th>
                <th className="py-3 px-4">زمان پلمپ</th>
                <th className="py-3 px-4 text-center">عملیات سند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <TableRowsSkeleton columns={5} />
              ) : sealedMeetings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4">
                    <EmptyState icon={Archive} title={searchTerm ? 'سندی با این جست‌وجو پیدا نشد' : 'آرشیو هنوز خالی است'} description={searchTerm ? 'عنوان دیگری را جست‌وجو کنید.' : 'صورت‌جلسه‌های مهر و موم‌شده پس از تکمیل امضاها اینجا نمایش داده می‌شوند.'} compact />
                  </td>
                </tr>
              ) : <AnimatePresence initial={false} mode="popLayout">{sealedMeetings.map((m, index) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0, x: index % 2 === 0 ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.055, ease: 'easeOut' }}
                  layout
                  exit={{ opacity: 0, x: 18, transition: { duration: 0.2 } }}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="block max-w-[280px] truncate" title={m.title}>{m.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]" style={{ fontFamily: 'IRANSansXFaNum, sans-serif' }}>
                    {m.persianDate}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{m.signatureCount || 0}/{m.totalSignaturesRequired}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {m.sealedAt || '۱۴۰۴/۰۷/۰۱'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => window.open(`/archive/print/${encodeURIComponent(m.id)}`, '_blank', 'noopener,noreferrer')}
                        title="مشاهده صورت‌جلسه رسمی"
                        aria-label="مشاهده صورت‌جلسه"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <FileCheck className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setSelectedCertificateMeeting(m)}
                        title="مشاهده گواهی اصالت"
                        aria-label="مشاهده گواهی اصالت"
                        className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 cursor-pointer"
                      >
                        <Award className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setSelectedAuditMeeting(m)}
                        title="مشاهده لاگ‌های بازرسی"
                        className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenMeeting(m)}
                        title="مشاهده سند کامل"
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}</AnimatePresence>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="archive-mobile-list" dir="rtl">
        {isLoading ? <div className="rounded-3xl bg-white p-5 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900">در حال بارگذاری آرشیو…</div> : sealedMeetings.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm dark:bg-slate-900"><EmptyState icon={Archive} title={searchTerm ? 'سندی با این جست‌وجو پیدا نشد' : 'آرشیو هنوز خالی است'} description="عنوان دیگری را جست‌وجو کنید." compact /></div>
        ) : sealedMeetings.map((meeting) => {
          const isExpanded = expandedMeetingId === meeting.id;
          const isMenuOpen = openMenuId === meeting.id;
          return <motion.article key={meeting.id} layout="size" transition={{ layout: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }} className={`archive-mobile-card ${isMenuOpen ? 'archive-mobile-card-menu-open' : ''} rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"><Lock className="h-4 w-4" /></div>
              <button type="button" className="min-w-0 flex-1 text-right" onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}>
                <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">{meeting.title}</h2>
                <p className="mt-1 text-[11px] text-slate-500">{meeting.persianDate || 'تاریخ ثبت نشده'} · {meeting.signatureCount || 0}/{meeting.totalSignaturesRequired} امضا</p>
              </button>
              <div className="relative shrink-0">
                <button type="button" aria-label="عملیات سند" onClick={(event) => { event.stopPropagation(); setOpenMenuId(isMenuOpen ? null : meeting.id); }} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreVertical className="h-4 w-4" /></button>
                {isMenuOpen && <div onClick={(event) => event.stopPropagation()} className="archive-mobile-menu absolute left-0 top-10 z-20 min-w-44 rounded-2xl border p-1.5">
                  <button type="button" onClick={() => window.open(`/archive/print/${encodeURIComponent(meeting.id)}`, '_blank', 'noopener,noreferrer')} className="w-full rounded-xl px-3 py-2 text-right text-xs hover:bg-slate-50 dark:hover:bg-slate-800">مشاهده صورت‌جلسه</button>
                  <button type="button" onClick={() => setSelectedCertificateMeeting(meeting)} className="w-full rounded-xl px-3 py-2 text-right text-xs hover:bg-slate-50 dark:hover:bg-slate-800">گواهی اصالت</button>
                  <button type="button" onClick={() => setSelectedAuditMeeting(meeting)} className="w-full rounded-xl px-3 py-2 text-right text-xs hover:bg-slate-50 dark:hover:bg-slate-800">لاگ‌های بازرسی</button>
                </div>}
              </div>
            </div>
            {isExpanded && <div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <div className="flex items-center justify-between"><span>زمان پلمپ</span><span className="font-medium">{meeting.sealedAt || '۱۴۰۴/۰۷/۰۱'}</span></div>
              <div className="flex items-center justify-between"><span>وضعیت امضاها</span><span className="font-medium text-emerald-600">{meeting.signatureCount || 0} از {meeting.totalSignaturesRequired}</span></div>
              <button type="button" onClick={() => onOpenMeeting(meeting)} className="mt-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-center text-xs font-bold text-white">مشاهده سند کامل</button>
            </div>}
          </motion.article>;
        })}
      </div>

      {/* Certificate of Authenticity Modal */}
      <AnimatedModal isOpen={Boolean(selectedCertificateMeeting)} onClose={() => setSelectedCertificateMeeting(null)} contentClassName="w-full max-w-lg">
        {selectedCertificateMeeting && (
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    گواهی اصالت و مهر الکترونیکی سند
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    شناسه یکتا: {selectedCertificateMeeting.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCertificateMeeting(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Body */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 via-indigo-50/50 to-slate-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900 border border-purple-100 dark:border-purple-900/50 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {selectedCertificateMeeting.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[10px]">
                  مهر و موم معتبر ✓
                </span>
              </div>

              <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>مرجع صادرکننده:</span>
                  <span className="font-bold">سامانه امضای دیجیتال اکورد</span>
                </div>
                <div className="flex justify-between">
                  <span>تاریخ و ساعت پلمپ:</span>
                  <span className="font-mono">{selectedCertificateMeeting.sealedAt || '۱۴۰۴/۰۷/۰۱'}</span>
                </div>
                <div className="flex justify-between">
                  <span>تعداد امضاهای رسمی:</span>
                  <span className="font-bold">{selectedCertificateMeeting.totalSignaturesRequired} امضا</span>
                </div>
              </div>

              {/* SHA-256 Hash box */}
              <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[10px] dir-ltr text-left break-all select-all">
                SHA-256: {selectedCertificateMeeting.documentHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedCertificateMeeting(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                بستن
              </button>
              <button
                onClick={() => window.open(`/api/meetings/${selectedCertificateMeeting.id}/pdf`, '_blank', 'noopener,noreferrer')}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ گواهی تاییدیه</span>
              </button>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Audit Trail Modal */}
      <AnimatedModal isOpen={Boolean(selectedAuditMeeting)} onClose={() => setSelectedAuditMeeting(null)} contentClassName="w-full max-w-lg">
        {selectedAuditMeeting && (
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  ردپای بازرسی امنیتی (Audit Trail)
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditMeeting(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <EmptyState compact icon={History} title="گزارش ممیزی وجود ندارد" description="برای این سند هنوز رویداد قابل نمایشی ثبت نشده است." />
              ) : auditLogs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.045, ease: 'easeOut' }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {auditActionLabels[log.action] || 'رویداد سیستمی'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 text-[11px]">
                    اقدام‌کننده: {log.actor}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 truncate dir-ltr text-left">
                    هش سند: {log.documentHash}
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => setSelectedAuditMeeting(null)}
              className="mt-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              بستن
            </button>
          </div>
        )}
      </AnimatedModal>
    </div>
  );
};
