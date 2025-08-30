import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { shadows, borderRadius, animations, interactiveStates, a11y } from '../../utils/designSystem';

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
        ? 'border border-slate-200 dark:border-slate-700'
        : `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${shadows.card}`,
      outlined: customBackground
        ? 'border-2 border-slate-200 dark:border-slate-700'
        : `bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 ${shadows.card}`,
      elevated: customBackground
        ? `${shadows.cardElevated} border border-slate-100 dark:border-slate-700`
        : `bg-white dark:bg-slate-800 ${shadows.cardElevated} border border-slate-100 dark:border-slate-700`,
      filled: customBackground
        ? 'border border-slate-200 dark:border-slate-700'
        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
      glass: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/20 shadow-lg',
      interactive: customBackground
        ? `border border-slate-200 dark:border-slate-700 ${interactiveStates.cardHover} ${a11y.focusVisible}`
        : `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${shadows.card} ${interactiveStates.cardHover} ${a11y.focusVisible}`
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
      hover && `${shadows.cardElevated} hover:border-primary-300 dark:hover:border-primary-500 cursor-pointer hover:-translate-y-1`,
      interactive && 'cursor-pointer',
      className
    );

    const motionProps = {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: 'easeOut' },
      ...(hover || interactive ? {
        whileHover: {
          y: -2,
          scale: 1.01,
          transition: { duration: 0.15, ease: 'easeOut' }
        },
        whileTap: {
          scale: 0.99,
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg z-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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