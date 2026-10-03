import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import { Meeting, AuditRecord } from '../types';
import { sampleAuditLogs } from '../data/mockData';

interface ArchiveViewProps {
  meetings: Meeting[];
  onOpenMeeting: (meeting: Meeting) => void;
  onPrintPdf: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  meetings,
  onOpenMeeting,
  onPrintPdf,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditMeeting, setSelectedAuditMeeting] = useState<Meeting | null>(null);
  const [selectedCertificateMeeting, setSelectedCertificateMeeting] = useState<Meeting | null>(null);

  const sealedMeetings = meetings.filter(
    (m) =>
      m.status === 'SEALED' ||
      m.status === 'ARCHIVED' ||
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 max-w-6xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs w-64 shadow-xs">
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
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">عنوان جلسه</th>
                <th className="py-3 px-4">تاریخ برگزاری</th>
                <th className="py-3 px-4">وضعیت امضاها</th>
                <th className="py-3 px-4">هش رمزنگاری SHA-256</th>
                <th className="py-3 px-4">زمان پلمپ</th>
                <th className="py-3 px-4 text-center">عملیات سند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sealedMeetings.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{m.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {m.persianDate}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{m.totalSignaturesRequired} از {m.totalSignaturesRequired} امضا</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[10px] dir-ltr text-left truncate max-w-[140px]">
                    {m.documentHash || 'a7f9b8c2...e1d3'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {m.sealedAt || '۱۴۰۴/۰۷/۰۱'}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedCertificateMeeting(m)}
                        title="مشاهده گواهی اصالت"
                        className="py-1 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Award className="w-3 h-3" />
                        <span>گواهی اصالت</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate of Authenticity Modal */}
      {selectedCertificateMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
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
                  <span className="font-bold">سامانه ملی امضای دیجیتال MetaMeet</span>
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
                onClick={onPrintPdf}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-98"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ گواهی تاییدیه</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {selectedAuditMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
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
              {sampleAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {log.action}
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
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedAuditMeeting(null)}
              className="mt-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
