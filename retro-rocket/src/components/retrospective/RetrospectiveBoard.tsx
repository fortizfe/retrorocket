import React from 'react';
import RetrospectiveColumn from './RetrospectiveColumn';
import { useRetrospective } from '../../hooks/useRetrospective';

const RetrospectiveBoard: React.FC = () => {
    const { columns } = useRetrospective();

    return (
        <div className="flex justify-between">
            {columns.map((column) => (
                <RetrospectiveColumn key={column.id} column={column} />
            ))}
        </div>
    );
};

export default RetrospectiveBoard;