import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActionColumnToggle from '../../../../src/components/retrospective/ActionColumnToggle';

describe('ActionColumnToggle', () => {
    it('renders visible state and toggles', () => {
        const onToggle = vi.fn();
        render(<ActionColumnToggle visible={true} onToggle={onToggle} />);

        // Should set aria-label accordingly
        expect(screen.getByLabelText(/retrospective\.facilitator\.hideActionItems|retrospective\.facilitator\.showActionItems/)).toBeInTheDocument();

        // Headless UI Switch renders as role='switch'
        fireEvent.click(screen.getByRole('switch'));
        expect(onToggle).toHaveBeenCalled();
    });
});
