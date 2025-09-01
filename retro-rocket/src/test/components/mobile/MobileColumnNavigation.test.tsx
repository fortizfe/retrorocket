import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MobileColumnNavigation from '../../../components/mobile/MobileColumnNavigation';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => children,
    PanInfo: vi.fn(),
}));

// Mock the useLanguage hook
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

const mockColumns = [
    { id: 'went-well', title: '¿Qué fue bien?', icon: '😊', count: 5 },
    { id: 'to-improve', title: '¿Qué mejorar?', icon: '🚀', count: 3 },
    { id: 'action-items', title: 'Elementos de acción', icon: '✅', count: 2 },
];

describe('MobileColumnNavigation', () => {
    const mockOnColumnChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock IntersectionObserver
        global.IntersectionObserver = vi.fn().mockImplementation(() => ({
            observe: vi.fn(),
            unobserve: vi.fn(),
            disconnect: vi.fn(),
        }));
    });

    describe('Rendering', () => {
        it('should render all column tabs', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            mockColumns.forEach(column => {
                expect(screen.getByLabelText(new RegExp(column.title))).toBeInTheDocument();
            });
        });

        it('should highlight the active column', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const activeTab = screen.getByRole('button', { pressed: true });
            expect(activeTab).toHaveClass('bg-white');
        });

        it('should show card counts for each column', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            mockColumns.forEach(column => {
                if (column.count > 0) {
                    expect(screen.getByText(column.count.toString())).toBeInTheDocument();
                }
            });
        });

        it('should render navigation buttons', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            expect(screen.getByLabelText('navigation.previousColumn')).toBeInTheDocument();
            expect(screen.getByLabelText('navigation.nextColumn')).toBeInTheDocument();
        });
    });

    describe('Navigation Functionality', () => {
        it('should call onColumnChange when tab is clicked', async () => {
            const user = userEvent.setup();

            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const toImproveTab = screen.getByLabelText(/¿Qué mejorar?/);
            await user.click(toImproveTab);

            expect(mockOnColumnChange).toHaveBeenCalledWith('to-improve');
        });

        it('should navigate to previous column', async () => {
            const user = userEvent.setup();

            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="to-improve"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const prevButton = screen.getByLabelText('navigation.previousColumn');
            await user.click(prevButton);

            expect(mockOnColumnChange).toHaveBeenCalledWith('went-well');
        });

        it('should navigate to next column', async () => {
            const user = userEvent.setup();

            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const nextButton = screen.getByLabelText('navigation.nextColumn');
            await user.click(nextButton);

            expect(mockOnColumnChange).toHaveBeenCalledWith('to-improve');
        });

        it('should disable previous button on first column', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const prevButton = screen.getByLabelText('navigation.previousColumn');
            expect(prevButton).toBeDisabled();
        });

        it('should disable next button on last column', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="action-items"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const nextButton = screen.getByLabelText('navigation.nextColumn');
            expect(nextButton).toBeDisabled();
        });
    });

    describe('Progress Indicator', () => {
        it('should show progress based on active column', () => {
            const { rerender } = render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Progress should be 1/3 = ~33%
            let progressBar = document.querySelector('.bg-blue-500');
            expect(progressBar).toBeInTheDocument();

            rerender(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="to-improve"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Progress should be 2/3 = ~66%
            progressBar = document.querySelector('.bg-blue-500');
            expect(progressBar).toBeInTheDocument();
        });
    });

    describe('Keyboard Navigation', () => {
        it('should support arrow key navigation', async () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Simulate ArrowRight key
            fireEvent.keyDown(document, { key: 'ArrowRight' });
            await waitFor(() => {
                expect(mockOnColumnChange).toHaveBeenCalledWith('to-improve');
            });
        });

        it('should not navigate past boundaries with keyboard', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="action-items"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Try to go right from last column
            fireEvent.keyDown(document, { key: 'ArrowRight' });
            expect(mockOnColumnChange).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const activeTab = screen.getByRole('button', { pressed: true });
            expect(activeTab).toHaveAttribute('aria-pressed', 'true');

            const inactiveTabs = screen.getAllByRole('button', { pressed: false });
            inactiveTabs.forEach(tab => {
                expect(tab).toHaveAttribute('aria-pressed', 'false');
            });
        });

        it('should have descriptive aria-labels', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const wentWellTab = screen.getByLabelText('¿Qué fue bien? (5 tarjetas)');
            expect(wentWellTab).toBeInTheDocument();

            const toImproveTab = screen.getByLabelText('¿Qué mejorar? (3 tarjetas)');
            expect(toImproveTab).toBeInTheDocument();
        });

        it('should be keyboard accessible', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const tabs = screen.getAllByRole('button');
            tabs.forEach(tab => {
                expect(tab).not.toHaveAttribute('tabIndex', '-1');
            });
        });
    });

    describe('Responsive Design', () => {
        it('should apply mobile-specific classes', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const container = document.querySelector('.lg\\:hidden');
            expect(container).toBeInTheDocument();
            expect(container).toHaveClass('lg:hidden');
        });

        it('should handle long column titles gracefully', () => {
            const longTitleColumns = [
                { id: 'test', title: 'Esta es una columna con un título muy largo que podría causar problemas', icon: '📝', count: 1 }
            ];

            render(
                <MobileColumnNavigation
                    columns={longTitleColumns}
                    activeColumnId="test"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const tabButton = screen.getByRole('button', { pressed: true });
            expect(tabButton).toHaveClass('whitespace-nowrap');
        });
    });

    describe('Touch Interactions', () => {
        it('should have proper touch target size', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // JSDOM doesn't compute layout sizes; instead assert touch target utility class exists
            const navigationButtons = screen.getAllByRole('button');
            navigationButtons.forEach(button => {
                expect(button.className).toMatch(/min-h-\[44px\]|min-w-\[44px\]/);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty columns array', () => {
            render(
                <MobileColumnNavigation
                    columns={[]}
                    activeColumnId=""
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Should still render nav but without tab buttons; previous/next should be present but disabled
            expect(screen.getByLabelText('navigation.previousColumn')).toBeInTheDocument();
            expect(screen.getByLabelText('navigation.nextColumn')).toBeInTheDocument();
            // No tab buttons expected
            const tabButtons = document.querySelectorAll('[aria-pressed]');
            expect(tabButtons.length).toBe(0);
        });

        it('should handle invalid active column ID', () => {
            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="invalid-id"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const pressedButtons = screen.queryAllByRole('button', { pressed: true });
            expect(pressedButtons).toHaveLength(0);
        });

        it('should handle columns without counts', () => {
            const columnsWithoutCounts = mockColumns.map(col => ({ ...col, count: undefined }));

            render(
                <MobileColumnNavigation
                    columns={columnsWithoutCounts}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            // Should not show count badges
            expect(screen.queryByText('5')).not.toBeInTheDocument();
        });

        it('should handle rapid navigation attempts', async () => {
            const user = userEvent.setup();

            render(
                <MobileColumnNavigation
                    columns={mockColumns}
                    activeColumnId="went-well"
                    onColumnChange={mockOnColumnChange}
                />
            );

            const nextButton = screen.getByLabelText('navigation.nextColumn');

            // Simulate rapid clicks
            await user.click(nextButton);
            await user.click(nextButton);
            await user.click(nextButton);

            // Should handle all clicks appropriately
            expect(mockOnColumnChange).toHaveBeenCalled();
        });
    });
});
