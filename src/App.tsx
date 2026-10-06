import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Meeting, CommentItem, Participant, Template, OrganizationRole } from './types';
import { RightSidebar } from './components/RightSidebar';
import { TopBar } from './components/TopBar';
import { MeetingHero } from './components/MeetingHero';
import { SignatureCard } from './components/SignatureCard';
import { LeftSidebar } from './components/LeftSidebar';
import { SignatureModal } from './components/SignatureModal';
import { SealingModal } from './components/SealingModal';
import { ShareModal } from './components/ShareModal';
import { SearchModal } from './components/SearchModal';
import { AddParticipantModal } from './components/AddParticipantModal';
import { MeetingsListView } from './components/MeetingsListView';
import { ArchiveView } from './components/ArchiveView';
import { TemplatesView } from './components/TemplatesView';
import { ContactsView } from './components/ContactsView';
import { SettingsView } from './components/SettingsView';
import { NewMeetingModal } from './components/NewMeetingModal';
import { ReviewModal } from './components/ReviewModal';
import { RoughNotesModal } from './components/RoughNotesModal';
import { AuthModal } from './components/AuthModal';
import { AuthView } from './components/AuthView';
import { NotificationPanel } from './components/NotificationPanel';
import { OrganizationsView } from './components/OrganizationsView';
import { GuestSigningView } from './components/GuestSigningView';
import { LoadingState } from './components/LoadingState';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const guestLink = location.pathname.startsWith('/meeting/')
    ? { meetingId: location.pathname.split('/')[2] || '', token: new URLSearchParams(location.search).get('token') || '' }
    : null;
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('metameet_theme') === 'dark';
    } catch {
      return false;
    }
  });
  type AppTab = 'meetings' | 'archive' | 'templates' | 'contacts' | 'settings' | 'organizations' | 'auth';
  const meetingDetailMatch = location.pathname.match(/^\/meetings\/([^/]+)$/);
  const meetingDetailId = meetingDetailMatch?.[1];
  const currentTab: AppTab = location.pathname.startsWith('/archive')
    ? 'archive'
    : location.pathname.startsWith('/templates')
      ? 'templates'
      : location.pathname.startsWith('/contacts')
        ? 'contacts'
        : location.pathname.startsWith('/settings')
          ? 'settings'
          : location.pathname.startsWith('/organizations')
            ? 'organizations'
            : location.pathname.startsWith('/auth')
              ? 'auth'
              : 'meetings';
  const setCurrentTab = (tab: AppTab) => navigate(tab === 'meetings' ? '/meetings' : `/${tab}`);
  const [viewMode, setViewMode] = useState<'hero' | 'list'>('list');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isMeetingsLoading, setIsMeetingsLoading] = useState(true);
  const [activeMeeting, setActiveMeeting] = useState<Meeting>(null as unknown as Meeting);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Authenticated User State with localStorage persistence
  const [activeUser, setActiveUser] = useState<{
    name: string;
    phoneNumber: string;
    email: string;
    role: OrganizationRole;
    userId?: string;
    organizationId?: string;
    avatar?: string;
    signatureData?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('metameet_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: '',
      phoneNumber: '',
      email: '',
      role: 'Participant' as OrganizationRole,
    };
  });

  // Sync HTML document dark class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('metameet_theme', 'dark');
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('metameet_theme', 'light');
      } catch {}
    }
  }, [isDark]);

  // Modals state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRoughNotesModalOpen, setIsRoughNotesModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasUserSigned, setHasUserSigned] = useState(false);
  const [operationError, setOperationError] = useState('');
  const canCreateMeeting = ['Owner', 'Admin', 'Organizer'].includes(activeUser.role);

  const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const loadOrganizations = async () => {
    const response = await fetchWithTimeout('/api/organizations');
    if (!response.ok) throw new Error('Unable to load organizations');
    const data = await response.json();
    return data.organizations || [];
  };

  const loadMeetings = async () => {
    setIsMeetingsLoading(true);
    try {
      const response = await fetchWithTimeout('/api/meetings');
      if (!response.ok) throw new Error('Unable to load meetings');
      const data = await response.json();
      if (data?.meetings) {
        setMeetings(data.meetings);
        if (data.meetings.length > 0) {
          setActiveMeeting((current) => data.meetings.find((m: Meeting) => m.id === current?.id) || data.meetings[0]);
        }
      }
    } finally {
      setIsMeetingsLoading(false);
    }
  };

  useEffect(() => {
    if (!meetingDetailId || meetings.length === 0) return;
    const routeMeeting = meetings.find((meeting) => meeting.id === meetingDetailId);
    if (routeMeeting) setActiveMeeting(routeMeeting);
  }, [meetingDetailId, meetings]);

  // Keep the signature CTA correct after a refresh or when a notification opens
  // a meeting that the current user has already signed.
  useEffect(() => {
    if (!activeMeeting) return;
    setHasUserSigned(Boolean(activeMeeting.signatures?.some((signature) =>
      signature.signerId === activeUser.userId || signature.signerName === activeUser.name,
    )));
  }, [activeMeeting, activeUser.userId, activeUser.name]);

  useEffect(() => {
    setViewMode(meetingDetailId ? 'hero' : 'list');
  }, [meetingDetailId]);

  // Load authenticated session before loading protected meeting data.
  useEffect(() => {
    if (guestLink?.meetingId && guestLink.token) {
      setIsBootstrapping(false);
      return;
    }

    let cancelled = false;
    const bootstrap = async () => {
      try {
        const response = await fetchWithTimeout('/api/auth/me', {}, 10000);
        const data = await response.json();
        if (cancelled) return;
        if (!data?.user) {
          setIsAuthenticated(false);
          navigate('/auth', { replace: true });
          return;
        }

        setActiveUser((prev) => ({
          ...prev,
          userId: data.user.userId || prev.userId,
          name: data.user.name,
          phoneNumber: data.user.phoneNumber || prev.phoneNumber,
          email: data.user.email,
          role: (data.user.role as OrganizationRole) || prev.role,
          organizationId: data.user.organizationId || prev.organizationId,
          signatureData: data.user.signatureData || prev.signatureData,
        }));
        // Authentication is sufficient to render the shell. Secondary data loads are
        // independent and bounded so one stalled endpoint can never strand the app on
        // the bootstrap screen.
        setIsAuthenticated(true);
        navigate('/meetings');
        setIsBootstrapping(false);
        const results = await Promise.allSettled([loadMeetings(), loadOrganizations()]);
        if (!cancelled && results.some((result) => result.status === 'rejected')) {
          setOperationError('بخشی از اطلاعات بارگذاری نشد. برای تلاش دوباره صفحه را تازه‌سازی کنید.');
          setTimeout(() => setOperationError(''), 5000);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          navigate('/auth', { replace: true });
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [guestLink?.meetingId, guestLink?.token]);

  // Handle meeting state updates
  const handleUpdateMeeting = async (updated: Partial<Meeting>) => {
    const previousMeeting = activeMeeting;
    const newMeeting = { ...activeMeeting, ...updated };
    setActiveMeeting(newMeeting);
    setMeetings((prev) =>
      prev.map((m) => (m.id === newMeeting.id ? newMeeting : m))
    );

    // Sync to backend
    try {
      const response = await fetch(`/api/meetings/${newMeeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updated,
          version: (activeMeeting as Meeting & { version?: number }).version,
        }),
      });
      if (!response.ok) throw new Error('تغییرات جلسه ذخیره نشد.');
    } catch (error) {
      setActiveMeeting(previousMeeting);
      setMeetings((prev) => prev.map((m) => (m.id === previousMeeting.id ? previousMeeting : m)));
      setOperationError(error instanceof Error ? error.message : 'تغییرات جلسه ذخیره نشد.');
      setTimeout(() => setOperationError(''), 3500);
    }
  };

  const applyMeetingLocally = (updated: Partial<Meeting>) => {
    const next = { ...activeMeeting, ...updated };
    setActiveMeeting(next);
    setMeetings((prev) => prev.map((meeting) => meeting.id === next.id ? next : meeting));
  };

  // Add comment
  const handleAddComment = (comment: CommentItem) => {
    handleUpdateMeeting({
      comments: [comment, ...activeMeeting.comments],
    });
  };

  // Add participant
  const handleAddParticipant = (p: Participant) => {
    if (activeMeeting.participants.some((participant) => participant.email.toLowerCase() === p.email.toLowerCase())) {
      setOperationError('This participant is already assigned to the meeting.');
      setTimeout(() => setOperationError(''), 3500);
      return;
    }
    handleUpdateMeeting({
      participants: [...activeMeeting.participants, p],
      totalSignaturesRequired: activeMeeting.totalSignaturesRequired + 1,
    });
  };

  // Formal Review workflow submission
  const handleReviewSubmit = async (
    action: 'approve' | 'request_changes',
    notes?: string,
    section?: string
  ) => {
    try {
      const res = await fetch(`/api/meetings/${activeMeeting.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewerName: activeUser.name,
          notes,
          section,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Review submission failed.');
      if (res.ok) {
        if (action === 'approve') {
          applyMeetingLocally({
            status: 'READY_FOR_SIGNATURE',
            statusLabel: 'آماده امضا',
          });
        } else {
          const newComment: CommentItem = {
            id: `c_${Date.now()}`,
            author: {
              id: 'usr_active',
              name: activeUser.name,
              role: activeUser.role,
              email: activeUser.email,
              avatar: activeUser.avatar,
            },
            text: `[درخواست اصلاح در ${section || 'محتوا'}]: ${notes || 'نیازمند بازنگری'}`,
            timestamp: 'هم‌اکنون',
          };
            applyMeetingLocally({
            status: 'IN_REVIEW',
            statusLabel: 'نیازمند اصلاح',
            comments: [newComment, ...activeMeeting.comments],
          });
        }
      }
    } catch (err) {
      console.warn('Review submission error:', err);
    }
  };

  // Confirm Signature with Server Cryptographic SHA-256
  const handleConfirmSignature = async (signatureDataUrl: string) => {
    const newCount = activeMeeting.signatureCount + 1;
    const isNowAllSigned = newCount >= activeMeeting.totalSignaturesRequired;

    try {
      const res = await fetch('/api/signature/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `${activeMeeting.id}:${activeUser.email}:${crypto.randomUUID()}`,
        },
        body: JSON.stringify({
          meetingId: activeMeeting.id,
          signerName: activeUser.name,
          signerRole: activeUser.role,
          signatureType: 'draw',
          signatureData: signatureDataUrl,
          intentConfirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Signature could not be recorded.');
      if (data?.documentHash) {
        setHasUserSigned(true);
        setActiveUser((previous) => {
          if (previous.signatureData) return previous;
          const updated = { ...previous, signatureData: signatureDataUrl };
          try { localStorage.setItem('metameet_user', JSON.stringify(updated)); } catch {}
          return updated;
        });
        applyMeetingLocally({
          signatureCount: newCount,
          status: isNowAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING',
          statusLabel: isNowAllSigned ? 'آماده امضا' : 'در حال امضا',
          documentHash: data.documentHash,
        });
        await loadMeetings();
        return;
      }
    } catch (err: unknown) {
      setHasUserSigned(false);
      setOperationError(String((err as { message?: unknown }).message || err));
      setTimeout(() => setOperationError(''), 3500);
    }

  };

  // Confirm Seal with Server Cryptographic Lock
  const handleConfirmSeal = async () => {
    try {
      const res = await fetch('/api/meetings/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: activeMeeting.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Document sealing failed.');
      if (data?.documentHash) {
        applyMeetingLocally({
          status: 'SEALED',
          statusLabel: 'مهر و موم شده',
          sealedAt: data.sealedAt,
          documentHash: data.documentHash,
        });
        return;
      }
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Document sealing failed.');
      setTimeout(() => setOperationError(''), 3500);
    }

  };

  // AI Suggestion trigger via server Gemini API
  const handleTriggerAI = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize_and_suggest',
          meetingId: activeMeeting.id,
          meetingTitle: activeMeeting.title,
          text: activeMeeting.discussion,
          agenda: activeMeeting.agenda.map((a) => a.text),
        }),
      });
      const data = await res.json();
      if (data?.data?.summary) {
        handleUpdateMeeting({
          aiSuggestion: {
            summary: data.data.summary,
            applied: false,
          },
        });
      }
    } catch (err) {
      console.warn('AI API fallback:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Print PDF
  const handlePrintPdf = () => {
    if (!activeMeeting) {
      window.print();
      return;
    }
    void fetch(`/api/meetings/${activeMeeting.id}/pdf`)
      .then((response) => response.ok ? response.blob() : Promise.reject(new Error('پیش‌نمایش PDF آماده نشد.')))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      })
      .catch((error) => {
        setOperationError(error instanceof Error ? error.message : 'پیش‌نمایش PDF آماده نشد.');
        setTimeout(() => setOperationError(''), 3500);
      });
  };

  const handleDownloadPdf = async () => {
    if (!activeMeeting) return;
    try {
      const response = await fetch(`/api/meetings/${activeMeeting.id}/pdf`);
      if (!response.ok) throw new Error('دانلود PDF انجام نشد.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${activeMeeting.id}.pdf`; anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'دانلود PDF انجام نشد.');
      setTimeout(() => setOperationError(''), 3500);
    }
  };

  const handleSendPdfToTelegram = async () => {
    if (!activeMeeting) return;
    try {
      const response = await fetch('/api/telegram/send-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId: activeMeeting.id }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || 'ارسال PDF به تلگرام انجام نشد.');
      setOperationError('فایل PDF با موفقیت در تلگرام ارسال شد.');
      setTimeout(() => setOperationError(''), 3500);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'ارسال PDF به تلگرام انجام نشد.');
      setTimeout(() => setOperationError(''), 3500);
    }
  };

  // Create new meeting
  const handleCreateNewMeeting = async (newMeeting: Meeting) => {
    let persistedMeeting = newMeeting;
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMeeting.title,
          persianDate: newMeeting.persianDate,
          timeRange: newMeeting.timeRange,
          location: newMeeting.location,
          description: newMeeting.discussion,
          participantIds: newMeeting.participants.map((participant) => participant.id).filter((id) => id !== newMeeting.organizer.id),
          agenda: newMeeting.agenda,
          decisions: newMeeting.decisions,
          actionItems: newMeeting.actionItems.map((item: any) => ({
            id: item.id,
            task: item.task,
            assigneeId: item.assigneeId || item.assignee?.id || newMeeting.organizer.id,
            assigneeName: item.assigneeName || item.assignee?.name || newMeeting.organizer.name,
            assigneeAvatar: item.assigneeAvatar || item.assignee?.avatar,
            dueDate: item.dueDate || '',
            completed: Boolean(item.completed),
          })),
          contentTemplateId: newMeeting.contentTemplateId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const serverError = typeof data?.error === 'string'
          ? data.error
          : response.status === 403
            ? 'شما در سازمان فعال خود اجازه ایجاد صورت‌جلسه ندارید.'
            : 'ایجاد صورت‌جلسه انجام نشد.';
        throw new Error(serverError);
      }
      const serverMeeting = data.meeting as Partial<Meeting> | undefined;
      persistedMeeting = {
        ...serverMeeting,
        ...newMeeting,
        id: serverMeeting?.id || newMeeting.id,
        // Keep the client shape safe even when an older API record omits nested assignee data.
        actionItems: (serverMeeting?.actionItems || newMeeting.actionItems).map((item: any) => ({
          ...item,
          assignee: item.assignee || newMeeting.participants.find((participant) => participant.id === item.assigneeId) || newMeeting.participants[0] || newMeeting.organizer,
        })),
      };
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'ایجاد جلسه انجام نشد.');
      setTimeout(() => setOperationError(''), 3500);
      return;
    }

    setMeetings((prev) => [persistedMeeting, ...prev]);
    setActiveMeeting(persistedMeeting);
    navigate(`/meetings/${persistedMeeting.id}`);
  };

  // Use Template
  const handleUseTemplate = (template: Template) => {
    const newMeeting: Meeting = {
      id: `meet_${Date.now()}`,
      title: template.title,
      contentTemplateId: template.id,
      persianDate: '۱۵ مهر ۱۴۰۴',
      timeRange: '۱۰:۰۰ - ۱۱:۳۰',
      location: 'اتاق جلسات اصلی',
      status: 'DRAFT',
      statusLabel: 'پیش‌نویس',
      organizer: activeParticipant,
      participants: [activeParticipant],
      agenda: template.agendaDefaults.map((text, idx) => ({
        id: `ag_${idx + 1}`,
        order: idx + 1,
        text,
      })),
      discussion: `این جلسه با محوریت «${template.title}» رسمیت یافت و پیرامون موضوعات توافق‌شده گفتگو انجام گرفت.`,
      aiSuggestion: {
        summary: `پیشنهاد هوش مصنوعی: اهداف کلیدی و مسئولیت‌های ${template.title} تصویب شوند.`,
        applied: false,
      },
      decisions: [],
      actionItems: [],
      comments: [],
      signatureCount: 0,
      totalSignaturesRequired: 3,
    };

    handleCreateNewMeeting(newMeeting);
  };

  const handleLoginSuccess = (user: { name: string; phoneNumber?: string; email?: string; role: OrganizationRole; organizationId?: string }) => {
    const updated = {
      ...activeUser,
      name: user.name,
      phoneNumber: user.phoneNumber || activeUser.phoneNumber,
      email: user.email || '',
      role: user.role,
      organizationId: user.organizationId || activeUser.organizationId,
    };
    setActiveUser(updated);
    setIsAuthenticated(true);
    navigate('/meetings');
    void Promise.allSettled([loadMeetings(), loadOrganizations()]);
    try {
      localStorage.setItem('metameet_user', JSON.stringify(updated));
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    const guestUser = {
      name: 'کاربر مهمان',
      phoneNumber: '',
      email: '',
      role: 'Viewer' as OrganizationRole,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    };
    setActiveUser(guestUser);
    setIsAuthenticated(false);
    setMeetings([]);
    navigate('/auth', { replace: true });
    try {
      localStorage.removeItem('metameet_user');
    } catch {}
  };

  const sealedCount = isAuthenticated
    ? meetings.filter((m) => m.status === 'SEALED' || m.status === 'ARCHIVED').length
    : 0;
  const activeParticipant: Participant = {
    id: 'current-user',
    name: activeUser.name,
    role: activeUser.role,
    email: activeUser.email,
    avatar: activeUser.avatar,
  };

  if (guestLink?.meetingId && guestLink.token) return <GuestSigningView meetingId={guestLink.meetingId} token={guestLink.token} />;
  if (isBootstrapping) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'}`}>
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 px-6 py-4 text-sm shadow-sm">در حال بارگذاری سامانه...</div>
      </div>
    );
  }
  if (!isAuthenticated && currentTab === 'auth') {
    return (
      <main className={`min-h-screen flex items-center justify-center px-4 py-10 ${isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'}`}>
        <AuthView
          onLoginSuccess={(user) => {
            handleLoginSuccess(user);
          }}
          onBackToApp={() => setCurrentTab('meetings')}
        />
      </main>
    );
  }

  return (
    <div
      className={`min-h-screen flex gap-3 p-3 text-slate-800 transition-colors duration-300 font-sans ${
        isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'
      }`}
    >
      {operationError && (
        <div className="fixed top-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {operationError}
        </div>
      )}
      {/* Ambient background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* 
        RIGHT SIDEBAR:
        In standard Persian RTL (<html dir="rtl">), the first flex child is docked at the visual RIGHT edge.
        This provides a full-height, modern enterprise navigation sidebar directly on the right!
      */}
      <div className="no-print shrink-0">
        <RightSidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab as typeof currentTab);
          }}
          isDark={isDark}
          totalMeetingsCount={meetings.length}
          sealedMeetingsCount={sealedCount}
          onOpenNewMeeting={isAuthenticated && canCreateMeeting ? () => setIsNewMeetingModalOpen(true) : undefined}
          currentUser={isAuthenticated ? activeUser : undefined}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Workspace Frame to the left */}
      <div className="flex-1 min-w-0 min-h-0 z-10 overflow-visible">
        {/* Top Header */}
        <div className="no-print">
          <TopBar
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenRoughNotes={isAuthenticated && canCreateMeeting ? () => setIsRoughNotesModalOpen(true) : undefined}
          />
        </div>

        {/* Content View Router */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {currentTab === 'archive' ? (
            <ArchiveView
              meetings={meetings}
              isLoading={isMeetingsLoading}
              onOpenMeeting={(m) => {
                setActiveMeeting(m);
                navigate(`/meetings/${m.id}`);
              }}
              onPrintPdf={handlePrintPdf}
            />
          ) : currentTab === 'templates' ? (
            <TemplatesView onUseTemplate={canCreateMeeting ? handleUseTemplate : () => {
              setOperationError('شما در سازمان فعال خود اجازه ایجاد صورت‌جلسه ندارید.');
              setTimeout(() => setOperationError(''), 3500);
            }} />
          ) : currentTab === 'contacts' ? (
            <ContactsView />
          ) : currentTab === 'organizations' ? (
            <OrganizationsView
              activeOrganizationId={activeUser.organizationId}
              onOrganizationChanged={(user) => {
                setActiveUser((previous) => {
                  const updated = { ...previous, role: (user.role as OrganizationRole) || previous.role, organizationId: user.organizationId };
                  try { localStorage.setItem('metameet_user', JSON.stringify(updated)); } catch {}
                  return updated;
                });
                setMeetings([]);
                void loadMeetings();
              }}
            />
          ) : currentTab === 'settings' ? (
            <SettingsView />
          ) : currentTab === 'auth' ? (
            <AuthView
              onLoginSuccess={(u) => {
                handleLoginSuccess(u);
                setCurrentTab('meetings');
              }}
              onBackToApp={() => setCurrentTab('meetings')}
            />
          ) : isMeetingsLoading ? (
            <LoadingState label="در حال بارگذاری صورت‌جلسه‌ها…" />
          ) : meetings.length === 0 ? (
            <div className="min-h-[60vh] flex items-center justify-center text-center">
              <div className="max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">هنوز صورت‌جلسه‌ای ثبت نشده است</h2>
                <p className="mt-2 text-sm text-slate-500">برای شروع، یک جلسه جدید ایجاد کنید یا یادداشت‌های خام را به صورت‌جلسه تبدیل کنید.</p>
                {isAuthenticated && canCreateMeeting && <button onClick={() => setIsNewMeetingModalOpen(true)} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">ایجاد جلسه جدید</button>}
              </div>
            </div>
          ) : viewMode === 'list' || !activeMeeting ? (
            <MeetingsListView
              meetings={meetings}
              isLoading={isMeetingsLoading}
              onSelectMeeting={(m) => {
                setActiveMeeting(m);
                navigate(`/meetings/${m.id}`);
              }}
              onOpenNewMeetingModal={() => {
                if (canCreateMeeting) setIsNewMeetingModalOpen(true);
                else {
                  setOperationError('شما در سازمان فعال خود اجازه ایجاد صورت‌جلسه ندارید.');
                  setTimeout(() => setOperationError(''), 3500);
                }
              }}
            />
          ) : (
            /* Primary Hero Meeting View */
            <div className="flex items-start justify-center gap-6 pt-4">
              {/* Left Panel: Status Stepper, Notes & Comments */}
              <div className="no-print">
                <LeftSidebar
                  meeting={activeMeeting}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  onOpenAddParticipant={() => setIsAddParticipantModalOpen(true)}
                  onAddComment={handleAddComment}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                  onStatusChange={(newStatus) =>
                    handleUpdateMeeting({
                      status: newStatus,
                      statusLabel:
                        newStatus === 'DRAFT'
                          ? 'پیش‌نویس'
                          : newStatus === 'IN_REVIEW'
                          ? 'در حال بررسی'
                          : newStatus === 'READY_FOR_SIGNATURE'
                          ? 'آماده امضا'
                          : 'مهر و موم شده',
                    })
                  }
                />
              </div>

              {/* Central Document Hero Canvas with Real Functional Editor */}
              <MeetingHero
                meeting={activeMeeting}
                onUpdateMeeting={handleUpdateMeeting}
                onBackToList={() => navigate('/meetings')}
                onTriggerAI={handleTriggerAI}
                isAiLoading={isAiLoading}
                onPrintPdf={handlePrintPdf}
                onDownloadPdf={handleDownloadPdf}
                onSendTelegram={handleSendPdfToTelegram}
              />

              {/* Floating Digital Signature Card on Right of Canvas */}
              <div className="no-print">
                <SignatureCard
                  meeting={activeMeeting}
                  onOpenSignModal={() => setIsSignModalOpen(true)}
                  onOpenSealModal={() => setIsSealModalOpen(true)}
                  hasUserSigned={hasUserSigned}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Dialogs */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        meeting={activeMeeting}
        onConfirmSignature={handleConfirmSignature}
        currentUser={activeUser}
      />

      <SealingModal
        isOpen={isSealModalOpen}
        onClose={() => setIsSealModalOpen(false)}
        meeting={activeMeeting}
        onConfirmSeal={handleConfirmSeal}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        meeting={activeMeeting}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        meetings={meetings}
        isLoading={isMeetingsLoading}
        onSelectMeeting={(m) => {
          setActiveMeeting(m);
          navigate(`/meetings/${m.id}`);
        }}
      />

      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <AddParticipantModal
        isOpen={isAddParticipantModalOpen}
        onClose={() => setIsAddParticipantModalOpen(false)}
        onAddParticipant={handleAddParticipant}
        existingParticipants={activeMeeting?.participants || []}
      />

      <NewMeetingModal
        isOpen={isNewMeetingModalOpen}
        onClose={() => setIsNewMeetingModalOpen(false)}
        onCreateMeeting={handleCreateNewMeeting}
        organizer={activeParticipant}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        meeting={activeMeeting}
        onReviewSubmit={handleReviewSubmit}
      />

      <RoughNotesModal
        isOpen={isRoughNotesModalOpen}
        onClose={() => setIsRoughNotesModalOpen(false)}
        onMeetingCreated={handleCreateNewMeeting}
        organizer={activeParticipant}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentRole={activeUser.role}
        onRoleChange={(role) => {
          setActiveUser((prev) => ({ ...prev, role }));
        }}
        currentUserName={activeUser.name}
        currentUserEmail={activeUser.phoneNumber}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}
