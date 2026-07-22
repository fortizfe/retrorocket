import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { shadows, borderRadius, animations, interactiveStates, a11y } from '@/lib/utils/designSystem';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass' | 'interactive';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  interactive?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  customBackground?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    hover = false,
    interactive = false,
    loading = false,
    customBackground = false,
    className,
    children,
    ...props
  }, ref) => {
    const baseClasses = `
      ${borderRadius.card} 
      ${animations.default}
      ${a11y.motionReduce}
      relative
    `;

    const variants = {
      default: customBackground
        ? 'border border-border-default'
        : `bg-surface-raised border border-border-default ${shadows.card}`,
      outlined: customBackground
        ? 'border-2 border-border-default'
        : `bg-surface-raised border-2 border-border-default ${shadows.card}`,
      elevated: customBackground
        ? `${shadows.cardElevated} border border-border-default`
        : `bg-surface-raised ${shadows.cardElevated} border border-border-default`,
      filled: customBackground
        ? 'border border-border-default'
        : 'bg-surface border border-border-default',
      glass: 'bg-surface-raised/80 backdrop-blur-sm border border-border-default/40 shadow-lg',
      interactive: customBackground
        ? `border border-border-default ${interactiveStates.cardHover} ${a11y.focusVisible}`
        : `bg-surface-raised border border-border-default ${shadows.card} ${interactiveStates.cardHover} ${a11y.focusVisible}`
    };

    const paddings = {
      none: '',
      xs: 'p-2',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    };

    const cardClasses = clsx(
      baseClasses,
      variants[variant],
      paddings[padding],
      loading && 'pointer-events-none opacity-70',
      hover && `${shadows.cardElevated} hover:border-action cursor-pointer hover:-translate-y-1`,
      interactive && 'cursor-pointer',
      className
    );

    const motionProps = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: 'easeOut' },
      ...(hover || interactive ? {
        // Avoid scaling to prevent creating horizontal overflow; use slight translate and shadow instead.
        whileHover: {
          y: -2,
          transition: { duration: 0.15, ease: 'easeOut' }
        },
        whileTap: {
          scale: 0.995,
          transition: { duration: 0.1, ease: 'easeOut' }
        }
      } : {})
    };

    return (
      <motion.div
        ref={ref}
        className={cardClasses}
        {...motionProps}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-raised/50 backdrop-blur-sm rounded-lg z-10">
            <div className="w-6 h-6 border-2 border-action border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div {...props}>
          {children}
        </div>
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;