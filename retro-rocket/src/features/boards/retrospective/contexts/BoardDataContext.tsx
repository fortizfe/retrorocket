import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';

export interface BoardData {
    cards: Card[];
    groups: CardGroup[];
    actionItems: ActionItem[];
    columnConfigs: Record<string, unknown>;
    isFacilitator: boolean;
}

const EMPTY_BOARD: BoardData = {
    cards: [],
    groups: [],
    actionItems: [],
    columnConfigs: {},
    isFacilitator: false,
};

export const BoardDataContext = createContext<BoardData>(EMPTY_BOARD);

type BoardDataSetter = (data: BoardData | null) => void;
const BoardDataSetterContext = createContext<BoardDataSetter>(() => {});

export function BoardDataStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [data, setData] = useState<BoardData | null>(null);
    const setter = useCallback((d: BoardData | null) => setData(d), []);
    return (
        <BoardDataSetterContext.Provider value={setter}>
            <BoardDataContext.Provider value={data ?? EMPTY_BOARD}>
                {children}
            </BoardDataContext.Provider>
        </BoardDataSetterContext.Provider>
    );
}

export function useBoardData(): BoardData {
    return useContext(BoardDataContext);
}

export function useBoardDataSetter(): BoardDataSetter {
    return useContext(BoardDataSetterContext);
}
