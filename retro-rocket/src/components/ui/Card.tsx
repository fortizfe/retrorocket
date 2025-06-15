import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: React.ReactNode;
  customBackground?: boolean; // Add this prop to disable default background
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    hover = false,
    customBackground = false,
    className,
    children,
    ...props
  }, ref) => {
    const baseClasses = 'rounded-lg transition-all duration-300';

    // If customBackground is true, don't include the default bg-white
    const variants = {
      default: customBackground ? 'border border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
      outlined: customBackground ? 'border-2 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700',
      elevated: customBackground ? 'shadow-soft border border-slate-100 dark:border-slate-700' : 'bg-white dark:bg-slate-800 shadow-soft border border-slate-100 dark:border-slate-700 dark:shadow-slate-900/20',
      filled: customBackground ? 'border border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
      glass: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/20'
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };

    const cardClasses = clsx(
      baseClasses,
      variants[variant],
      paddings[padding],
      hover && 'hover:shadow-medium hover:border-primary-300 dark:hover:border-primary-500 cursor-pointer hover:-translate-y-1',
      className
    );

    const CardComponent = hover ? motion.div : 'div';
    const motionProps = hover ? {
      whileHover: { y: -2 },
      transition: { duration: 0.2 }
    } : {};

    return (
      <CardComponent
        ref={ref}
        className={cardClasses}
        {...motionProps}
        {...(props as any)}
      >
        {children}
      </CardComponent>
    );
  }
);

Card.displayName = 'Card';

export default Card;