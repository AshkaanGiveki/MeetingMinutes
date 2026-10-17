import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disabled';

interface ParticlesOrbProps {
  state?: OrbState;
  size?: number;
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
  levelRef?: { current: number };
  label?: string;
  className?: string;
}

const PARTICLE_COUNT = 720;
const TWO_PI = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;

type StateParams = { spin: number; breathe: number; swell: number; ripple: number; pulse: number; flow: number; ring: number; alpha: number };

const STATE_PARAMS: Record<OrbState, StateParams> = {
  idle: { spin: 0.14, breathe: 0.05, swell: 0.04, ripple: 0, pulse: 0, flow: 0, ring: 0, alpha: 0.72 },
  connecting: { spin: 0.3, breathe: 0.02, swell: 0, ripple: 0, pulse: 0.06, flow: 0, ring: 1, alpha: 0.8 },
  listening: { spin: 0.55, breathe: 0.012, swell: 0.12, ripple: 1, pulse: 0, flow: 0, ring: 0, alpha: 0.92 },
  thinking: { spin: 0.32, breathe: 0.01, swell: 0, ripple: 0, pulse: 1, flow: 0, ring: 0, alpha: 0.78 },
  speaking: { spin: 0.24, breathe: 0.01, swell: 0.06, ripple: 0, pulse: 0, flow: 1, ring: 1, alpha: 0.94 },
  error: { spin: 0.08, breathe: 0, swell: 0, ripple: 0, pulse: 0, flow: 0, ring: 0, alpha: 0.85 },
  disabled: { spin: 0, breathe: 0, swell: 0, ripple: 0, pulse: 0, flow: 0, ring: 0, alpha: 0.45 },
};

const STATE_ACCENTS: Record<OrbState, string> = {
  idle: '#4039c5',
  connecting: '#38bdf8',
  listening: '#6366f1',
  thinking: '#a855f7',
  speaking: '#06b6d4',
  error: '#f43f5e',
  disabled: '#64748b',
};

const blendParams = (from: StateParams, to: StateParams, amount: number): StateParams => ({
  spin: from.spin + (to.spin - from.spin) * amount,
  breathe: from.breathe + (to.breathe - from.breathe) * amount,
  swell: from.swell + (to.swell - from.swell) * amount,
  ripple: from.ripple + (to.ripple - from.ripple) * amount,
  pulse: from.pulse + (to.pulse - from.pulse) * amount,
  flow: from.flow + (to.flow - from.flow) * amount,
  ring: from.ring + (to.ring - from.ring) * amount,
  alpha: from.alpha + (to.alpha - from.alpha) * amount,
});

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

const mix = (from: number[], to: number[], amount: number) => from.map((value, index) => value + (to[index] - value) * amount);

const buildSphere = () => Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const y = 1 - (index / (PARTICLE_COUNT - 1)) * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = GOLDEN_ANGLE * index;
  return {
    x: Math.cos(theta) * radius,
    y,
    z: Math.sin(theta) * radius,
    seed: ((index * 0.7548776662) % 1) * TWO_PI,
    ring: (index * 0.61803398875) % 1,
    tone: (index * 0.5436890126) % 1,
  };
});

const SPHERE = buildSphere();

