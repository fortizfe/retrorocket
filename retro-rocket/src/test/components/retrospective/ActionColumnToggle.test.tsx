import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionColumnToggle from '../../../../src/components/retrospective/ActionColumnToggle';

describe('ActionColumnToggle', () => {
    it('renders visible state and toggles', () => {
        const onToggle = vi.fn();
        render(<ActionColumnToggle visible={true} onToggle={onToggle} />);

        // Should show eye icon label
        expect(screen.getByTitle(/Ocultar elementos de acción|Mostrar elementos de acción/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button'));
        expect(onToggle).toHaveBeenCalled();
    });
});
