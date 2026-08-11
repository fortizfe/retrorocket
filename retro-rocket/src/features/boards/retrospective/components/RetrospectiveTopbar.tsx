import React from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Share2, ArrowLeft, Menu as MenuIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import BottomSheet from '@/lib/components/ui/BottomSheet';
import { ResponsiveParticipantDisplay } from '@/features/boards/participants/components/index';
import { CountdownTimer, FacilitatorMenu } from '@/features/boards/countdown/components/index';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import { useUnifiedExport } from '@/features/boards/export/hooks/useUnifiedExport';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';

/**
 * The topbar's options menu (export/copy/share/exit), rebuilt on the
 * Apple HIG-inspired "Adaptive Sheet" direction (feature 036, clarity-
 * forward: opaque panels, visible borders) selected by the product owner
 * during that feature's design review. Desktop keeps the `useBoardMenuOverlay`-
 * anchored dropdown introduced in feature 033/034; a new mobile entry point
 * (FR-013a) opens the same four actions in a `BottomSheet`, since no mobile
 * path to this menu existed before this feature — the desktop and mobile
 * triggers share one `open`/`setOpen` state from the same overlay hook call,
 * with CSS (`hidden md:*` / `md:hidden`) selecting which trigger and panel
 * are reachable at the current viewport.
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

    // Feature 038 (FR-007a): lifted from ImprovedExportPopover.tsx up to this
    // component — the export window's own open/closed state — so the job's
    // isExporting/progress/error/success state survives the window being
    // dismissed mid-export instead of being lost when the child unmounts.
    // ImprovedExportPopover consumes these as props rather than calling the
    // hook itself (research.md §4).
    const {
        isExporting: isExportingRetro,
        progress: exportProgress,
        error: exportError,
        success: exportSuccess,
        exportRetrospective: exportRetrospectiveJob,
        resetState: resetExportState,
    } = useUnifiedExport();

    const { open: optionsOpen, setOpen: setOptionsOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
    });
    // Feature 038 (FR-002): a second useBoardMenuOverlay instance for the export
    // panel, sharing the SAME "Options" trigger button as the instance above via a
    // merged ref callback (research.md §2) — no new always-visible export trigger is
    // introduced. Independent `open`/`setOpen` state from the options panel's own
    // instance: two Floating UI instances can each track their own floating state
    // against one shared reference node without conflict (confirmed by a real test,
    // T011), and selecting "Export" explicitly closes the options panel before
    // opening this one (FR-002), so the two are never open at once in practice.
    const {
        open: exportOpen,
        setOpen: setExportOpen,
        context: exportContext,
        refs: exportRefs,
        floatingStyles: exportFloatingStyles,
        getFloatingProps: getExportFloatingProps,
    } = useBoardMenuOverlay({ placement: 'bottom-end', role: 'dialog' });

    const setSharedOptionsTriggerRef = (node: HTMLButtonElement | null) => {
        refs.setReference(node);
        exportRefs.setReference(node);
    };

    // Deliberately separate state from `optionsOpen`/`exportOpen`, not reused: both
    // sheets are portaled to `document.body` (see BottomSheet.tsx), outside the
    // Floating-UI-anchored dropdowns' own DOM subtree. `useBoardMenuOverlay`'s
    // `useDismiss` treats any press outside that subtree as an outside click —
    // including a press *inside* a sheet — so sharing a boolean closed the sheet (and
    // unmounted whatever was just clicked) before its own onClick could fire. Found
    // via a real failing test, not by inspection; the same pitfall applies identically
    // to the export sheet (research.md §3), so it gets its own independent state too.
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [exportSheetOpen, setExportSheetOpen] = React.useState(false);

    // Surfaces the export outcome via a toast only when neither export presentation is
    // open to show it in-panel — the guard prevents a duplicate notification for the
    // common case (window still open, in-panel success/error banner already covers
    // it). Runs once per success/error transition (the effect only re-fires when one
    // of these actually changes value).
    const exportWindowOpen = exportOpen || exportSheetOpen;
    React.useEffect(() => {
        if (!exportWindowOpen && exportSuccess) {
            toast.success(t('retrospective.export.success') || 'Exportación completada');
        }
    }, [exportSuccess, exportWindowOpen, t]);

    React.useEffect(() => {
        if (!exportWindowOpen && exportError) {
            toast.error(exportError);
        }
    }, [exportError, exportWindowOpen]);

    // Auto-closes whichever export presentation is open once its success confirmation
    // has had its moment (US1 Acceptance Scenario 3) — a LOCAL timer started only when
    // `success` becomes true *while the window is open*, deliberately independent of
    // useUnifiedExport's own internal 3s success-display timeout. An earlier version
    // watched that hook's success true→false edge directly; a real failing e2e test
    // (export.spec.ts's PDF-then-DOCX flow) caught the race that created: the hook's
    // fire-and-forget setTimeout isn't scoped to one export call, so reopening the
    // window shortly after a previous export (well within its 3s window) would let that
    // stale timer force-close the window mid-way through a brand-new, unrelated export.
    // Scoping the close to our own effect — cleaned up (cancelled) the instant the
    // window closes or success clears for any reason — removes that cross-talk entirely.
    React.useEffect(() => {
        if (!exportSuccess || !exportWindowOpen) return;
        const timer = setTimeout(() => {
            setExportOpen(false);
            setExportSheetOpen(false);
        }, 2800);
        return () => clearTimeout(timer);
    }, [exportSuccess, exportWindowOpen, setExportOpen]);

    const optionsLabel = t('retrospectivePage.options') || 'Opciones';

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

    const exportLabel = t('retrospective.export.exportText') || 'Export';
    const copyIdItem = { icon: Copy, label: t('retrospectivePage.copyId'), onClick: handleCopyId };
    const shareItem = { icon: Share2, label: t('retrospectivePage.share'), onClick: handleShare };
    const exitItem = { icon: ArrowLeft, label: t('retrospectivePage.exit'), onClick: handleLeaveRetrospective };

    // Opening the export window resets a STALE completed job (success/error left over
    // from a previous export) so the newly-opened window shows fresh defaults (FR-002
    // Acceptance Scenario 4) — unless a job is actively running right now, in which case
    // reopening must keep showing its live progress instead (FR-007). Without this,
    // reopening shortly after a previous export's success (well within
    // useUnifiedExport's own 3s success-display window) would carry that stale
    // `success: true` into the new session, and its still-pending internal timer could
    // later force-close the window mid-way through a brand-new, unrelated export — a
    // real race caught by e2e/export.spec.ts's PDF-then-DOCX flow, not by inspection.
    const openExportWindow = (open: (v: boolean) => void) => {
        if (!isExportingRetro) resetExportState();
        open(true);
    };

    // Export's onClick differs by viewport (FR-002 vs FR-003): desktop closes the
    // options panel and opens the anchored export panel from the same trigger;
    // mobile closes the options sheet and opens the export bottom sheet. The other
    // three items behave identically either way.
    const desktopOptionsItems = [
        { icon: Copy, label: exportLabel, onClick: () => { setOptionsOpen(false); openExportWindow(setExportOpen); } },
        copyIdItem,
        shareItem,
        exitItem,
    ];
    const mobileOptionsItems = [
        { icon: Copy, label: exportLabel, onClick: () => { setSheetOpen(false); openExportWindow(setExportSheetOpen); } },
        copyIdItem,
        shareItem,
        exitItem,
    ];

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
        <>
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

                    {/* Compact options button that groups export/share/copy/exit — also
                        the export panel's own anchor (FR-002), via the merged ref below. */}
                    <div className="flex items-center gap-2">
                        <button
                            ref={setSharedOptionsTriggerRef}
                            {...getReferenceProps()}
                            className="inline-flex p-2.5 rounded-lg bg-surface hover:bg-surface-raised text-text-secondary hover:text-text-primary border border-border-default shadow-sm transition-colors items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            title={optionsLabel}
                            aria-label={optionsLabel}
                        >
                            <MenuIcon className="w-5 h-5" />
                            <span className="hidden lg:inline font-medium text-sm">{optionsLabel}</span>
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
                                            aria-label={optionsLabel}
                                            className="w-56 bg-surface-raised border border-border-default rounded-xl shadow-2xl overflow-hidden z-[99999]"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, transform: 'translateY(-4px)' }}
                                                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                                                exit={{ opacity: 0, transform: 'translateY(-4px)' }}
                                                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                                className="p-1.5"
                                            >
                                                {desktopOptionsItems.map((item) => (
                                                    <button
                                                        key={item.label}
                                                        onClick={() => { item.onClick(); setOptionsOpen(false); }}
                                                        role="menuitem"
                                                        className="w-full text-left px-3 py-2 rounded-md hover:bg-surface flex items-center gap-2 text-sm font-medium text-text-primary transition-colors"
                                                    >
                                                        <item.icon className="w-4 h-4 text-text-secondary" />
                                                        <span>{item.label}</span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </div>
                                    </FloatingFocusManager>
                                )}
                            </AnimatePresence>
                        </FloatingPortal>

                        {/* Export panel (feature 038, FR-002) — anchored to the same
                            trigger as the options panel above via the merged ref
                            (setSharedOptionsTriggerRef), not a dedicated trigger of its
                            own. Structurally identical wrapper to the options panel's
                            (and FacilitatorMenu.tsx's) own Floating-UI-safe pattern. */}
                        <FloatingPortal>
                            <AnimatePresence>
                                {exportOpen && (
                                    <FloatingFocusManager context={exportContext} modal={false}>
                                        <div
                                            ref={exportRefs.setFloating}
                                            style={exportFloatingStyles}
                                            {...getExportFloatingProps()}
                                            aria-label={t('retrospective.export.title')}
                                            className="z-[99999]"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, transform: 'translateY(-4px)' }}
                                                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                                                exit={{ opacity: 0, transform: 'translateY(-4px)' }}
                                                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                            >
                                                <ImprovedExportPopover
                                                    retrospective={retrospective}
                                                    cards={exportCards}
                                                    groups={exportGroups}
                                                    participants={participants || []}
                                                    facilitatorNotes={myFacilitatorNotes}
                                                    actionItems={exportActionItems}
                                                    sentimentAnalysis={sentimentAnalysis}
                                                    onClose={() => setExportOpen(false)}
                                                    presentation="desktop"
                                                    isExporting={isExportingRetro}
                                                    progress={exportProgress}
                                                    error={exportError}
                                                    success={exportSuccess}
                                                    exportRetrospective={exportRetrospectiveJob}
                                                    resetState={resetExportState}
                                                />
                                            </motion.div>
                                        </div>
                                    </FloatingFocusManager>
                                )}
                            </AnimatePresence>
                        </FloatingPortal>
                    </div>
                </div>
            </div>

            {/* Mobile entry point (FR-013a) — the options menu had no reachable
                path below the `md` breakpoint before this feature. The rest of
                the topbar (title, participants, countdown display) stays out of
                scope per spec.md's Edge Cases; only the menu itself needs to be
                reachable here. */}
            <div className="flex md:hidden items-center gap-2 ml-auto flex-shrink-0">
                <button
                    onClick={() => setSheetOpen(true)}
                    className="inline-flex p-3 rounded-lg bg-surface hover:bg-surface-raised text-text-secondary border border-border-default shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    title={optionsLabel}
                    aria-label={optionsLabel}
                >
                    <MenuIcon className="w-5 h-5" />
                </button>
            </div>

            {/* FacilitatorMenu owns its own responsive presentation internally
                (a desktop `hidden md:inline-flex` trigger + panel, and a
                `md:hidden` mobile trigger + BottomSheet — FacilitatorMenu.tsx).
                It MUST render here, outside both viewport-conditional branches
                above, not nested inside either — nesting it inside the
                desktop-only branch previously made its own mobile trigger
                permanently unreachable regardless of its own `md:hidden`
                class, since a `display: none` ANCESTOR always wins over a
                child's own display value. Found via live verification in a
                real browser, not by inspection — no unit test (none apply
                real CSS) could have caught this class of bug. */}
            <FacilitatorMenu
                retrospectiveId={retrospective.id}
                facilitatorId={uid || ''}
                isOwner={retrospective.createdBy === uid}
                cards={exportCards}
                columnConfigs={columnConfigs}
                timer={timer}
                myFacilitatorNotes={myFacilitatorNotes}
            />

            <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={optionsLabel} heightClass="max-h-[40vh]">
                <div className="p-2 md:hidden">
                    {mobileOptionsItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => { item.onClick(); setSheetOpen(false); }}
                            className="w-full text-left px-4 py-3.5 rounded-lg hover:bg-surface flex items-center gap-3 text-base font-medium text-text-primary transition-colors"
                        >
                            <item.icon className="w-5 h-5 text-text-secondary" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            </BottomSheet>

            {/* Export window — mobile presentation (feature 038, FR-003): reuses
                BottomSheet.tsx unchanged, with its own independent open state
                (exportSheetOpen), not shared with the options sheet's own. */}
            <BottomSheet
                open={exportSheetOpen}
                onClose={() => setExportSheetOpen(false)}
                title={t('retrospective.export.title')}
                heightClass="max-h-[85vh]"
            >
                <ImprovedExportPopover
                    retrospective={retrospective}
                    cards={exportCards}
                    groups={exportGroups}
                    participants={participants || []}
                    facilitatorNotes={myFacilitatorNotes}
                    actionItems={exportActionItems}
                    sentimentAnalysis={sentimentAnalysis}
                    onClose={() => setExportSheetOpen(false)}
                    presentation="mobile"
                    isExporting={isExportingRetro}
                    progress={exportProgress}
                    error={exportError}
                    success={exportSuccess}
                    exportRetrospective={exportRetrospectiveJob}
                    resetState={resetExportState}
                />
            </BottomSheet>
        </>
    );
};

export default RetrospectiveTopbar;
