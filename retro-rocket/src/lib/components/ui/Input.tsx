import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    helperText,
    variant = 'default',
    size = 'md',
    className,
    ...props
  }, ref) => {
    const baseClasses = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

    const variants = {
      default: 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20 dark:focus:border-primary-400',
      outline: 'border-slate-300 dark:border-slate-600 bg-transparent focus:border-primary-500 focus:ring-primary-500/20 dark:focus:border-primary-400',
      filled: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-primary-500 focus:ring-primary-500/20 focus:bg-white dark:focus:bg-slate-700'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-3 text-base'
    };

    const inputClasses = clsx(
      baseClasses,
      variants[variant],
      sizes[size],
      error && 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400',
      'text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400',
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;