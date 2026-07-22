import React from 'react';
import { motion } from 'framer-motion';
import { animations, shadows, borderRadius } from '@/lib/utils/designSystem';

interface SkeletonProps {
    className?: string;
    rounded?: keyof typeof borderRadius;
}

/**
 * Base Skeleton component with improved animations
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    rounded = 'md'
}) => {
    const baseClasses = `
    bg-border-default
    ${borderRadius[rounded]}
    ${animations.pulse}
    ${className}
  `;

    return (
        <output
            className={baseClasses}
            aria-label="Cargando contenido"
        />
    );
};

/**
 * Skeleton for retrospective column headers
 */
export const ColumnHeaderSkeleton: React.FC = () => {
    return (
        <div className={`${borderRadius.card} ${shadows.card} bg-surface-raised p-4 mb-4`}>
            <div className="flex items-center space-x-3">
                {/* Icon skeleton */}
                <Skeleton className="w-8 h-8" rounded="md" />

                <div className="flex-1 space-y-2">
                    {/* Title skeleton */}
                    <Skeleton className="h-5 w-3/5" />
                    {/* Description skeleton */}
                    <Skeleton className="h-3 w-4/5" />
                </div>
            </div>

            <div className="flex items-center justify-between mt-3">
                {/* Card count skeleton */}
                <Skeleton className="h-3 w-16" />
                {/* Button skeleton */}
                <Skeleton className="h-8 w-20" rounded="lg" />
            </div>
        </div>
    );
};

/**
 * Skeleton for retrospective cards
 */
export const CardSkeleton: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`${borderRadius.card} ${shadows.card} bg-surface-raised p-4 mb-3`}
        >
            {/* Card content */}
            <div className="space-y-3">
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                    {/* Author avatar */}
                    <Skeleton className="w-6 h-6" rounded="full" />
                    {/* Author name */}
                    <Skeleton className="h-3 w-12" />
                </div>

                <div className="flex items-center space-x-2">
                    {/* Like button */}
                    <Skeleton className="w-6 h-6" rounded="md" />
                    {/* Vote count */}
                    <Skeleton className="h-3 w-6" />
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Skeleton for the entire retrospective board
 */
export const RetrospectiveBoardSkeleton: React.FC = () => {
    const desktopColumns = React.useMemo(() =>
        Array.from({ length: 4 }, (_, i) => `desktop-col-${Date.now()}-${i}`), []
    );
    const mobileNavItems = React.useMemo(() =>
        Array.from({ length: 4 }, (_, i) => `mobile-nav-${Date.now()}-${i}`), []
    );
    const mobileCards = React.useMemo(() =>
        Array.from({ length: 3 }, (_, i) => `mobile-card-${Date.now()}-${i}`), []
    );

    return (
        <div className="h-full flex flex-col">
            {/* Header skeleton */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
            </div>

            {/* Desktop: Grid layout */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6 flex-1">
                {desktopColumns.map((colId) => (
                    <div key={colId} className="flex flex-col">
                        <ColumnHeaderSkeleton />
                        <div className="flex-1 space-y-3">
                            {Array.from({ length: 3 }, (_, cardIndex) => (
                                <CardSkeleton key={`${colId}-card-${cardIndex}`} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile: Single column */}
            <div className="lg:hidden">
                {/* Mobile navigation skeleton */}
                <div className="bg-surface-raised/95 border-b border-border-default/50 p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="w-8 h-8" />
                        <div className="flex space-x-2">
                            {mobileNavItems.map((navId) => (
                                <Skeleton key={navId} className="w-12 h-8" rounded="md" />
                            ))}
                        </div>
                        <Skeleton className="w-8 h-8" />
                    </div>
                </div>

                {/* Single column content */}
                <div className="flex flex-col">
                    <ColumnHeaderSkeleton />
                    <div className="space-y-3">
                        {mobileCards.map((cardId) => (
                            <CardSkeleton key={cardId} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Skeleton for action items column
 */
export const ActionItemsSkeleton: React.FC = () => {
    const actionItems = React.useMemo(() =>
        Array.from({ length: 2 }, (_, i) => `action-item-${Date.now()}-${i}`), []
    );

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className={`${borderRadius.card} ${shadows.card} bg-surface-raised p-4 mb-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Skeleton className="w-6 h-6" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="w-8 h-8" rounded="md" />
                </div>
            </div>

            {/* Action items */}
            <div className="space-y-3">
                {actionItems.map((itemId) => (
                    <div key={itemId} className={`${borderRadius.card} ${shadows.card} bg-surface-raised p-4`}>
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-5/6" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Skeleton className="w-6 h-6" rounded="full" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                                <Skeleton className="h-3 w-12" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Skeleton for participant list
 */
export const ParticipantListSkeleton: React.FC = () => {
    const participants = React.useMemo(() =>
        Array.from({ length: 3 }, (_, i) => `participant-${Date.now()}-${i}`), []
    );

    return (
        <div className="flex items-center space-x-2">
            {participants.map((participantId) => (
                <Skeleton key={participantId} className="w-8 h-8" rounded="full" />
            ))}
            <div className="flex items-center space-x-1 ml-2">
                <span className="text-sm text-text-muted">+</span>
                <Skeleton className="h-3 w-4" />
            </div>
        </div>
    );
};

/**
 * Skeleton with shimmer effect for premium feel
 */
export const ShimmerSkeleton: React.FC<SkeletonProps> = ({
    className = '',
    rounded = 'md'
}) => {
    return (
        <output
            className={`
        relative overflow-hidden
        bg-border-default
        ${borderRadius[rounded]}
        ${className}
      `}
            aria-label="Cargando contenido"
        >
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-border-default/20 to-transparent"
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 1.5,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 0.5,
                }}
            />
        </output>
    );
};

export default Skeleton;
