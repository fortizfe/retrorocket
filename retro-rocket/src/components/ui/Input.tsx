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
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20',
      outline: 'border-gray-300 bg-transparent focus:border-blue-500 focus:ring-blue-500/20',
      filled: 'border-gray-200 bg-gray-50 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
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
      error && 'border-red-300 focus:border-red-500 focus:ring-red-500/20',
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;