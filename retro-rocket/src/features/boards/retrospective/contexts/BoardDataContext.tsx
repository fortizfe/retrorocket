import { useState, useCallback, ReactNode } from 'react';
import { BoardData, BoardDataContext, BoardDataSetter, BoardDataSetterContext, EMPTY_BOARD } from '@/features/boards/retrospective/contexts/useBoardData';

export function BoardDataStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [data, setData] = useState<BoardData | null>(null);
    const setter = useCallback<BoardDataSetter>((d) => setData(d), []);
    return (
        <BoardDataSetterContext.Provider value={setter}>
            <BoardDataContext.Provider value={data ?? EMPTY_BOARD}>
                {children}
            </BoardDataContext.Provider>
        </BoardDataSetterContext.Provider>
    );
}
