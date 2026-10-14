import React, { useEffect, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { Meeting, Participant } from '../types';
import { MeetingRoleIcon } from './MeetingRoleIcon';
import { UserAvatar } from './UserAvatar';
import { staggerContainerVariants, staggerItemVariants } from './stagger';

interface MeetingParticipantsCardProps {
  meeting: Meeting;
  onOpenAddParticipant: () => void;
  canManageMeeting?: boolean;
}

export const MeetingParticipantsCard: React.FC<MeetingParticipantsCardProps> = ({ meeting, onOpenAddParticipant, canManageMeeting = false }) => {
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetch(`/api/meetings/${meeting.id}/participant-options`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data?.members) return;
        const avatars = Object.fromEntries(
          data.members
            .filter((member: { userId?: string; avatar?: string }) => member.userId && member.avatar?.trim())
            .map((member: { userId: string; avatar: string }) => [member.userId, member.avatar.trim()]),
        );
        setMemberAvatars(avatars);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [meeting.id]);

  const participantRoles = (participant: Participant) => {
    const allowedRoles = new Set(['Editor', 'Reviewer', 'Signer', 'Viewer']);
    const roles = Array.from(new Set([...(participant.roles || []), participant.role]))
      .map((role) => String(role || '').trim())
      .map((role) => role.toLowerCase() === 'viewer' ? 'Viewer' : role)
      .filter((role): role is string => allowedRoles.has(role));
    return roles.includes('Viewer') ? ['Viewer'] : roles;
  };
  const signatureIds = new Set((meeting.signatures || []).map((signature) => signature.signerId));
  const hasSignatureRecords = Array.isArray(meeting.signatures);
  const isSigned = (participant: Participant) => participant.id !== meeting.organizer.id
    && (signatureIds.has(participant.id) || (!hasSignatureRecords && Boolean(participant.hasSigned)));
  const participants = [meeting.organizer, ...meeting.participants]
    .filter(Boolean)
    .filter((participant, index, all) => all.findIndex((item) => item.id === participant.id) === index);

  return <section className="meeting-mobile-participants-card rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-3.5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80" dir="rtl">
    <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-1">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300"><UserPlus className="h-4 w-4" /></div>
        <div className="min-w-0"><h3 className="truncate text-xs font-black text-slate-800 dark:text-slate-100">شرکت‌کنندگان</h3><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{participants.length} نفر در این جلسه</p></div>
      </div>
      {canManageMeeting && <button type="button" onClick={onOpenAddParticipant} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95" title="افزودن شرکت‌کننده" aria-label="افزودن شرکت‌کننده"><Plus className="h-4 w-4 stroke-[2.5]" /></button>}
    </div>
    <motion.div className="mt-5 flex flex-col gap-1" initial="hidden" animate="show" variants={staggerContainerVariants}>
      {participants.map((participant, index) => <motion.div key={participant.id || `participant-${index}`} variants={staggerItemVariants} className="flex min-h-[3.1rem] items-center justify-between rounded-xl px-2 py-1.5 transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30">
        <div className="flex min-w-0 items-center gap-2.5"><UserAvatar name={participant.name} avatar={participant.avatar?.trim() || memberAvatars[participant.id]?.trim() || undefined} className="h-8 w-8 shrink-0 border border-slate-200 text-[10px] dark:border-slate-700" imageClassName="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" /><div className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{participant.name}</span><span className="mt-1 flex items-center gap-1.5">{participantRoles(participant).map((role) => <span key={role} title={role} className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800"><MeetingRoleIcon role={role} className="h-3 w-3" /></span>)}</span></div></div>
        <span className={`h-2 w-2 shrink-0 rounded-full ${isSigned(participant) ? 'bg-emerald-500' : 'bg-amber-400/80'}`} title={isSigned(participant) ? 'امضا کرده' : 'در انتظار امضا'} />
      </motion.div>)}
    </motion.div>
  </section>;
};
