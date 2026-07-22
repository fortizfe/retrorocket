import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    className,
    children,
    disabled,
    ...props
  }, ref) => {
    // Standardized focus-visible ring uses the `focus` token (≥3:1 both themes),
    // with the offset matching the page surface so the ring reads in both themes.
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-action text-text-inverse hover:bg-action-hover active:bg-action-active shadow-sm',
      secondary: 'bg-surface-raised text-text-primary hover:bg-surface border border-border-default shadow-sm',
      outline: 'border border-border-strong text-text-primary hover:bg-surface-raised',
      ghost: 'text-text-secondary hover:bg-surface-raised',
      // Deliberate fixed red (not a status token): a solid danger fill whose white
      // label meets AA in both themes (red-700/800). Documented exception.
      danger: 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const buttonClasses = clsx(
      baseClasses,
      variants[variant],
      sizes[size],
      className
    );

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;