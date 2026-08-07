import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from '@/lib/components/ui/Modal';

// A detectable marker (not the global setup.ts passthrough) so this file can assert
// AnimatePresence stays mounted across the isOpen transition — required for the modal
// to exit-animate instead of vanishing instantly (design audit finding, spec 028: an
// `if (!isOpen) return null` guard previously sat before AnimatePresence was ever
// reached, so the declared exit animations were dead code).
vi.mock('react-dom', () => ({
    createPortal: (children: React.ReactNode) => children,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        dialog: ({ children, open, ...props }: any) => <dialog open={open} {...props}>{children}</dialog>,
    },
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

describe('Modal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        title: 'Test Modal',
        children: <p>Modal content</p>,
    };

    it('renders content when open', () => {
        render(<Modal {...defaultProps} />);
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
        render(<Modal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('keeps AnimatePresence mounted even when closed, so the modal can exit-animate instead of being removed via an early return (design audit finding, spec 028)', () => {
        const { rerender } = render(<Modal {...defaultProps} isOpen={false} />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();

        rerender(<Modal {...defaultProps} isOpen={true} />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });
});