export function ParticlesOrb({
  state = 'idle',
  size = 212,
  speed = 1,
  colorFrom = '#4039c5',
  colorTo = '#4039c5',
  levelRef,
  label = 'Assistant orb',
  className = '',
}: ParticlesOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetStateRef = useRef<OrbState>(state);

  useEffect(() => {
    targetStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const from = hexToRgb(colorFrom);
    const to = hexToRgb(colorTo);
    const center = size / 2;
    const baseRadius = center * 0.62;
    let animationFrame = 0;
    let last = performance.now();
    let time = 0;
    let angleY = 0;
    let ringPhase = 0;
    let activeState = state;
    let transitionFrom = STATE_PARAMS[state];
    let transitionTo = STATE_PARAMS[state];
    let transitionProgress = 1;
    let currentParams = STATE_PARAMS[state];

    const draw = (now: number) => {
      const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      time += delta * speed;
      const desiredState = targetStateRef.current;
      if (desiredState !== activeState) {
        transitionFrom = currentParams;
        transitionTo = STATE_PARAMS[desiredState];
        transitionProgress = 0;
        activeState = desiredState;
      }
      transitionProgress = Math.min(1, transitionProgress + delta / 0.55);
      const easedTransition = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
      currentParams = blendParams(transitionFrom, transitionTo, easedTransition);
      const params = currentParams;
      const audioLevel = activeState === 'listening'
        ? Math.max(clamp(levelRef?.current || 0), 0.42 + 0.32 * (0.5 + 0.5 * Math.sin(time * 4.8)))
        : clamp(levelRef?.current || 0);
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
      const pulseSharp = pulse * pulse * pulse;
      const stateScale = activeState === 'listening'
        ? 1.08 + audioLevel * 0.14
        : activeState === 'thinking'
          ? 0.86 + pulse * 0.2
          : activeState === 'connecting'
            ? 0.94 + pulse * 0.06
            : activeState === 'speaking'
              ? 1.02 + pulseSharp * 0.1
              : 1;
      const radius = baseRadius * stateScale * (1 + params.breathe * Math.sin(time * 1.1) + audioLevel * params.swell - params.pulse * (0.06 + 0.12 * pulseSharp));
      angleY += delta * params.spin * (1 + params.ripple * audioLevel * 1.8);
      ringPhase = (ringPhase + delta * 0.7) % TAU;
      const cosX = Math.cos(0.32);
      const sinX = Math.sin(0.32);
      const cosZ = Math.cos(0.1 * Math.sin(time * 0.54));
      const sinZ = Math.sin(0.1 * Math.sin(time * 0.54));
      const sorted = SPHERE.map((point, index) => ({ point, index, depth: 0 })).sort((a, b) => a.point.z - b.point.z);

      context.clearRect(0, 0, size, size);
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = params.alpha;

      const accent = hexToRgb(STATE_ACCENTS[activeState]);
      const glowRadius = activeState === 'thinking' ? center * (0.72 + pulse * 0.16) : center * (0.58 + audioLevel * 0.12);
      const glow = context.createRadialGradient(center, center, 0, center, center, glowRadius);
      glow.addColorStop(0, `rgb(${Math.round(accent[0] * 255)} ${Math.round(accent[1] * 255)} ${Math.round(accent[2] * 255)} / ${activeState === 'idle' ? 0.08 : 0.22})`);
      glow.addColorStop(1, `rgb(${Math.round(accent[0] * 255)} ${Math.round(accent[1] * 255)} ${Math.round(accent[2] * 255)} / 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, size, size);

      for (const item of sorted) {
        const { point } = item;
        const twist = angleY + params.flow * 0.28 * Math.sin(point.y * 2.4 + time * 1.6);
        const cy = Math.cos(twist);
        const sy = Math.sin(twist);
        const x1 = point.x * cy - point.z * sy;
        const z1 = point.x * sy + point.z * cy;
        const y1 = point.y * cosX - z1 * sinX;
        const z2 = point.y * sinX + z1 * cosX;
        const x2 = x1 * cosZ - y1 * sinZ;
        const y2 = x1 * sinZ + y1 * cosZ;
        const depth = (z2 + 1) / 2;
        const perspective = 0.65 + depth * 0.45;
        let pointRadius = radius;
        if (params.ripple) pointRadius *= 1 + params.ripple * (0.04 + audioLevel * 0.22) * (0.5 + 0.5 * Math.sin(point.y * 4.5 - time * 6.5));
        if (params.pulse) pointRadius *= 1 - params.pulse * 0.16 * (0.5 + 0.5 * Math.sin(point.ring * TWO_PI + time * 3.1));
        if (params.flow) pointRadius *= 1 - params.flow * (0.18 + audioLevel * 0.4) * Math.pow(0.5 + 0.5 * Math.sin(point.seed * 3 - time * 3.4), 2);
        const drift = params.ring ? 0 : radius * 0.02 * Math.sin(time * 0.7 + point.seed * 2.1);
        let screenX = center + x2 * pointRadius * perspective + drift;
        let screenY = center + y2 * pointRadius * perspective + drift * 0.5;
        if (params.ring) {
          const ringAngle = (item.index / PARTICLE_COUNT) * TWO_PI + ringPhase;
          const ringBreath = activeState === 'speaking' ? 1 + 0.14 * Math.sin(time * 4.2 + point.seed) : 1 + 0.05 * Math.sin(time + point.seed * 1.7);
          const ringRadius = center * (0.58 + 0.13 * point.ring) * ringBreath;
          screenX += (center + Math.cos(ringAngle) * ringRadius - screenX) * params.ring;
          screenY += (center + Math.sin(ringAngle) * ringRadius - screenY) * params.ring;
        }
        const baseTone = mix(from, to, point.tone);
        const tone = mix(baseTone, accent, activeState === 'idle' ? 0.05 : 0.34);
        const alpha = clamp(0.1 + depth * depth * 0.82) * params.alpha;
        const dot = (0.55 + depth * 1.55) * (0.55 + 0.45 * Math.min(1, size / 180));
        context.globalAlpha = alpha;
        context.fillStyle = `rgb(${Math.round(tone[0] * 255)} ${Math.round(tone[1] * 255)} ${Math.round(tone[2] * 255)} / ${alpha})`;
        context.beginPath();
        context.arc(screenX, screenY, dot, 0, TWO_PI);
        context.fill();
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      animationFrame = requestAnimationFrame(draw);
    };

    animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [colorFrom, colorTo, levelRef, size, speed]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className={className} style={{ width: size, height: size, display: 'block', opacity: state === 'disabled' ? 0.5 : 1, transition: 'opacity 0.4s ease, transform 0.4s ease', transform: state === 'thinking' ? 'scale(1.04)' : 'scale(1)' }} />;
}
