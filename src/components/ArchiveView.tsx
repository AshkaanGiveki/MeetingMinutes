import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  ShieldCheck,
  FileCheck,
  Printer,
  History,
  Lock,
  ArrowLeft,
  Calendar,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Meeting, AuditRecord } from '../types';
import { sampleAuditLogs } from '../data/mockData';

interface ArchiveViewProps {
  meetings: Meeting[];
  onOpenMeeting: (m: Meeting) => void;
  onPrintPdf: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  meetings,
  onOpenMeeting,
  onPrintPdf,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAuditMeeting, setSelectedAuditMeeting] = useState<Meeting | null>(null);

  const sealedAndArchived = meetings.filter(
    (m) =>
      (m.status === 'SEALED' || m.status === 'ARCHIVED' || m.id === 'meet-1') &&
      m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 max-w-5xl mx-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              آرشیو صورت‌جلسات مهر و موم شده
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              مستندات بایگانی‌شده، گواهی‌های امضای دیجیتال و لاگ‌های بازرسی
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در آرشیو اسناد..."
            className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table of Sealed Documents */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">عنوان صورت‌جلسه</th>
                <th className="py-3 px-4">تاریخ برگزاری</th>
                <th className="py-3 px-4">امضاها</th>
                <th className="py-3 px-4">وضعیت سند</th>
                <th className="py-3 px-4">هش یکپارچگی (SHA-256)</th>
                <th className="py-3 px-4 text-center">اقدامات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sealedAndArchived.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-indigo-500" />
                      <span>{m.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {m.persianDate}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {m.signatureCount} از {m.totalSignaturesRequired} امضا
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>مهر و موم قطعی</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 dir-ltr text-left">
                    {m.documentHash ? `${m.documentHash.slice(0, 16)}...` : '8d234199...'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onOpenMeeting(m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="مشاهده سند"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedAuditMeeting(m)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="مشاهده ردپای بازرسی (Audit Trail)"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={onPrintPdf}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="خروجی PDF"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Modal */}
      {selectedAuditMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-white/80 dark:border-slate-800 p-6 flex flex-col gap-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    ردپای بازرسی امنیتی (Audit Trail)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    رویدادهای ثبت‌شده تغییرناپذیر برای: {selectedAuditMeeting.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditMeeting(null)}
                className="py-1 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                بستن
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {sampleAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{log.action}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    کنشگر / اقدام‌کننده: <strong>{log.actor}</strong>
                  </div>
                  <div className="font-mono text-[9px] text-slate-400 dir-ltr text-left truncate pt-0.5">
                    Hash: {log.documentHash}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
