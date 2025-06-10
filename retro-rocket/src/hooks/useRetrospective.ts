import { useEffect, useState } from 'react';
import { getRetrospectiveData, updateRetrospectiveData } from '../services/retrospectiveService';
import { Retrospective } from '../types/retrospective';

const useRetrospective = (panelId: string) => {
    const [retrospective, setRetrospective] = useState<Retrospective | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRetrospective = async () => {
            try {
                const data = await getRetrospectiveData(panelId);
                setRetrospective(data);
            } catch (err) {
                setError('Error fetching retrospective data');
            } finally {
                setLoading(false);
            }
        };

        fetchRetrospective();
    }, [panelId]);

    const updateRetrospective = async (updatedData: Retrospective) => {
        setLoading(true);
        try {
            await updateRetrospectiveData(panelId, updatedData);
            setRetrospective(updatedData);
        } catch (err) {
            setError('Error updating retrospective data');
        } finally {
            setLoading(false);
        }
    };

    return { retrospective, loading, error, updateRetrospective };
};

export default useRetrospective;