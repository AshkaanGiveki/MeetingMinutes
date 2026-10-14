import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Meeting, CommentItem, Participant, Template, OrganizationRole, MeetingRole } from './types';
import { RightSidebar } from './components/RightSidebar';
import { TopBar } from './components/TopBar';
import { MeetingHero } from './components/MeetingHero';
import { LeftSidebar } from './components/LeftSidebar';
import { MeetingParticipantsCard } from './components/MeetingParticipantsCard';
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
import { MeetingWorkspace, getMeetingWorkspaceStage } from './components/MeetingWorkspace';
import { AuthModal } from './components/AuthModal';
import { AuthView } from './components/AuthView';
import { NotificationPanel } from './components/NotificationPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OrganizationsView } from './components/OrganizationsView';
import { GuestSigningView } from './components/GuestSigningView';
import { InvitationView } from './components/InvitationView';
import { OrganizationOnboarding } from './components/OrganizationOnboarding';
import { MeetingListSkeleton, MeetingWorkspaceSkeleton } from './components/LoadingState';
import { useSnackbar } from './components/Snackbar';
import { SigningRejectionModal } from './components/SigningRejectionModal';
import { SigningRejectionDecisionModal } from './components/SigningRejectionDecisionModal';
import { ArchivedMinuteDocument } from './components/ArchivedMinuteDocument';

