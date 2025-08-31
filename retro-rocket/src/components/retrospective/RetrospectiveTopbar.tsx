import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Share2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import ExportButtonGroup from './ExportButtonGroup';
import { ResponsiveParticipantDisplay } from '../participants';
import { CountdownTimer, FacilitatorMenu } from '../countdown';
import { useRetrospective } from '../../hooks/useRetrospective';
import { useParticipants } from '../../hooks/useParticipants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useLanguage } from '../../hooks/useLanguage';

const RetrospectiveTopbar: React.FC<{ retrospectiveId?: string }> = ({ retrospectiveId }) => {
    const { id: paramId } = useParams<{ id: string }>();
    const id = retrospectiveId || paramId;
    const navigate = useNavigate();
    const { t } = useLanguage();

    const { retrospective } = useRetrospective(id);
    const { participants } = useParticipants(id);
    const { uid, fullName } = useCurrentUser();

    // Minimal local export placeholders; real data is provided by the board via callbacks or context
    const exportCards: any[] = [];
    const exportGroups: any[] = [];
    const exportActionItems: any[] = [];
    const sentimentAnalysis: any = null;

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
                        <h2 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {id ? 'Cargando...' : ''}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate">&nbsp;</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="hidden md:flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="min-w-0">
                    <h2 className="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {retrospective.title}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {t('retrospectivePage.connectedAs')} {fullName}
                    </p>
                </div>
                <div className="hidden md:block ml-4 flex-shrink-0">
                    <ResponsiveParticipantDisplay participants={participants || []} className="flex items-center" />
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                <CountdownTimer retrospectiveId={retrospective.id} />

                <div className="hidden md:flex items-center gap-2">
                    <ExportButtonGroup
                        retrospective={retrospective}
                        cards={exportCards}
                        groups={exportGroups}
                        participants={participants || []}
                        actionItems={exportActionItems}
                        sentimentAnalysis={sentimentAnalysis}
                        className="flex items-center gap-2"
                    />
                </div>

                <Button variant="outline" size="sm" onClick={handleCopyId} className="hidden sm:flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    <span className="hidden lg:inline">{t('retrospectivePage.copyId')}</span>
                </Button>

                <Button variant="outline" size="sm" onClick={handleShare} className="hidden sm:flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden lg:inline">{t('retrospectivePage.share')}</span>
                </Button>

                <Button variant="outline" size="sm" onClick={handleLeaveRetrospective} className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('retrospectivePage.exit')}</span>
                </Button>

                <FacilitatorMenu
                    retrospectiveId={retrospective.id}
                    facilitatorId={uid || ''}
                    isOwner={retrospective.createdBy === uid}
                    cards={exportCards}
                    columnConfigs={sentimentAnalysis?.columnConfigs || {}}
                    sentimentAnalysis={sentimentAnalysis}
                />
            </div>
        </div>
    );
};

export default RetrospectiveTopbar;
