import React from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Share2, ArrowLeft, Menu as MenuIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
// Button unused in this topbar refactor
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import { ResponsiveParticipantDisplay } from '@/features/boards/participants/components/index';
import { CountdownTimer, FacilitatorMenu } from '@/features/boards/countdown/components/index';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';

/**
 * The topbar's compact options menu (export/copy/share/exit), rebuilt on the
 * shared `useBoardMenuOverlay` (feature 033, tasks.md T013/T054) — the fifth
 * and final of the board's menus this hook consolidates. Previously hand-rolled
 * `getBoundingClientRect` positioning, `mousedown` outside-click, and its own
 * Escape-key listener; all now provided by the shared hook.
 */
const RetrospectiveTopbar: React.FC<{ retrospectiveId?: string }> = ({ retrospectiveId }) => {
    const { id: paramId } = useParams<{ id: string }>();
    const id = retrospectiveId || paramId;
    const navigate = useNavigate();
    const { t } = useLanguage();

    // Sourced from RetrospectivePage's useRetrospectiveRealtimeSync via BoardDataContext
    // (feature 019, US1) — this topbar (rendered by the global Header, a sibling of
    // RetrospectivePage's own tree) no longer opens its own independent Firestore
    // subscription for the same board.
    const { retrospective, participants, cards: exportCards, groups: exportGroups, actionItems: exportActionItems, columnConfigs, timer, myFacilitatorNotes } = useBoardData();
    const { uid } = useCurrentUser();
    const sentimentAnalysis = useSentimentContext();

    const [showExportPopover, setShowExportPopover] = React.useState(false);
    const { open: optionsOpen, setOpen: setOptionsOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
    });

    const handleLeaveRetrospective = async () => {
        toast.success(t('retrospectivePage.backToDashboard') || 'Volviendo al dashboard');
        navigate('/dashboard');
    };

    const handleCopyId = () => {
        if (id) {
            navigator.clipboard.writeText(id);
            toast.success(t('retrospectivePage.copyId') || 'ID copiado al portapapeles');
        }
    };

    const handleShare = () => {
        if (id) {
            const url = `${window.location.origin}/retro/${id}`;
            navigator.clipboard.writeText(url);
            toast.success(t('retrospectivePage.share') || 'Enlace copiado al portapapeles');
        }
    };

    // If we don't have retrospective data yet, show a compact placeholder
    // so the top area is not empty (helps when Header is rendered outside route params)
    if (!retrospective) {
        return (
            <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                        <h2 className="text-base md:text-lg font-semibold text-text-primary truncate">
                            {id ? 'Cargando...' : ''}
                        </h2>
                        <p className="text-xs text-text-secondary truncate">&nbsp;</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0">
                    <h2 className="text-base md:text-lg font-semibold text-text-primary truncate">
                        {retrospective.title}
                    </h2>
                    {/* subtitle removed: redundant with user menu */}
                </div>
                <div className="hidden md:block ml-4 flex-shrink-0">
                    <ResponsiveParticipantDisplay participants={participants || []} className="flex items-center" />
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <CountdownTimer retrospectiveId={retrospective.id} timer={timer} />

                {/* Compact options hamburger that groups export/share/copy/exit */}
                <div className="flex items-center gap-2">
                    <button
                        ref={refs.setReference}
                        {...getReferenceProps()}
                        className="hidden sm:inline-flex p-2.5 rounded-lg bg-surface-raised/80 hover:bg-surface-raised text-text-secondary hover:text-text-primary border border-border-default/50 hover:border-border-strong shadow-sm hover:shadow-md transition-[background-color,color,border-color,box-shadow] duration-200 backdrop-blur-sm items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        title={t('retrospectivePage.options') || 'Opciones'}
                        aria-label={t('retrospectivePage.options') || 'Opciones'}
                    >
                        <motion.div animate={{ rotate: optionsOpen ? 90 : 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
                            {optionsOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <MenuIcon className="w-5 h-5" />
                            )}
                        </motion.div>
                        <span className="hidden lg:inline font-medium">{t('retrospectivePage.options') || 'Opciones'}</span>
                    </button>

                    <FloatingPortal>
                        <AnimatePresence>
                            {optionsOpen && (
                                <FloatingFocusManager context={context} modal={false}>
                                    {/* Positioning wrapper: carries Floating UI's `ref`/`style` (whose
                                        `transform` encodes the anchor offset) and all interaction/ARIA
                                        props. Deliberately NOT a `motion.div` — Framer Motion's own
                                        `animate`/`exit` write their own `transform` (from `y`/`scale`)
                                        onto whatever node they're applied to, which would silently
                                        overwrite Floating UI's positioning transform and pin the panel to
                                        the viewport's top-left corner (research.md §1, feature 034). The
                                        entrance/exit animation lives on the nested `motion.div` below
                                        instead, matching ReactionPicker.tsx's already-correct pattern. */}
                                    <div
                                        ref={refs.setFloating}
                                        style={floatingStyles}
                                        {...getFloatingProps()}
                                        aria-label={t('retrospectivePage.options') || 'Opciones'}
                                        className="w-56 bg-surface-raised/95 backdrop-blur-xl border border-border-default/40 rounded-2xl shadow-2xl overflow-hidden z-[99999]"
                                    >
                                        <motion.div
                                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                        >
                                            <div className="p-2">
                                                <button
                                                    onClick={() => { setShowExportPopover(true); setOptionsOpen(false); }}
                                                    role="menuitem"
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 text-sm text-text-secondary transition-colors"
                                                >
                                                    <Copy className="w-4 h-4 text-text-muted" />
                                                    <span>{t('retrospective.export.exportText') || 'Export'}</span>
                                                </button>

                                                <button
                                                    onClick={() => { handleCopyId(); setOptionsOpen(false); }}
                                                    role="menuitem"
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 text-sm text-text-secondary mt-1 transition-colors"
                                                >
                                                    <Copy className="w-4 h-4 text-text-muted" />
                                                    <span>{t('retrospectivePage.copyId')}</span>
                                                </button>

                                                <button
                                                    onClick={() => { handleShare(); setOptionsOpen(false); }}
                                                    role="menuitem"
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 text-sm text-text-secondary mt-1 transition-colors"
                                                >
                                                    <Share2 className="w-4 h-4 text-text-muted" />
                                                    <span>{t('retrospectivePage.share')}</span>
                                                </button>

                                                <button
                                                    onClick={() => { handleLeaveRetrospective(); setOptionsOpen(false); }}
                                                    role="menuitem"
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface flex items-center gap-2 text-sm text-text-secondary mt-1 transition-colors"
                                                >
                                                    <ArrowLeft className="w-4 h-4 text-text-muted" />
                                                    <span>{t('retrospectivePage.exit')}</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </div>
                                </FloatingFocusManager>
                            )}
                        </AnimatePresence>
                    </FloatingPortal>
                </div>

                {/* Export popover mounted at topbar level so it isn't trapped inside the options menu portal */}
                <ImprovedExportPopover
                    retrospective={retrospective}
                    cards={exportCards}
                    groups={exportGroups}
                    participants={participants || []}
                    facilitatorNotes={myFacilitatorNotes}
                    actionItems={exportActionItems}
                    sentimentAnalysis={sentimentAnalysis}
                    isOpen={showExportPopover}
                    onClose={() => setShowExportPopover(false)}
                />

                <FacilitatorMenu
                    retrospectiveId={retrospective.id}
                    facilitatorId={uid || ''}
                    isOwner={retrospective.createdBy === uid}
                    cards={exportCards}
                    columnConfigs={columnConfigs}
                    timer={timer}
                    myFacilitatorNotes={myFacilitatorNotes}
                />
            </div>
        </div>
    );
};

export default RetrospectiveTopbar;