const hasMeetingRole = (participant: Participant, role: string) => (participant.roles || [participant.role]).includes(role as any);
const meetingRoleLabels: Record<string, string> = { Editor: 'ویرایشگر', Reviewer: 'بازبین', Signer: 'امضاکننده' };

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const guestLink = location.pathname.startsWith('/meeting/')
    ? { meetingId: location.pathname.split('/')[2] || '', token: new URLSearchParams(location.search).get('token') || '' }
    : null;
  const invitePathMatch = location.pathname.match(/^\/invite\/([^/]+)$/);
  const inviteToken = invitePathMatch?.[1] || new URLSearchParams(location.search).get('invite') || undefined;
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('metameet_theme') === 'dark';
    } catch {
      return false;
    }
  });
  type AppTab = 'meetings' | 'archive' | 'templates' | 'contacts' | 'settings' | 'organizations' | 'auth' | 'invitation';
  const meetingDetailMatch = location.pathname.match(/^\/meetings\/([^/]+)$/);
  const meetingDetailId = meetingDetailMatch?.[1];
  const archivePrintMatch = location.pathname.match(/^\/archive\/print\/([^/]+)$/);
  const archivePrintMeetingId = archivePrintMatch?.[1];
  const currentTab: AppTab = location.pathname.startsWith('/invite/')
    ? 'invitation'
    : location.pathname.startsWith('/archive')
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
  const meetingsLoadSequenceRef = useRef(0);
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
    role: 'User' as OrganizationRole,
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
  const [isSigningRejectionModalOpen, setIsSigningRejectionModalOpen] = useState(false);
  const [isSigningDecisionModalOpen, setIsSigningDecisionModalOpen] = useState(false);
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRoughNotesModalOpen, setIsRoughNotesModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotificationCount(0);
      return;
    }
    let isActive = true;
    const loadUnreadNotificationCount = async () => {
      try {
        const response = await fetch('/api/notifications?unreadOnly=true');
        if (!response.ok) return;
        const data = await response.json();
        if (isActive) setUnreadNotificationCount(Number(data.unreadCount ?? data.notifications?.length ?? 0));
      } catch {
        // Notification count is non-critical and will retry on the next poll.
      }
    };
    void loadUnreadNotificationCount();
    const interval = window.setInterval(loadUnreadNotificationCount, 30000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, activeUser.organizationId]);
  const [hasUserSigned, setHasUserSigned] = useState(false);
  const setOperationError = (message: string) => {
    if (!message) return;
    const isSuccess = message.includes('موفقیت') || message.includes('ارسال شد');
    const isWarning = message.includes('اجازه') || message.includes('بارگذاری نشد');
    showSnackbar({ type: isSuccess ? 'success' : isWarning ? 'warning' : 'error', message });
  };
  const meetingUpdateSequenceRef = useRef(0);
  const canCreateMeeting = ['Owner', 'Admin', 'User'].includes(activeUser.role);
  const canManageActiveMeeting = Boolean(activeMeeting && (['Owner', 'Admin'].includes(activeUser.role) || activeMeeting.organizer.id === activeUser.userId || activeMeeting.participants.some((participant) => participant.id === activeUser.userId && (hasMeetingRole(participant, 'Organizer') || hasMeetingRole(participant, 'Editor')))));
  const canEditActiveMeeting = Boolean(activeMeeting && activeMeeting.status === 'DRAFT' && activeMeeting.signatureRejection?.status !== 'pending' && (activeMeeting.organizer.id === activeUser.userId || activeMeeting.participants.some((participant) => participant.id === activeUser.userId && hasMeetingRole(participant, 'Editor'))));
  const canReviewActiveMeeting = Boolean(activeMeeting && activeMeeting.participants.some((participant) => (participant.id === activeUser.userId || participant.email === activeUser.email) && hasMeetingRole(participant, 'Reviewer')));
  const canSignActiveMeeting = Boolean(activeMeeting && activeUser.signatureData && !(
    activeMeeting.signatureRejection?.status === 'pending' && activeMeeting.signatureRejection.signerId === activeUser.userId
  ) && activeMeeting.participants.some((participant) => (participant.id === activeUser.userId || participant.email === activeUser.email) && hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false && !participant.hasSigned));

  const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const loadMeetings = async () => {
    const requestSequence = ++meetingsLoadSequenceRef.current;
    setIsMeetingsLoading(true);
    try {
      // MongoDB Atlas can take several seconds to wake from an idle connection.
      // Keep the loading state alive long enough for the authenticated request
      // to complete instead of replacing a valid organization list with empty data.
      const response = await fetchWithTimeout('/api/meetings', {}, 30000);
      if (!response.ok) throw new Error('Unable to load meetings');
      const data = await response.json();
      if (requestSequence !== meetingsLoadSequenceRef.current) return;
      if (Array.isArray(data?.meetings)) {
        setMeetings(data.meetings);
        if (data.meetings.length > 0) {
          setActiveMeeting((current) => data.meetings.find((m: Meeting) => m.id === current?.id) || data.meetings[0]);
        } else {
          setActiveMeeting(null as unknown as Meeting);
        }
      }
    } catch (error) {
      if (requestSequence !== meetingsLoadSequenceRef.current) return;
      showSnackbar({
        type: 'error',
        message: error instanceof Error ? error.message : 'بارگذاری صورت‌جلسه‌های سازمان انجام نشد.',
      });
    } finally {
      if (requestSequence === meetingsLoadSequenceRef.current) setIsMeetingsLoading(false);
    }
  };

  useEffect(() => {
    if (!meetingDetailId || meetings.length === 0) return;
    const routeMeeting = meetings.find((meeting) => meeting.id === meetingDetailId);
    if (routeMeeting) setActiveMeeting(routeMeeting);
  }, [meetingDetailId, meetings]);

  useEffect(() => {
    if (!meetingDetailId || !activeUser.userId) return;
    const key = `metameet:last-opened:${activeUser.userId || activeUser.email}`;
    try {
      const previous = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, number>;
      localStorage.setItem(key, JSON.stringify({ ...previous, [meetingDetailId]: Date.now() }));
    } catch {}
  }, [meetingDetailId, activeUser.userId, activeUser.email]);

  // Keep the signature CTA correct after a refresh or when a notification opens
  // a meeting that the current user has already signed.
  useEffect(() => {
    if (!activeMeeting) return;
    const signedByRecord = activeMeeting.signatures?.some((signature) =>
      signature.signerId === activeUser.userId || signature.signerName === activeUser.name,
    );
    const signedByParticipant = activeMeeting.participants.some((participant) =>
      (participant.id === activeUser.userId || participant.email === activeUser.email) && participant.hasSigned,
    );
    setHasUserSigned(Boolean(signedByRecord || signedByParticipant));
  }, [activeMeeting, activeUser.userId, activeUser.name, activeUser.email]);

  useEffect(() => {
    if (activeMeeting?.signatureRejection?.status === 'pending' && activeMeeting.participants.some((participant) => participant.id === activeUser.userId && hasMeetingRole(participant, 'Editor'))) {
      setIsSigningDecisionModalOpen(true);
    }
  }, [activeMeeting?.signatureRejection?.id, activeMeeting?.signatureRejection?.status, activeUser.userId]);

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
          avatar: data.user.avatar || prev.avatar,
          phoneNumber: data.user.phoneNumber || prev.phoneNumber,
          email: data.user.email,
          role: (data.user.role as OrganizationRole) || prev.role,
          organizationId: data.user.organizationId || undefined,
          signatureData: data.user.signatureData || prev.signatureData,
        }));
        // Authentication is sufficient to render the shell. Secondary data loads are
        // independent and bounded so one stalled endpoint can never strand the app on
        // the bootstrap screen.
        setIsAuthenticated(true);
        if ((location.pathname === '/' || location.pathname === '/auth') && data.user.organizationId) {
          navigate('/meetings', { replace: true });
        }
        setIsBootstrapping(false);
        const results = await Promise.allSettled([loadMeetings()]);
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
    if (!canEditActiveMeeting) {
      showSnackbar({ type: 'warning', message: 'ویرایش این صورت‌جلسه فقط در مرحله ثبت و پس از پذیرش درخواست اصلاح امکان‌پذیر است.' });
      return;
    }
    const previousMeeting = activeMeeting;
    const newMeeting = { ...activeMeeting, ...updated };
    const updateSequence = ++meetingUpdateSequenceRef.current;
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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'تغییرات جلسه ذخیره نشد.');
      // A slower response from an older edit must never affect newer local state.
      if (updateSequence !== meetingUpdateSequenceRef.current) return;
      if (data?.meeting) {
        setActiveMeeting(data.meeting);
        setMeetings((prev) => prev.map((m) => (m.id === data.meeting.id ? data.meeting : m)));
      }
    } catch (error) {
      if (updateSequence !== meetingUpdateSequenceRef.current) return;
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

  const handleMeetingStatusChange = (newStatus: Meeting['status']) => {
    if (newStatus === 'IN_REVIEW' && !activeMeeting.discussion.trim()) {
      showSnackbar({ type: 'warning', message: 'برای ارسال جلسه به بازبینی، ابتدا متن جلسه را ثبت کنید.' });
      return;
    }
    if (newStatus === 'IN_REVIEW') {
      const missingRoles = (['Editor', 'Reviewer', 'Signer'] as const).filter((role) => !activeMeeting.participants.some((participant) => hasMeetingRole(participant, role)));
      if (missingRoles.length > 0) {
        showSnackbar({ type: 'warning', message: `برای ارسال صورت‌جلسه به بازبینی، حداقل یک ${missingRoles.map((role) => meetingRoleLabels[role]).join('، ')} تعیین کنید.` });
        return;
      }
    }
    void handleUpdateMeeting({
      status: newStatus,
      statusLabel:
        newStatus === 'DRAFT'
          ? 'پیش‌نویس'
          : newStatus === 'IN_REVIEW'
          ? 'در حال بررسی'
          : newStatus === 'READY_FOR_SIGNATURE'
          ? 'آماده امضا'
          : 'مهر و موم شده',
    });
  };

  // Add comment
  const handleAddComment = (comment: CommentItem) => {
    handleUpdateMeeting({
      comments: [comment, ...activeMeeting.comments],
    });
  };

  // Add participant
  const handleAddParticipant = (p: Participant) => {
    if (activeMeeting.participants.some((participant) => participant.id === p.id || (p.email && participant.email && participant.email.toLowerCase() === p.email.toLowerCase()))) {
      setOperationError('This participant is already assigned to the meeting.');
      setTimeout(() => setOperationError(''), 3500);
      return;
    }
    const participants = [...activeMeeting.participants, p];
    const totalSignaturesRequired = participants.filter((participant) => hasMeetingRole(participant, 'Signer') && participant.requiresSignature !== false).length;
    const updated = { ...activeMeeting, participants, totalSignaturesRequired };
    setActiveMeeting(updated);
    setMeetings((current) => current.map((meeting) => meeting.id === updated.id ? updated : meeting));
  };

  const handleUpdateParticipantRole = (participant: Participant) => {
    if (activeMeeting.organizer.id === participant.id) {
      const updatedOrganizer = {
        ...activeMeeting.organizer,
        ...participant,
        role: 'Organizer',
        roles: (participant.roles?.includes('Organizer') ? participant.roles : ['Organizer', ...(participant.roles || [])]) as MeetingRole[],
      };
      const updated = { ...activeMeeting, organizer: updatedOrganizer };
      setActiveMeeting(updated);
      setMeetings((current) => current.map((meeting) => meeting.id === updated.id ? updated : meeting));
      return;
    }
    const participants = activeMeeting.participants.map((item) => item.id === participant.id ? participant : item);
    const updated = {
      ...activeMeeting,
      participants,
      totalSignaturesRequired: participants.filter((item) => hasMeetingRole(item, 'Signer') && item.requiresSignature !== false).length,
    };
    setActiveMeeting(updated);
    setMeetings((current) => current.map((meeting) => meeting.id === updated.id ? updated : meeting));
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
      showSnackbar({ type: 'error', message: err instanceof Error ? err.message : 'Review submission failed.' });
    }
  };

  // Confirm Signature with Server Cryptographic SHA-256
  const handleConfirmSignature = async (signatureDataUrl: string) => {
    if (!activeUser.signatureData) {
      setCurrentTab('settings');
      showSnackbar({ type: 'warning', message: 'ابتدا امضای خود را در تنظیمات حساب کاربری ثبت کنید.' });
      return;
    }
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
        if (data.meeting) {
          applyMeetingLocally(data.meeting);
        } else {
          applyMeetingLocally({
            participants: activeMeeting.participants.map((participant) => (participant.id === activeUser.userId || participant.email === activeUser.email)
              ? { ...participant, hasSigned: true, statusText: 'امضا دریافت شد' }
              : participant),
            signatureCount: newCount,
            status: isNowAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING',
            statusLabel: isNowAllSigned ? 'آماده امضا' : 'در حال امضا',
            documentHash: data.documentHash,
          });
        }
        await loadMeetings();
        return;
      }
    } catch (err: unknown) {
      setHasUserSigned(false);
      setOperationError(String((err as { message?: unknown }).message || err));
      setTimeout(() => setOperationError(''), 3500);
    }

  };

  const handleSigningRejection = async (reason: string) => {
    try {
      const response = await fetch(`/api/meetings/${activeMeeting.id}/signature-rejection`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'ثبت مخالفت با امضا انجام نشد.');
      if (data.meeting) applyMeetingLocally(data.meeting);
      showSnackbar({ type: 'info', message: 'دلیل عدم امضا برای ویرایشگر ارسال شد.' });
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'ثبت مخالفت با امضا انجام نشد.' }); }
  };

  const handleSigningRejectionResponse = async (action: 'accept_change' | 'reject_change', responseNote: string) => {
    try {
      const response = await fetch(`/api/meetings/${activeMeeting.id}/signature-rejection/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, response: responseNote }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'پاسخ به درخواست اصلاح انجام نشد.');
      if (data.meeting) applyMeetingLocally(data.meeting);
      showSnackbar({ type: 'success', message: action === 'accept_change' ? 'درخواست اصلاح پذیرفته شد و امضاهای قبلی لغو شدند.' : 'درخواست اصلاح رد شد و فرایند امضا ادامه پیدا کرد.' });
    } catch (error) { showSnackbar({ type: 'error', message: error instanceof Error ? error.message : 'پاسخ به درخواست اصلاح انجام نشد.' }); }
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
      showSnackbar({ type: 'warning', message: 'پیشنهاد هوش مصنوعی در دسترس نیست. می‌توانید متن را به‌صورت دستی ادامه دهید.' });
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
      const response = await fetch('/api/telegram/send-pm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId: activeMeeting.id }) });
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
      const response = await fetchWithTimeout('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationMinuteId: newMeeting.organizationMinuteId,
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
      }, 30000);
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
        ...newMeeting,
        ...serverMeeting,
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
      totalSignaturesRequired: 1,
    };

    handleCreateNewMeeting(newMeeting);
  };

  const handleLoginSuccess = (user: { name: string; phoneNumber?: string; email?: string; role: OrganizationRole; organizationId?: string; avatar?: string }) => {
    const updated = {
      ...activeUser,
      name: user.name,
      phoneNumber: user.phoneNumber || activeUser.phoneNumber,
      email: user.email || '',
      avatar: user.avatar || activeUser.avatar,
      role: user.role,
      organizationId: user.organizationId || undefined,
    };
    setActiveUser(updated);
    setIsAuthenticated(true);
    navigate('/meetings');
    void Promise.allSettled([loadMeetings()]);
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
      role: 'User' as OrganizationRole,
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
    role: 'Organizer',
    email: activeUser.email,
    avatar: activeUser.avatar,
  };

  if (guestLink?.meetingId && guestLink.token) return <GuestSigningView meetingId={guestLink.meetingId} token={guestLink.token} />;
  if (isBootstrapping) {
    // Keep the refresh transition quiet. The full application shell should not
    // be replaced by a separate skeleton page with its own background.
    return null;
  }
  if (archivePrintMeetingId) {
    const printMeeting = meetings.find((meeting) => meeting.id === decodeURIComponent(archivePrintMeetingId));
    if (printMeeting) {
      return (
        <ArchivedMinuteDocument
          meeting={printMeeting}
          onClose={() => {
            if (window.opener) window.close();
            else navigate('/archive');
          }}
          onPrintPdf={() => {
            const pdfWindow = window.open('', '_blank');
            void fetch(`/api/meetings/${printMeeting.id}/html-pdf`)
              .then((response) => response.ok ? response.blob() : Promise.reject(new Error('PDF آماده نشد.')))
              .then((blob) => {
                const url = URL.createObjectURL(blob);
                if (pdfWindow) pdfWindow.location.href = url;
                else window.open(url, '_blank', 'noopener,noreferrer');
                window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
              })
              .catch((error) => {
                const message = error instanceof Error ? error.message : 'PDF آماده نشد.';
                if (pdfWindow) {
                  pdfWindow.document.title = 'خطا در تولید PDF';
                  pdfWindow.document.body.innerHTML = `<main style="font-family:Tahoma,Arial,sans-serif;padding:32px;direction:rtl"><h2>تولید PDF انجام نشد</h2><p>${message}</p><p>لطفاً سرور محلی را یک‌بار راه‌اندازی مجدد کنید.</p></main>`;
                }
              });
          }}
        />
      );
    }
    if (!isMeetingsLoading) return <main className="min-h-screen flex items-center justify-center text-slate-600">سند بایگانی‌شده پیدا نشد.</main>;
  }
  if (!isAuthenticated && (currentTab === 'auth' || currentTab === 'invitation')) {
    return (
      <main className={`h-[100dvh] max-h-[100dvh] overflow-hidden flex items-center justify-center p-0 ${isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'}`}>
        <AuthView
          inviteToken={inviteToken}
          onLoginSuccess={(user) => {
            handleLoginSuccess(user);
          }}
          onBackToApp={() => setCurrentTab('meetings')}
          />
        </main>
      );
  }

  if (isAuthenticated && currentTab === 'invitation' && inviteToken) {
    return <InvitationView token={inviteToken} onAccepted={(user) => {
      if (user?.organizationId) setActiveUser((previous) => ({ ...previous, organizationId: user.organizationId, role: (user.role as OrganizationRole) || previous.role }));
      void loadMeetings();
    }} />;
  }

  if (isAuthenticated && !activeUser.organizationId) {
    return (
      <OrganizationOnboarding
        name={activeUser.name}
        onOrganizationReady={(user) => {
          const updated = { ...activeUser, organizationId: user.organizationId, role: (user.role as OrganizationRole) || activeUser.role };
          setActiveUser(updated);
          try { localStorage.setItem('metameet_user', JSON.stringify(updated)); } catch {}
          setMeetings([]);
          navigate('/meetings', { replace: true });
          void loadMeetings();
        }}
      />
    );
  }

  return (
    <div
      className={`app-shell h-screen flex gap-3 overflow-hidden p-3 text-slate-800 transition-colors duration-300 font-sans ${
        isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'
      }`}
    >
      {/* Ambient background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* 
        RIGHT SIDEBAR:
        In standard Persian RTL (<html dir="rtl">), the first flex child is docked at the visual RIGHT edge.
        This provides a full-height, modern enterprise navigation sidebar directly on the right!
      */}
      <div className="no-print hidden shrink-0 lg:block">
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
      <div className="app-workspace z-10 flex h-[calc(100vh-1.5rem)] min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <div className="no-print shrink-0">
          <TopBar
            currentTab={currentTab}
            onTabChange={(tab) => setCurrentTab(tab as typeof currentTab)}
            meetingDetail={meetingDetailId ? { id: meetingDetailId, title: activeMeeting?.title } : undefined}
            onOpenMeeting={(meetingId) => navigate(`/meetings/${meetingId}`)}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            unreadCount={unreadNotificationCount}
            onOpenRoughNotes={isAuthenticated && canCreateMeeting ? () => setIsRoughNotesModalOpen(true) : undefined}
            onLogout={isAuthenticated ? handleLogout : undefined}
          />
        </div>

        {/* Content View Router */}
        <div className="app-content mt-3 min-h-0 flex-1 overflow-y-auto px-4 pb-28 sm:px-6 lg:pb-6">
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${location.pathname}:${currentTab}:${meetingDetailId || ''}`}
            initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="app-page min-h-full"
          >
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
            <TemplatesView isAuthenticated={isAuthenticated} organizationId={activeUser.organizationId} onUseTemplate={canCreateMeeting ? handleUseTemplate : () => {
              setOperationError('شما در سازمان فعال خود اجازه ایجاد صورت‌جلسه ندارید.');
              setTimeout(() => setOperationError(''), 3500);
            }} />
          ) : currentTab === 'contacts' ? (
            <ContactsView isAuthenticated={isAuthenticated} organizationId={activeUser.organizationId} canManageMembers={['Owner', 'Admin'].includes(activeUser.role)} />
          ) : currentTab === 'organizations' ? (
            <OrganizationsView
              isAuthenticated={isAuthenticated}
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
            <SettingsView
              onAvatarChanged={(avatar) => setActiveUser((previous) => {
                const updated = { ...previous, avatar };
                try { localStorage.setItem('metameet_user', JSON.stringify(updated)); } catch {}
                return updated;
              })}
              onSignatureChanged={(signatureData) => setActiveUser((previous) => {
                const updated = { ...previous, signatureData };
                try { localStorage.setItem('metameet_user', JSON.stringify(updated)); } catch {}
                return updated;
              })}
            />
          ) : currentTab === 'auth' ? (
            <AuthView
              inviteToken={inviteToken}
              onLoginSuccess={(u) => {
                handleLoginSuccess(u);
                setCurrentTab('meetings');
              }}
              onBackToApp={() => setCurrentTab('meetings')}
            />
          ) : isMeetingsLoading ? (
            meetingDetailId ? <MeetingWorkspaceSkeleton /> : <MeetingListSkeleton />
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
              userId={activeUser.userId || activeUser.email}
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
            <MeetingWorkspace
              meeting={activeMeeting}
              stage={getMeetingWorkspaceStage(activeMeeting)}
              onBack={() => navigate('/meetings')}
              onOpenReview={() => setIsReviewModalOpen(true)}
              onOpenSign={() => { if (['READY_FOR_SIGNATURE', 'SIGNING'].includes(activeMeeting.status)) setIsSignModalOpen(true); }}
              onStatusChange={handleMeetingStatusChange}
              canReview={canReviewActiveMeeting}
              canSign={canSignActiveMeeting}
              hasUserSigned={hasUserSigned}
              canEdit={canEditActiveMeeting}
            >
            <MeetingParticipantsCard
              meeting={activeMeeting}
              onOpenAddParticipant={() => setIsAddParticipantModalOpen(true)}
              canManageMeeting={canManageActiveMeeting}
            />
            <div className="meeting-main-meeting-layout flex flex-col items-stretch gap-6 pt-4 xl:flex-row xl:items-start">
              {/* Right context rail: workflow, participants, notes and signing */}
              <div className="no-print order-2 w-full shrink-0 xl:order-1 xl:w-[20rem]">
                <LeftSidebar
                  meeting={activeMeeting}
                  onOpenAddParticipant={() => setIsAddParticipantModalOpen(true)}
                  onAddComment={handleAddComment}
                  onOpenReviewModal={() => setIsReviewModalOpen(true)}
                  onStatusChange={handleMeetingStatusChange}
                  onOpenSignModal={() => { if (['READY_FOR_SIGNATURE', 'SIGNING'].includes(activeMeeting.status)) setIsSignModalOpen(true); }}
                  onOpenSealModal={() => setIsSealModalOpen(true)}
                  hasUserSigned={hasUserSigned}
                  onRejectSigning={() => setIsSigningRejectionModalOpen(true)}
                  onOpenSigningDecision={() => setIsSigningDecisionModalOpen(true)}
                  canManageMeeting={canManageActiveMeeting}
                  canEditMeeting={canEditActiveMeeting}
                  canReviewMeeting={canReviewActiveMeeting}
                  canSignMeeting={canSignActiveMeeting}
                />
              </div>

              {/* Main document canvas */}
              <div className="order-1 min-w-0 flex-1 xl:order-2">
                <MeetingHero
                  meeting={activeMeeting}
                  workspaceStage={getMeetingWorkspaceStage(activeMeeting)}
                  onUpdateMeeting={handleUpdateMeeting}
                  canEdit={canEditActiveMeeting}
                  onBackToList={() => navigate('/meetings')}
                  onTriggerAI={handleTriggerAI}
                  isAiLoading={isAiLoading}
                  onPrintPdf={handlePrintPdf}
                  onDownloadPdf={handleDownloadPdf}
                  onSendTelegram={handleSendPdfToTelegram}
                />
              </div>
            </div>
            </MeetingWorkspace>
          )}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <MobileBottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as typeof currentTab)}
      />

      {/* Modals & Dialogs */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        meeting={activeMeeting}
        onConfirmSignature={handleConfirmSignature}
        currentUser={activeUser}
      />

      <SigningRejectionModal
        isOpen={isSigningRejectionModalOpen}
        onClose={() => setIsSigningRejectionModalOpen(false)}
        onSubmit={handleSigningRejection}
      />

      <SigningRejectionDecisionModal
        isOpen={isSigningDecisionModalOpen && canManageActiveMeeting}
        meeting={activeMeeting}
        onClose={() => setIsSigningDecisionModalOpen(false)}
        onSubmit={handleSigningRejectionResponse}
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
        onUnreadCountChange={setUnreadNotificationCount}
      />

      <AddParticipantModal
        isOpen={isAddParticipantModalOpen}
        onClose={() => setIsAddParticipantModalOpen(false)}
        meetingId={activeMeeting?.id || ''}
        onAddParticipant={handleAddParticipant}
        onUpdateParticipant={handleUpdateParticipantRole}
        existingParticipants={activeMeeting?.participants || []}
        owner={activeMeeting?.organizer}
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
