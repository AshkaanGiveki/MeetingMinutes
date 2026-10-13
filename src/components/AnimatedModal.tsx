import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  zIndexClassName?: string;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({ isOpen, onClose, children, className = '', contentClassName = '', zIndexClassName = 'z-50' }) => (
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div key="modal-backdrop" className={`app-modal-backdrop fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
        <motion.div initial={{ opacity: 0, y: 18, scale: 0.96, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(4px)' }} transition={{ type: 'spring', stiffness: 430, damping: 30, mass: 0.72 }} className={contentClassName} onMouseDown={(event) => event.stopPropagation()}>{children}</motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
