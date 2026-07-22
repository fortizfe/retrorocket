import React, { forwardRef, useState, useRef } from 'react';
import clsx from 'clsx';
import EmojiPicker from '@/lib/components/ui/EmojiPicker';

interface TextareaWithEmojiProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
    label?: string;
    error?: string;
    helperText?: string;
    variant?: 'default' | 'outline' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    resize?: 'none' | 'both' | 'horizontal' | 'vertical';
    showEmojiPicker?: boolean;
    onEmojiSelect?: (emoji: string) => void;
}

const TextareaWithEmoji = forwardRef<HTMLTextAreaElement, TextareaWithEmojiProps>(
    ({
        label,
        error,
        helperText,
        variant = 'default',
        size = 'md',
        resize = 'vertical',
        className,
        showEmojiPicker = true,
        onEmojiSelect,
        value,
        onChange,
        ...props
    }, ref) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const [cursorPosition, setCursorPosition] = useState(0);

        const baseClasses = 'block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';

        const variants = {
            default: 'border-border-strong bg-surface-raised focus:border-focus focus:ring-focus',
            outline: 'border-border-strong bg-transparent focus:border-focus focus:ring-focus',
            filled: 'border-border-default bg-surface focus:border-focus focus:ring-focus focus:bg-surface-raised focus:bg-surface'
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

        // Ajustar padding cuando se muestra el emoji picker
        const textareaPadding = showEmojiPicker ? 'pr-10' : '';

        const textareaClasses = clsx(
            baseClasses,
            variants[variant],
            sizes[size],
            resizeClasses[resize],
            textareaPadding,
            error && 'border-error-fg focus:border-error-fg',
            'text-text-primary placeholder-text-muted',
            className
        );

        // Actualizar posición del cursor
        const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setCursorPosition(e.target.selectionStart || 0);
            if (onChange) {
                onChange(e);
            }
        };

        // Insertar emoji en la posición del cursor
        const handleEmojiSelect = (emoji: string) => {
            const textarea = textareaRef.current || (ref as React.MutableRefObject<HTMLTextAreaElement>)?.current;
            if (!textarea) return;

            const currentValue = String(value || '');
            const start = textarea.selectionStart || cursorPosition;
            const end = textarea.selectionEnd || cursorPosition;

            const newValue = currentValue.slice(0, start) + emoji + currentValue.slice(end);

            // Crear evento sintético para mantener compatibilidad
            const syntheticEvent = {
                target: {
                    ...textarea,
                    value: newValue
                },
                currentTarget: textarea
            } as React.ChangeEvent<HTMLTextAreaElement>;

            // Llamar onChange si está disponible
            if (onChange) {
                onChange(syntheticEvent);
            }

            // Llamar onEmojiSelect si está disponible
            if (onEmojiSelect) {
                onEmojiSelect(emoji);
            }

            // Actualizar posición del cursor después de insertar emoji
            setTimeout(() => {
                const newCursorPosition = start + emoji.length;
                textarea.setSelectionRange(newCursorPosition, newCursorPosition);
                setCursorPosition(newCursorPosition);
                textarea.focus();
            }, 0);
        };

        const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            setCursorPosition(target.selectionStart || 0);
            if (props.onClick) {
                props.onClick(e);
            }
        };

        const handleTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            const target = e.target as HTMLTextAreaElement;
            setCursorPosition(target.selectionStart || 0);
            if (props.onKeyUp) {
                props.onKeyUp(e);
            }
        };

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <textarea
                        ref={ref || textareaRef}
                        className={textareaClasses}
                        value={value}
                        onChange={handleTextareaChange}
                        onClick={handleTextareaClick}
                        onKeyUp={handleTextareaKeyUp}
                        {...props}
                    />
                    {showEmojiPicker && (
                        <div className="absolute top-2 right-2">
                            <EmojiPicker
                                onEmojiSelect={handleEmojiSelect}
                                size="sm"
                            />
                        </div>
                    )}
                </div>
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

TextareaWithEmoji.displayName = 'TextareaWithEmoji';

export default TextareaWithEmoji;
