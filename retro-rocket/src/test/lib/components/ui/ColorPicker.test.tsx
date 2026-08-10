import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPicker from '@/lib/components/ui/ColorPicker';
import { CardColor } from '@/features/boards/types/card';
import { getAvailableColors, getColorConfig } from '@/lib/utils/cardColors';

// Established pattern for components built on useBoardMenuOverlay (real
// Floating UI runs fine in jsdom) — see CardMenu.test.tsx/ReactionPicker.test.tsx.
// Only framer-motion (animation timing) and useLanguage (identity translation,
// returning the key itself) are mocked.
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, whileHover: _wh, whileTap: _wt, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('lucide-react', () => ({
    Check: () => <div data-testid="check-icon" />,
    ChevronDown: () => <div data-testid="chevron-icon" />,
}));

describe('ColorPicker', () => {
    const mockOnColorChange = vi.fn();
    const defaultProps = {
        selectedColor: 'pastelWhite' as CardColor,
        onColorChange: mockOnColorChange,
    };
    const user = userEvent.setup();
    const curatedColors = getAvailableColors();

    const openPicker = async () => {
        await user.click(screen.getByRole('button', { name: 'colors.white_aria' }));
        return screen.findByRole('dialog');
    };

    beforeEach(() => {
        mockOnColorChange.mockClear();
    });

    describe('Basic Rendering', () => {
        it('renders a trigger button showing the current color and a chevron', () => {
            render(<ColorPicker {...defaultProps} />);
            const trigger = screen.getByRole('button', { name: 'colors.white_aria' });
            expect(trigger).toBeInTheDocument();
            expect(trigger).toHaveAttribute('title', 'colors.white');
            expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
        });

        it('is persistently visible at rest — no hover-gating classes on the trigger (FR-011a)', () => {
            render(<ColorPicker {...defaultProps} />);
            const trigger = screen.getByRole('button', { name: 'colors.white_aria' });
            expect(trigger.className).not.toMatch(/opacity-0/);
        });

        it('shows a label under the trigger when showLabel is true', () => {
            render(<ColorPicker {...defaultProps} showLabel />);
            expect(screen.getByText('colors.white')).toBeInTheDocument();
        });

        it('does not show a label by default', () => {
            const { container } = render(<ColorPicker {...defaultProps} />);
            expect(container.querySelectorAll('span').length).toBeGreaterThan(0);
            expect(screen.queryByText('colors.white', { selector: 'span.block' })).not.toBeInTheDocument();
        });
    });

    describe('Disabled State', () => {
        it('renders a disabled trigger that does not open the panel when clicked', async () => {
            render(<ColorPicker {...defaultProps} disabled />);
            const trigger = screen.getByRole('button', { name: 'colors.white_aria' });
            expect(trigger).toBeDisabled();

            await user.click(trigger);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('Panel Functionality', () => {
        it('opens the panel when the trigger is clicked, with every curated color present', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();

            curatedColors.forEach((color) => {
                const config = getColorConfig(color);
                expect(within(dialog).getByRole('button', { name: config.ariaLabelKey })).toBeInTheDocument();
            });
        });

        it('marks the currently selected color with a checkmark', async () => {
            render(<ColorPicker {...defaultProps} selectedColor="pastelGreen" />);
            await user.click(screen.getByRole('button', { name: 'colors.green_aria' }));
            const dialog = await screen.findByRole('dialog');

            const selectedSwatch = within(dialog).getByRole('button', { name: 'colors.green_aria' });
            expect(within(selectedSwatch).getByTestId('check-icon')).toBeInTheDocument();
        });

        it('shows the selected color name and tooltip in the detail row by default', async () => {
            render(<ColorPicker {...defaultProps} selectedColor="pastelIndigo" />);
            await user.click(screen.getByRole('button', { name: 'colors.indigo_aria' }));
            const dialog = await screen.findByRole('dialog');

            expect(within(dialog).getByText('colors.indigo')).toBeInTheDocument();
            expect(within(dialog).getByText('colors.indigo_tooltip')).toBeInTheDocument();
        });

        it('updates the detail row to the hovered/focused swatch, not just the selection', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();

            fireEvent.mouseEnter(within(dialog).getByRole('button', { name: 'colors.rose_aria' }));
            await waitFor(() => {
                expect(within(dialog).getByText('colors.rose')).toBeInTheDocument();
            });
        });
    });

    describe('Color Selection', () => {
        it('calls onColorChange with the selected color and closes the panel', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();

            await user.click(within(dialog).getByRole('button', { name: 'colors.blue_aria' }));

            expect(mockOnColorChange).toHaveBeenCalledWith('pastelBlue');
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('updates the trigger aria-label when selectedColor changes', () => {
            const { rerender } = render(<ColorPicker {...defaultProps} />);
            expect(screen.getByRole('button', { name: 'colors.white_aria' })).toBeInTheDocument();

            rerender(<ColorPicker {...defaultProps} selectedColor="pastelRed" />);
            expect(screen.getByRole('button', { name: 'colors.red_aria' })).toBeInTheDocument();
        });
    });

    describe('Legacy/curated-away color handling (FR-013a)', () => {
        it('resolves a pre-curation legacy selectedColor to its remapped equivalent rather than crashing', () => {
            // pastelCoral was curated away; resolveCardColor remaps it to pastelRed.
            render(<ColorPicker {...defaultProps} selectedColor={'pastelCoral' as CardColor} />);
            expect(screen.getByRole('button', { name: 'colors.red_aria' })).toBeInTheDocument();
        });
    });

    describe('Keyboard Interactions (FR-007)', () => {
        it('closes the panel when Escape is pressed, without changing the color', async () => {
            render(<ColorPicker {...defaultProps} />);
            await openPicker();

            fireEvent.keyDown(document, { key: 'Escape' });
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
            expect(mockOnColorChange).not.toHaveBeenCalled();
        });

        it('moves focus to the next swatch on ArrowRight and the previous on ArrowLeft', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();

            const first = within(dialog).getByRole('button', { name: 'colors.white_aria' });
            const second = within(dialog).getByRole('button', { name: 'colors.blue_aria' });
            first.focus();
            expect(document.activeElement).toBe(first);

            // Fired on the focused element itself (matching a real keypress,
            // which bubbles up from whatever has focus) rather than on the
            // dialog container directly — the roving-focus handler lives one
            // layer below the `role="dialog"` positioning wrapper.
            fireEvent.keyDown(first, { key: 'ArrowRight' });
            expect(document.activeElement).toBe(second);

            fireEvent.keyDown(second, { key: 'ArrowLeft' });
            expect(document.activeElement).toBe(first);
        });

        it('trigger is reachable via keyboard and exposes a visible-focus class', () => {
            render(<ColorPicker {...defaultProps} />);
            const trigger = screen.getByRole('button', { name: 'colors.white_aria' });
            expect(trigger.className).toMatch(/focus-visible:ring-2/);
        });
    });

    describe('Outside Click Handling', () => {
        it('closes the panel when clicking outside it, without changing the color', async () => {
            render(
                <div>
                    <ColorPicker {...defaultProps} />
                    <div data-testid="outside">Outside</div>
                </div>
            );
            await openPicker();

            fireEvent.pointerDown(screen.getByTestId('outside'));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
            expect(mockOnColorChange).not.toHaveBeenCalled();
        });
    });

    describe('Size Variants', () => {
        it('renders distinct trigger sizing for sm, md, and lg', () => {
            const { rerender, container } = render(<ColorPicker {...defaultProps} size="sm" />);
            const smClass = container.querySelector('button')!.className;

            rerender(<ColorPicker {...defaultProps} size="lg" />);
            const lgClass = container.querySelector('button')!.className;

            expect(smClass).not.toBe(lgClass);
        });
    });

    describe('Accessibility', () => {
        it('every swatch has an accessible name distinguishing it from its neighbors', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();

            const names = curatedColors.map((c) => getColorConfig(c).ariaLabelKey);
            expect(new Set(names).size).toBe(names.length);
            names.forEach((name) => {
                expect(within(dialog).getByRole('button', { name })).toBeInTheDocument();
            });
        });

        it('the panel exposes a dialog role with an accessible name', async () => {
            render(<ColorPicker {...defaultProps} />);
            const dialog = await openPicker();
            expect(dialog).toHaveAttribute('aria-label', 'retrospective.card.colorPicker.panelLabel');
        });
    });
});
