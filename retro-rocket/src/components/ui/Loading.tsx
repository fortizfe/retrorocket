import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface LoadingProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse';
    text?: string;
    className?: string;
}

const Loading: React.FC<LoadingProps> = ({
    size = 'md',
    variant = 'spinner',
    text,
    className
}) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12'
    };

    const textSizes = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    if (variant === 'spinner') {
        return (
            <div className={clsx('flex flex-col items-center justify-center', className)}>
                <motion.div
                    className={clsx(
                        'border-2 border-slate-200 dark:border-slate-600 border-t-primary-600 dark:border-t-primary-400 rounded-full',
                        sizes[size]
                    )}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                {text && (
                    <p className={clsx('mt-2 text-slate-600 dark:text-slate-400', textSizes[size])}>{text}</p>
                )}
            </div>
        );
    }

    if (variant === 'dots') {
        return (
            <div className={clsx('flex flex-col items-center justify-center', className)}>
                <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={clsx('bg-primary-600 dark:bg-primary-400 rounded-full', sizes[size])}
                            animate={{ y: [0, -8, 0] }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.1
                            }}
                        />
                    ))}
                </div>
                {text && (
                    <p className={clsx('mt-2 text-slate-600 dark:text-slate-400', textSizes[size])}>{text}</p>
                )}
            </div>
        );
    }

    if (variant === 'pulse') {
        return (
            <div className={clsx('flex flex-col items-center justify-center', className)}>
                <motion.div
                    className={clsx('bg-primary-600 dark:bg-primary-400 rounded-full', sizes[size])}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
                {text && (
                    <p className={clsx('mt-2 text-slate-600 dark:text-slate-400', textSizes[size])}>{text}</p>
                )}
            </div>
        );
    }

    return null;
};

export default Loading;
