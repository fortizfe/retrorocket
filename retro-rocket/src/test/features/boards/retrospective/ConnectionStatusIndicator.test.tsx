import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionStatusIndicator from '@/features/boards/retrospective/components/ConnectionStatusIndicator';

describe('ConnectionStatusIndicator', () => {
    it('renders nothing when connected', () => {
        const { container } = render(<ConnectionStatusIndicator connectionState="connected" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while initially connecting', () => {
        const { container } = render(<ConnectionStatusIndicator connectionState="connecting" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a status message while reconnecting', () => {
        render(<ConnectionStatusIndicator connectionState="reconnecting" />);
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('app.reconnecting')).toBeInTheDocument();
    });
});
