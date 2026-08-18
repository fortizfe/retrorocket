import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from '@/features/boards/types/typing';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface TypingPreviewProps {
    typingUsers: TypingIndicator[];
    className?: string;
    isAnonymous: boolean;
}

function formatTypingText(
    typingUsers: TypingIndicator[],
    t: (key: string, options?: Record<string, unknown>) => string,
    isAnonymous: boolean
): string {
    if (isAnonymous && typingUsers.length > 0) {
        return t('typing.anonymous');
    } else if (typingUsers.length === 0) {
        return '';
    } else if (typingUsers.length === 1) {
        return t('typing.single', { username: typingUsers[0].username });
    } else if (typingUsers.length === 2) {
        return t('typing.double', { username1: typingUsers[0].username, username2: typingUsers[1].username });
    } else {
        return t('typing.multiple', { username: typingUsers[0].username, count: typingUsers.length - 1 });
    }
}

/**
 * Component to show who is currently typing in a column
 */
const TypingPreview: React.FC<TypingPreviewProps> = ({
    typingUsers,
    className = '',
    isAnonymous
}) => {
    const { t } = useLanguage();

    // Two-step transition to empty (feature 034, FR-013/Contract 4): AnimatePresence
    // freezes the *last-rendered* card for the length of its exit transition when
    // `typingUsers` drops to zero — long enough for a departing typist's name to stay
    // visible/queryable while a *different* column's genuinely-active indicator is
    // also showing the same "... está escribiendo" text, which is indistinguishable
    // from a real duplicate to anything asserting on that text globally (same defect
    // class as the facilitator-note duplicate-on-save bug, research.md §3/§4).
    // `displayedUsers` is cleared in its own commit (via flushSync), strictly before
    // `isPresent` flips AnimatePresence's gate in a follow-up commit, so the frozen
    // exit snapshot's content is always empty — never a departing typist's name —
    // regardless of animation timing or how fast another column's own indicator
    // appears.
    const [displayedUsers, setDisplayedUsers] = useState(typingUsers);
    const [isPresent, setIsPresent] = useState(typingUsers.length > 0);

    useEffect(() => {
        if (typingUsers.length > 0) {
            setDisplayedUsers(typingUsers);
            setIsPresent(true);
            return;
        }
        if (isPresent) {
            flushSync(() => setDisplayedUsers([]));
            setIsPresent(false);
        }
    }, [typingUsers, isPresent]);

    // Always mounted, independent of the visual card below (which mounts/unmounts via
    // AnimatePresence): a role="status" region that doesn't yet exist in the DOM when
    // its content first changes is unreliably announced by screen readers, so this
    // stays present with empty text rather than appearing only alongside the card
    // (feature 026, FR-009, research.md §4). Mirrors `typingUsers` directly (not the
    // frozen `displayedUsers`) so screen readers announce a stop immediately rather
    // than waiting on the visual card's exit transition.
    const liveRegion = (
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {formatTypingText(typingUsers, t, isAnonymous)}
        </span>
    );

    // AnimatePresence must stay mounted across the typingUsers -> empty transition —
    // an early `if (typingUsers.length === 0) return liveRegion` (previously above)
    // skipped this whole tree in one step, so the card's exit animation was dead code
    // (design audit finding, spec 028; same class as DAF-001). `isPresent` (not
    // `typingUsers.length` directly) now gates the content inside AnimatePresence, so
    // its exit can be sequenced after `displayedUsers` clears (see effect above).
    return (
        <>
            {liveRegion}
            <AnimatePresence>
                {isPresent && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 0.8
                }}
                className={`
          bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/50 dark:to-blue-950/50
          border border-info-fg/40
          rounded-xl p-3
          shadow-soft shadow-primary-100/50 dark:shadow-primary-900/20
          backdrop-blur-sm
          ${className}
        `}
            >
                <div className="flex items-center space-x-2">
                    {/* Animated avatars (feature 052: hidden entirely on anonymous boards,
                        since exposing a typist's initials/count contradicts the generic
                        "A user is typing" text shown in that mode) */}
                    {!isAnonymous && (
                    <div className="flex -space-x-1">
                        {displayedUsers.slice(0, 3).map((user, index) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="
                  relative inline-flex items-center justify-center
                  w-6 h-6
                  bg-gradient-to-br from-primary-400 to-blue-500
                  text-white text-xs font-medium
                  rounded-full
                  ring-2 ring-surface
                  shadow-sm
                "
                                title={user.username}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </motion.div>
                        ))}
                        {displayedUsers.length > 3 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="
                  relative inline-flex items-center justify-center
                  w-6 h-6
                  bg-gradient-to-br from-slate-400 to-slate-500
                  text-white text-xs font-medium
                  rounded-full
                  ring-2 ring-surface
                  shadow-sm
                "
                                title={`+${displayedUsers.length - 3} más`}
                            >
                                +{displayedUsers.length - 3}
                            </motion.div>
                        )}
                    </div>
                    )}

                    {/* Typing text with animated dots */}
                    <div className="flex items-center">
                        <span className="text-sm text-blue-700 font-medium">
                            {formatTypingText(displayedUsers, t, isAnonymous)}
                        </span>
                        <TypingDots />
                    </div>
                </div>
                </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

/**
 * Animated typing dots component
 */
const TypingDots: React.FC = () => {
    return (
        <div className="flex items-center space-x-1 ml-1">
            {[0, 1, 2].map((index) => (
                <motion.div
                    key={index}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: index * 0.2,
                        ease: "easeInOut",
                    }}
                    className="w-1 h-1 bg-action rounded-full"
                />
            ))}
        </div>
    );
};

export default TypingPreview;
