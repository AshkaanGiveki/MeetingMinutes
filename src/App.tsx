import React, { useState } from 'react';
import { initialMeeting, sampleMeetingsList } from './data/mockData';
import { Meeting, CommentItem, Participant, Template } from './types';
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
import { TelegramMiniAppModal } from './components/TelegramMiniAppModal';
import { MeetingsListView } from './components/MeetingsListView';
import { ArchiveView } from './components/ArchiveView';
import { TemplatesView } from './components/TemplatesView';
import { ContactsView } from './components/ContactsView';
import { SettingsView } from './components/SettingsView';
import { NewMeetingModal } from './components/NewMeetingModal';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [currentTab, setCurrentTab] = useState<'meetings' | 'archive' | 'templates' | 'contacts' | 'settings'>('meetings');
  const [viewMode, setViewMode] = useState<'hero' | 'list'>('hero');
  const [meetings, setMeetings] = useState<Meeting[]>(sampleMeetingsList);
  const [activeMeeting, setActiveMeeting] = useState<Meeting>(initialMeeting);

  // Modals state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasUserSigned, setHasUserSigned] = useState(false);

  // Handle meeting state updates
  const handleUpdateMeeting = (updated: Partial<Meeting>) => {
    const newMeeting = { ...activeMeeting, ...updated };
    setActiveMeeting(newMeeting);
    setMeetings((prev) =>
      prev.map((m) => (m.id === newMeeting.id ? newMeeting : m))
    );
  };

  // Add comment
  const handleAddComment = (comment: CommentItem) => {
    handleUpdateMeeting({
      comments: [comment, ...activeMeeting.comments],
    });
  };

  // Add participant
  const handleAddParticipant = (p: Participant) => {
    handleUpdateMeeting({
      participants: [...activeMeeting.participants, p],
      totalSignaturesRequired: activeMeeting.totalSignaturesRequired + 1,
    });
  };

  // Confirm Signature
  const handleConfirmSignature = (_signatureDataUrl: string) => {
    setHasUserSigned(true);
    const newCount = activeMeeting.signatureCount + 1;
    const isNowAllSigned = newCount >= activeMeeting.totalSignaturesRequired;

    handleUpdateMeeting({
      signatureCount: newCount,
      status: isNowAllSigned ? 'READY_FOR_SIGNATURE' : 'SIGNING',
      statusLabel: isNowAllSigned ? 'آماده امضا' : 'در حال امضا',
    });
  };

  // Confirm Seal
  const handleConfirmSeal = () => {
    handleUpdateMeeting({
      status: 'SEALED',
      statusLabel: 'مهر و موم شده',
      sealedAt: new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
    });
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
    window.print();
  };

  // Create new meeting
  const handleCreateNewMeeting = (newMeeting: Meeting) => {
    setMeetings([newMeeting, ...meetings]);
    setActiveMeeting(newMeeting);
    setViewMode('hero');
    setCurrentTab('meetings');
  };

  // Use Template
  const handleUseTemplate = (template: Template) => {
    const newMeeting: Meeting = {
      id: `meet_${Date.now()}`,
      title: template.title,
      persianDate: '۱۵ مهر ۱۴۰۴',
      timeRange: '۱۰:۰۰ - ۱۱:۳۰',
      location: 'اتاق جلسات اصلی',
      status: 'DRAFT',
      statusLabel: 'پیش‌نویس',
      organizer: activeMeeting.organizer,
      participants: activeMeeting.participants,
      agenda: template.agendaDefaults.map((text, idx) => ({
        id: `ag_${idx + 1}`,
        order: idx + 1,
        text,
      })),
      discussion: `این جلسه با محوریت ${template.title} برگزار شد.`,
      aiSuggestion: {
        summary: `پیشنهاد هوش مصنوعی برای ${template.title}: اهداف کلیدی و مسئولیت‌ها تنظیم شوند.`,
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

  return (
    <div
      className={`min-h-screen flex text-slate-800 transition-colors duration-300 font-sans ${
        isDark ? 'dark bg-[#0a0e1f] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'
      }`}
    >
      {/* Ambient background glows */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Top Header */}
        <div className="no-print">
          <TopBar
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => setIsSearchModalOpen(true)}
            onOpenProfile={() => setCurrentTab('settings')}
          />
        </div>

        {/* Content View Router */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {currentTab === 'archive' ? (
            <ArchiveView
              meetings={meetings}
              onOpenMeeting={(m) => {
                setActiveMeeting(m);
                setCurrentTab('meetings');
                setViewMode('hero');
              }}
              onPrintPdf={handlePrintPdf}
            />
          ) : currentTab === 'templates' ? (
            <TemplatesView onUseTemplate={handleUseTemplate} />
          ) : currentTab === 'contacts' ? (
            <ContactsView />
          ) : currentTab === 'settings' ? (
            <SettingsView />
          ) : viewMode === 'list' ? (
            <MeetingsListView
              meetings={meetings}
              onSelectMeeting={(m) => {
                setActiveMeeting(m);
                setViewMode('hero');
              }}
              onOpenNewMeetingModal={() => setIsNewMeetingModalOpen(true)}
            />
          ) : (
            /* Primary Hero Meeting View matching screenshot */
            <div className="flex items-start justify-center gap-6">
              {/* Left Panel: In-Progress, Status Stepper, Comments */}
              <div className="no-print">
                <LeftSidebar
                  meeting={activeMeeting}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  onOpenAddParticipant={() => setIsAddParticipantModalOpen(true)}
                  onAddComment={handleAddComment}
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

              {/* Central Document Hero Canvas */}
              <MeetingHero
                meeting={activeMeeting}
                onUpdateMeeting={handleUpdateMeeting}
                onBackToList={() => setViewMode('list')}
                onTriggerAI={handleTriggerAI}
                isAiLoading={isAiLoading}
                onPrintPdf={handlePrintPdf}
              />

              {/* Floating Digital Signature Card on Right */}
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

      {/* Right Persistent Navigation Sidebar */}
      <div className="no-print">
        <RightSidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab as typeof currentTab);
            if (tab === 'meetings') {
              setViewMode('hero');
            }
          }}
          isDark={isDark}
        />
      </div>

      {/* Modals & Dialogs */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        meeting={activeMeeting}
        onConfirmSignature={handleConfirmSignature}
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
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        meetings={meetings}
        onSelectMeeting={(m) => {
          setActiveMeeting(m);
          setCurrentTab('meetings');
          setViewMode('hero');
        }}
      />

      <AddParticipantModal
        isOpen={isAddParticipantModalOpen}
        onClose={() => setIsAddParticipantModalOpen(false)}
        onAddParticipant={handleAddParticipant}
        existingParticipants={activeMeeting.participants}
      />

      <TelegramMiniAppModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        meeting={activeMeeting}
        onSignComplete={() => {
          setHasUserSigned(true);
          handleUpdateMeeting({
            signatureCount: activeMeeting.signatureCount + 1,
          });
        }}
      />

      <NewMeetingModal
        isOpen={isNewMeetingModalOpen}
        onClose={() => setIsNewMeetingModalOpen(false)}
        onCreateMeeting={handleCreateNewMeeting}
      />
    </div>
  );
}
