import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

type BlurTextProps = {
  text: string;
  effect?: 'blur' | 'zoom' | 'tilt' | 'focus' | 'drift';
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom' | 'left' | 'right';
  staggerFrom?: 'start' | 'end' | 'center';
  trigger?: 'load' | 'view';
  delay?: number;
  stepDuration?: number;
  blur?: number;
  distance?: number;
  onAnimationComplete?: () => void;
  className?: string;
  loop?: boolean;
  loopDelay?: number;
};

const axisFor = (direction: BlurTextProps['direction']) => ({
  top: { axis: 'y', value: -1 },
  bottom: { axis: 'y', value: 1 },
  left: { axis: 'x', value: -1 },
  right: { axis: 'x', value: 1 },
}[direction || 'top']);

export default function BlurText({
  text,
  effect = 'blur',
  animateBy = 'words',
  direction = 'top',
  staggerFrom = 'start',
  trigger = 'load',
  delay = 120,
  stepDuration = 0.35,
  blur = 10,
  distance = 50,
  onAnimationComplete,
  className = '',
  loop = false,
  loopDelay = 2,
}: BlurTextProps) {
  const hostRef = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(trigger === 'load');
  const [cycle, setCycle] = useState(0);
  const pieces = useMemo(() => animateBy === 'letters' ? Array.from(text) : text.split(' '), [animateBy, text]);
  const directionConfig = axisFor(direction);

  useEffect(() => {
    if (trigger !== 'view' || !hostRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [trigger]);

  useEffect(() => {
    if (!loop || !visible) return undefined;
    const timer = window.setTimeout(() => setCycle((value) => value + 1), (pieces.length * delay) + (stepDuration * 1000) + (loopDelay * 1000));
    return () => window.clearTimeout(timer);
  }, [delay, loop, loopDelay, pieces.length, stepDuration, visible, cycle]);

  const rankFor = (index: number) => {
    if (staggerFrom === 'end') return pieces.length - index - 1;
    if (staggerFrom === 'center') return Math.abs(index - (pieces.length - 1) / 2);
    return index;
  };

  const hiddenState = effect === 'zoom'
    ? { opacity: 0, scale: 1.3, filter: `blur(${blur}px)`, [directionConfig.axis]: directionConfig.value * distance * 0.35 }
    : effect === 'tilt'
      ? { opacity: 0, filter: `blur(${blur}px)`, rotateX: directionConfig.axis === 'y' ? 45 : 0, rotateY: directionConfig.axis === 'x' ? -45 : 0, [directionConfig.axis]: directionConfig.value * distance }
      : { opacity: 0, filter: `blur(${blur}px)`, [directionConfig.axis]: directionConfig.value * distance };

  return (
    <p ref={hostRef} className={className} dir="rtl" aria-label={text}>
      {visible && pieces.map((piece, index) => <motion.span
        key={`${cycle}-${index}-${piece}`}
        aria-hidden="true"
        initial={hiddenState}
        animate={{ opacity: 1, filter: 'blur(0px)', x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 }}
        transition={{ duration: stepDuration, delay: rankFor(index) * (delay / 1000), ease: [0.33, 1, 0.68, 1] }}
        onAnimationComplete={index === pieces.length - 1 ? onAnimationComplete : undefined}
        style={{ display: 'inline-block', whiteSpace: 'pre' }}
      >{piece}{animateBy === 'words' && index < pieces.length - 1 ? '\u00a0' : ''}</motion.span>)}
    </p>
  );
}
