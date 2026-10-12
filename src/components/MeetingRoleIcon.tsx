import React from 'react';
import editorIcon from '../assets/icons/editor.png';
import reviewIcon from '../assets/icons/review.png';
import signerIcon from '../assets/icons/signer.png';
import viewerIcon from '../assets/icons/viewer.png';

const roleIcons: Record<string, string> = { Editor: editorIcon, Reviewer: reviewIcon, Signer: signerIcon, Viewer: viewerIcon, Participant: viewerIcon };

export const MeetingRoleIcon: React.FC<{ role: string; className?: string; selected?: boolean }> = ({ role, className = 'h-4 w-4', selected = false }) => (
  <img
    src={roleIcons[role] || viewerIcon}
    alt=""
    aria-hidden="true"
    className={`${className} object-contain ${selected ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert'}`}
  />
);
