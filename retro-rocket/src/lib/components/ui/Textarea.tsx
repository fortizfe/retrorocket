import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    variant?: 'default' | 'outline' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({
        label,
        error,
        helperText,
        variant = 'default',
        size = 'md',
        resize = 'vertical',
        className,
        ...props
    }, ref) => {
        const baseClasses = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface';

        const variants = {
            default: 'border-border-strong bg-surface-raised focus:border-focus',
            outline: 'border-border-strong bg-transparent focus:border-focus',
            filled: 'border-border-default bg-surface focus:border-focus focus:bg-surface-raised'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-3 py-2 text-sm',
            lg: 'px-4 py-3 text-base'
        };

        const resizeClasses = {
            none: 'resize-none',
            both: 'resize',
            horizontal: 'resize-x',
            vertical: 'resize-y'
        };

        const textareaClasses = clsx(
            baseClasses,
            variants[variant],
            sizes[size],
            resizeClasses[resize],
            error && 'border-error-fg focus:border-error-fg',
            'text-text-primary placeholder-text-muted',
            className
        );

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={textareaClasses}
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-sm text-error-fg">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-text-muted">{helperText}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';

export default Textarea;
