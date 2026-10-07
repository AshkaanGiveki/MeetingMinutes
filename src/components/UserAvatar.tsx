import React, { useEffect, useState } from 'react';

export const getUserInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}\u200c${words[1][0]}`;
  const letters = Array.from(words[0] || 'کاربر').slice(0, 2);
  return letters.join('\u200c');
};

interface UserAvatarProps {
  name?: string;
  avatar?: string;
  className?: string;
  imageClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name = 'کاربر', avatar, className = '', imageClassName = '' }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(avatar && !imageFailed);

  useEffect(() => setImageFailed(false), [avatar]);

  if (showImage) {
    return <img src={avatar} alt={name} onError={() => setImageFailed(true)} referrerPolicy="no-referrer" className={imageClassName || className} />;
  }

  return <span aria-label={name} title={name} className={`inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 ${className}`}>{getUserInitials(name)}</span>;
};
