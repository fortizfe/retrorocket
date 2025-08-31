import React from 'react';
import Button from '../ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
    visible: boolean;
    onToggle: () => void;
}

// Small presentational toggle to show/hide the action column.
// Single responsibility: rendering the control and delegating behavior via props.
const ActionColumnToggle: React.FC<Props> = ({ visible, onToggle }) => {
    const label = visible ? 'Ocultar elementos de acción' : 'Mostrar elementos de acción';

    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            aria-pressed={visible}
            title={label}
            className="flex items-center space-x-2"
        >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="hidden sm:inline">{label}</span>
        </Button>
    );
};

export default ActionColumnToggle;
