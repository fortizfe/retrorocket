import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Share2, ArrowLeft, Menu as MenuIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
// Button unused in this topbar refactor
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import { ResponsiveParticipantDisplay } from '@/features/boards/participants/components/index';
import { CountdownTimer, FacilitatorMenu } from '@/features/boards/countdown/components/index';
import { useRetrospective } from '@/features/boards/retrospective/hooks/useRetrospective';
import { useParticipants } from '@/features/boards/participants/hooks/useParticipants';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment/contexts/SentimentContext';
import { useBoardData } from '@/features/boards/retrospective/contexts/BoardDataContext';

const RetrospectiveTopbar: React.FC<{ retrospectiveId?: string }> = ({ retrospectiveId }) => {
    const { id: paramId } = useParams<{ id: string }>();
    const id = retrospectiveId || paramId;
    const navigate = useNavigate();
    const { t } = useLanguage();

    const { retrospective } = useRetrospective(id);
    const { participants } = useParticipants(id);
    const { uid } = useCurrentUser();
    const sentimentAnalysis = useSentimentContext();
    const { cards: exportCards, groups: exportGroups, actionItems: exportActionItems, columnConfigs } = useBoardData();

    // Menu state for compact options menu (portal)
    const [optionsOpen, setOptionsOpen] = React.useState(false);
    const [showExportPopover, setShowExportPopover] = React.useState(false);
    const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const menuRef = React.useRef<HTMLDivElement | null>(null);
    const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);

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

    const openOptionsMenu = useCallback(() => {
        if (menuButtonRef.current) {
            setTriggerRect(menuButtonRef.current.getBoundingClientRect());
        }
        setOptionsOpen(true);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                optionsOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                menuButtonRef.current &&
                !menuButtonRef.current.contains(event.target as Node)
            ) {
                setOptionsOpen(false);
            }
        };

        if (optionsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [optionsOpen]);

    // Focus menu when opened for keyboard navigation
    useEffect(() => {
        if (optionsOpen && menuRef.current) {
            // small timeout to wait for portal mount
            setTimeout(() => menuRef.current?.focus(), 50);
        }
    }, [optionsOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && optionsOpen) {
                setOptionsOpen(false);
            }
        };

        if (optionsOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [optionsOpen]);

    // Positioning logic similar to FacilitatorMenu
    const getPositionStyles = () => {
        if (!triggerRect) return {};

        const dropdownWidth = 224; // w-56
        const maxHeight = window.innerHeight * 0.8;
        const spacing = 8;

        const left = Math.max(spacing, triggerRect.right - dropdownWidth);
        let top = triggerRect.bottom + spacing;

        if (top + maxHeight > window.innerHeight - spacing) {
            const spaceAbove = triggerRect.top - spacing;
            const spaceBelow = window.innerHeight - triggerRect.bottom - spacing;

            if (spaceAbove > spaceBelow && spaceAbove >= 160) {
                top = Math.max(spacing, triggerRect.top - maxHeight - spacing);
            } else {
                top = Math.max(spacing, window.innerHeight - maxHeight - spacing);
            }
        }

        return { left: `${left}px`, top: `${top}px` };
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
                <CountdownTimer retrospectiveId={retrospective.id} />

                {/* Compact options hamburger that groups export/share/copy/exit */}
                <div className="flex items-center gap-2">
                    <button
                        ref={menuButtonRef}
                        onClick={() => (optionsOpen ? setOptionsOpen(false) : openOptionsMenu())}
                        className="hidden sm:inline-flex p-2.5 rounded-lg bg-surface-raised/80 hover:bg-surface-raised text-text-secondary hover:text-text-primary border border-border-default/50 hover:border-border-strong shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm items-center gap-2"
                        title={t('retrospectivePage.options') || 'Opciones'}
                        aria-label={t('retrospectivePage.options') || 'Opciones'}
                        aria-haspopup="true"
                    >
                        <motion.div animate={{ rotate: optionsOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                            {optionsOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <MenuIcon className="w-5 h-5" />
                            )}
                        </motion.div>
                        <span className="hidden lg:inline font-medium">{t('retrospectivePage.options') || 'Opciones'}</span>
                    </button>

                    {/* Menu content rendered in portal for better stacking */}
                    {/* Portal dropdown to mimic FacilitatorMenu */}
                    {optionsOpen && createPortal(
                        <AnimatePresence>
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                transition={{ duration: 0.16 }}
                                className="fixed z-[99999]"
                                style={getPositionStyles()}
                            >
                                <div className="w-56 bg-surface-raised border border-border-default rounded-lg shadow-xl overflow-hidden" role="menu" tabIndex={-1}>
                                    <div className="p-2">
                                        <button
                                            onClick={() => { setShowExportPopover(true); setOptionsOpen(false); }}
                                            role="menuitem"
                                            className="w-full text-left px-3 py-2 rounded hover:bg-surface-raised flex items-center gap-2 text-sm text-text-secondary"
                                        >
                                            <Copy className="w-4 h-4 text-text-muted" />
                                            <span>{t('retrospective.export.exportText') || 'Export'}</span>
                                        </button>

                                        <button
                                            onClick={() => { handleCopyId(); setOptionsOpen(false); }}
                                            role="menuitem"
                                            className="w-full text-left px-3 py-2 rounded hover:bg-surface-raised flex items-center gap-2 text-sm text-text-secondary mt-1"
                                        >
                                            <Copy className="w-4 h-4 text-text-muted" />
                                            <span>{t('retrospectivePage.copyId')}</span>
                                        </button>

                                        <button
                                            onClick={() => { handleShare(); setOptionsOpen(false); }}
                                            role="menuitem"
                                            className="w-full text-left px-3 py-2 rounded hover:bg-surface-raised flex items-center gap-2 text-sm text-text-secondary mt-1"
                                        >
                                            <Share2 className="w-4 h-4 text-text-muted" />
                                            <span>{t('retrospectivePage.share')}</span>
                                        </button>

                                        <button
                                            onClick={() => { handleLeaveRetrospective(); setOptionsOpen(false); }}
                                            role="menuitem"
                                            className="w-full text-left px-3 py-2 rounded hover:bg-surface-raised flex items-center gap-2 text-sm text-text-secondary mt-1"
                                        >
                                            <ArrowLeft className="w-4 h-4 text-text-muted" />
                                            <span>{t('retrospectivePage.exit')}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>,
                        document.body
                    )}
                </div>

                {/* Export popover mounted at topbar level so it isn't trapped inside the options menu portal */}
                <ImprovedExportPopover
                    retrospective={retrospective}
                    cards={exportCards}
                    groups={exportGroups}
                    participants={participants || []}
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
                />
            </div>
        </div>
    );
};

export default RetrospectiveTopbar;
