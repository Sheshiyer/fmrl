/**
 * Page Transition Animation Component
 * Preserves all existing functionality while adding smooth transitions
 * Respects prefers-reduced-motion via useMotionPreference
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Variants, Transition } from 'framer-motion';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import type { MotionLevel } from '../../hooks/useMotionPreference';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// ── Variant helpers ──────────────────────────────────────────────────────

function pickVariants(full: Variants, reduced: Variants, minimal: Variants, level: MotionLevel): Variants {
  if (level === 'minimal') return minimal;
  if (level === 'reduced') return reduced;
  return full;
}

function pickTransition(full: Transition, reduced: Transition, level: MotionLevel): Transition {
  if (level === 'minimal') return { duration: 0 };
  if (level === 'reduced') return reduced;
  return full;
}

// ── Reduced / Minimal shared constants ───────────────────────────────────

const REDUCED_TRANSITION: Transition = { duration: 0.15, ease: 'easeOut' };
const FADE_ONLY: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
const NO_MOTION: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
};

// ── Full variants (original) ─────────────────────────────────────────────

const pageVariantsFull: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
};

const pageTransitionFull: Transition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const { motionLevel } = useMotionPreference();
  const variants = pickVariants(pageVariantsFull, FADE_ONLY, NO_MOTION, motionLevel);
  const transition = pickTransition(pageTransitionFull, REDUCED_TRANSITION, motionLevel);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerContainer ─────────────────────────────────────────────────────

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ 
  children, 
  className = '',
  staggerDelay = 0.05 
}: StaggerContainerProps) {
  const { motionLevel } = useMotionPreference();

  const variants: Variants = motionLevel === 'full'
    ? {
        initial: {},
        animate: {
          transition: { staggerChildren: staggerDelay },
        },
      }
    : {
        // reduced / minimal — no stagger delay
        initial: {},
        animate: {
          transition: { staggerChildren: 0 },
        },
      };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerItem ──────────────────────────────────────────────────────────

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

const staggerItemFull: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
};

const staggerItemReduced: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
};

const staggerItemMinimal: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
};

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  const { motionLevel } = useMotionPreference();
  const variants = pickVariants(staggerItemFull, staggerItemReduced, staggerItemMinimal, motionLevel);

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  );
}

// ── AnimatedCard ─────────────────────────────────────────────────────────

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className = '', delay = 0 }: AnimatedCardProps) {
  const { motionLevel } = useMotionPreference();

  if (motionLevel === 'minimal') {
    return <div className={className}>{children}</div>;
  }

  if (motionLevel === 'reduced') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut', delay }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  // Full motion — original behavior
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 28,
        delay,
      }}
      whileHover={{ 
        y: -2,
        transition: { duration: 0.2 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FadeIn ───────────────────────────────────────────────────────────────

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function FadeIn({ 
  children, 
  className = '', 
  delay = 0,
  duration = 0.4 
}: FadeInProps) {
  const { motionLevel } = useMotionPreference();

  if (motionLevel === 'minimal') {
    return <div className={className}>{children}</div>;
  }

  const effectiveDuration = motionLevel === 'reduced' ? 0.15 : duration;
  const effectiveDelay = motionLevel === 'reduced' ? 0 : delay;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: effectiveDuration, delay: effectiveDelay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── ScaleButton ──────────────────────────────────────────────────────────

interface ScaleButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ScaleButton({ children, className = '', onClick, disabled }: ScaleButtonProps) {
  const { shouldAnimate } = useMotionPreference();

  // Only apply scale hover/tap when full motion is allowed
  const hoverProps = shouldAnimate && !disabled ? { scale: 1.02 } : {};
  const tapProps = shouldAnimate && !disabled ? { scale: 0.98 } : {};

  return (
    <motion.button
      whileHover={hoverProps}
      whileTap={tapProps}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// ── SlideIn ──────────────────────────────────────────────────────────────

interface SlideInProps {
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
}

export function SlideIn({ 
  children, 
  className = '', 
  direction = 'right',
  delay = 0 
}: SlideInProps) {
  const { motionLevel } = useMotionPreference();

  if (motionLevel === 'minimal') {
    return <div className={className}>{children}</div>;
  }

  if (motionLevel === 'reduced') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  // Full motion — original behavior
  const directions = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    up: { x: 0, y: -30 },
    down: { x: 0, y: 30 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
