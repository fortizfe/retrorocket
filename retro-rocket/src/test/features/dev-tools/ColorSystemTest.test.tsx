import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ColorSystemTest from '@/features/dev-tools/components/ColorSystemTest';
import { getCardStyling, getDefaultColor, getAvailableColors } from '@/lib/utils/cardColors';

// Mock the utilities to isolate component testing
vi.mock('@/lib/utils/cardColors', () => ({
    getCardStyling: vi.fn((color: string) => `mocked-style-${color}`),
    getDefaultColor: vi.fn(() => 'pastelBlue'),
    getAvailableColors: vi.fn(() => ['pastelBlue', 'pastelGreen', 'pastelYellow', 'pastelPink', 'pastelPurple'])
}));

// Mock ColorPicker component
vi.mock('@/lib/components/ui/ColorPicker', () => ({
    default: ({ selectedColor, onColorChange, size, showLabel }: any) => (
        <div
            data-testid="color-picker"
            data-selected-color={selectedColor}
            data-size={size}
            data-show-label={showLabel?.toString()}
        >
            <button
                onClick={() => onColorChange('pastelGreen')}
                data-testid="color-option-pastelGreen"
            >
                Change to Green
            </button>
        </div>
    )
}));

// Mock EmojiReactions component
vi.mock('@/features/boards/retrospective/components/EmojiReactions', () => ({
    default: ({ cardId, groupedReactions, userReaction, onAddReaction, onRemoveReaction }: any) => (
        <div
            data-testid="emoji-reactions"
            data-card-id={cardId}
            data-user-reaction={userReaction ? userReaction.toString() : ''}
        >
            <div data-testid="reactions-count">{groupedReactions.length}</div>
            <button
                onClick={() => onAddReaction('🎉')}
                data-testid="add-reaction-button"
            >
                Add Reaction
            </button>
            <button
                onClick={onRemoveReaction}
                data-testid="remove-reaction-button"
            >
                Remove Reaction
            </button>
        </div>
    )
}));

describe('ColorSystemTest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Component Rendering', () => {
        it('renders the main title correctly', () => {
            render(<ColorSystemTest />);
            expect(screen.getByRole('heading', { name: /color system test/i })).toBeInTheDocument();
        });

        it('renders all test sections', () => {
            render(<ColorSystemTest />);

            expect(screen.getByRole('heading', { name: /colorpicker component test/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /card styling test/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /interactive card color test/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /colorpicker size variants/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /available colors information/i })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /emoji reactions test/i })).toBeInTheDocument();
        });

        it('renders multiple ColorPicker components', () => {
            render(<ColorSystemTest />);
            const colorPickers = screen.getAllByTestId('color-picker');
            // Main picker + interactive card picker + emoji section picker + 3 size variants = 6 total
            expect(colorPickers).toHaveLength(6);
        });
    });

    describe('ColorPicker Integration', () => {
        it('passes correct initial color to main ColorPicker', () => {
            render(<ColorSystemTest />);
            const mainColorPicker = screen.getAllByTestId('color-picker')[0];
            expect(mainColorPicker).toHaveAttribute('data-selected-color', 'pastelBlue');
        });

        it('shows label on main ColorPicker', () => {
            render(<ColorSystemTest />);
            const mainColorPicker = screen.getAllByTestId('color-picker')[0];
            expect(mainColorPicker).toHaveAttribute('data-show-label', 'true');
        });

        it('updates color when ColorPicker changes', async () => {
            render(<ColorSystemTest />);
            const changeButton = screen.getAllByTestId('color-option-pastelGreen')[0];

            fireEvent.click(changeButton);

            await waitFor(() => {
                const colorPicker = screen.getAllByTestId('color-picker')[0];
                expect(colorPicker).toHaveAttribute('data-selected-color', 'pastelGreen');
            });
        });
    });

    describe('Size Variants', () => {
        it('renders ColorPicker with different sizes', () => {
            render(<ColorSystemTest />);
            const sizePickers = screen.getAllByTestId('color-picker');

            // Check that we have pickers with all three different sizes
            const sizes = sizePickers.map(picker => picker.getAttribute('data-size'));
            expect(sizes).toContain('sm');
            expect(sizes).toContain('md');
            expect(sizes).toContain('lg');

            // Verify we have at least one of each size (allowing for multiple instances)
            expect(sizes.filter(size => size === 'sm').length).toBeGreaterThan(0);
            expect(sizes.filter(size => size === 'md').length).toBeGreaterThan(0);
            expect(sizes.filter(size => size === 'lg').length).toBeGreaterThan(0);
        });

        it('displays size labels correctly', () => {
            render(<ColorSystemTest />);
            expect(screen.getByText('Small:')).toBeInTheDocument();
            expect(screen.getByText('Medium:')).toBeInTheDocument();
            expect(screen.getByText('Large:')).toBeInTheDocument();
        });
    });

    describe('Card Styling Display', () => {
        it('renders cards for all available colors', () => {
            render(<ColorSystemTest />);

            // Check that getAvailableColors was called
            expect(getAvailableColors).toHaveBeenCalled();

            // Check that color headings are rendered in card styling section
            const cardStylingSection = screen.getByRole('heading', { name: /card styling test/i }).parentElement;
            const colors = ['pastelBlue', 'pastelGreen', 'pastelYellow', 'pastelPink', 'pastelPurple'];
            colors.forEach(color => {
                expect(cardStylingSection).toHaveTextContent(color);
            });
        });

        it('applies correct styling classes to cards', () => {
            render(<ColorSystemTest />);

            // Verify getCardStyling was called for each color (at least once per color)
            expect(getCardStyling).toHaveBeenCalledWith('pastelBlue');
            expect(getCardStyling).toHaveBeenCalledWith('pastelGreen');
            expect(getCardStyling).toHaveBeenCalledWith('pastelYellow');
            expect(getCardStyling).toHaveBeenCalledWith('pastelPink');
            expect(getCardStyling).toHaveBeenCalledWith('pastelPurple');
        });

        it('displays card content correctly', () => {
            render(<ColorSystemTest />);
            expect(screen.getByText(/this is a test card with pastelBlue background/i)).toBeInTheDocument();
        });
    });

    describe('Interactive Card Test', () => {
        it('renders interactive card with initial color', () => {
            render(<ColorSystemTest />);
            expect(screen.getByText('Test Retrospective Card')).toBeInTheDocument();
            expect(screen.getByText(/current color:/i)).toBeInTheDocument();

            // Find the current color span specifically in the interactive card section
            const interactiveSection = screen.getByRole('heading', { name: /interactive card color test/i }).parentElement;
            expect(interactiveSection).toHaveTextContent('Current color: pastelBlue');
        });

        it('updates interactive card color when picker changes', async () => {
            render(<ColorSystemTest />);

            // Find the ColorPicker in the interactive card section (second one)
            const interactiveCardPicker = screen.getAllByTestId('color-option-pastelGreen')[1];

            fireEvent.click(interactiveCardPicker);

            await waitFor(() => {
                // Check that the interactive card's ColorPicker updated
                const interactiveCardColorPicker = screen.getAllByTestId('color-picker')[1];
                expect(interactiveCardColorPicker).toHaveAttribute('data-selected-color', 'pastelGreen');
            });
        });

        it('displays helpful text about color changes', () => {
            render(<ColorSystemTest />);
            expect(screen.getByText(/this card demonstrates real-time color changes/i)).toBeInTheDocument();
            expect(screen.getByText(/click the color picker to change the background/i)).toBeInTheDocument();
        });
    });

    describe('Available Colors Information', () => {
        it('renders color information grid', () => {
            render(<ColorSystemTest />);

            const colors = ['pastelBlue', 'pastelGreen', 'pastelYellow', 'pastelPink', 'pastelPurple'];
            colors.forEach(color => {
                const colorElements = screen.getAllByText(color);
                expect(colorElements.length).toBeGreaterThanOrEqual(1);
            });
        });

        it('displays click instruction for each color', () => {
            render(<ColorSystemTest />);
            const clickInstructions = screen.getAllByText('Click to select');
            expect(clickInstructions.length).toBe(5); // One for each color
        });
    });

    describe('Emoji Reactions Integration', () => {
        it('renders EmojiReactions component', () => {
            render(<ColorSystemTest />);
            const emojiReactions = screen.getByTestId('emoji-reactions');
            expect(emojiReactions).toBeInTheDocument();
            expect(emojiReactions).toHaveAttribute('data-card-id', 'test-card');
        });

        it('initializes with test reactions', () => {
            render(<ColorSystemTest />);
            const reactionsCount = screen.getByTestId('reactions-count');
            expect(reactionsCount).toHaveTextContent('2'); // Initial test reactions
        });

        it('handles adding emoji reactions', async () => {
            render(<ColorSystemTest />);
            const addButton = screen.getByTestId('add-reaction-button');

            fireEvent.click(addButton);

            await waitFor(() => {
                const emojiReactions = screen.getByTestId('emoji-reactions');
                expect(emojiReactions).toHaveAttribute('data-user-reaction', '🎉');
            });
        });

        it('handles removing emoji reactions', async () => {
            render(<ColorSystemTest />);

            // First add a reaction
            const addButton = screen.getByTestId('add-reaction-button');
            fireEvent.click(addButton);

            // Then remove it
            const removeButton = screen.getByTestId('remove-reaction-button');
            fireEvent.click(removeButton);

            await waitFor(() => {
                const emojiReactions = screen.getByTestId('emoji-reactions');
                expect(emojiReactions).toHaveAttribute('data-user-reaction', '');
            });
        });

        it('displays emoji picker features list', () => {
            render(<ColorSystemTest />);
            expect(screen.getByText(/características del emoji picker flotante/i)).toBeInTheDocument();
            expect(screen.getByText(/renderizado con portal/i)).toBeInTheDocument();
            expect(screen.getByText(/posicionamiento inteligente/i)).toBeInTheDocument();
            expect(screen.getByText(/12 emojis organizados/i)).toBeInTheDocument();
        });
    });

    describe('State Management', () => {
        it('verifies color picker state behavior', async () => {
            render(<ColorSystemTest />);

            // Get initial state of all pickers
            const allPickers = screen.getAllByTestId('color-picker');
            const mainPicker = allPickers[0];

            // Change main picker
            const mainPickerButton = screen.getAllByTestId('color-option-pastelGreen')[0];
            fireEvent.click(mainPickerButton);

            await waitFor(() => {
                // Check that main picker changed
                expect(mainPicker).toHaveAttribute('data-selected-color', 'pastelGreen');
            });

            // Note: The component actually uses shared state for selectedColor,
            // and separate state for testCardColor, so different sections behave differently
            // This test validates the interaction works as expected
        });

        it('tracks emoji reaction state correctly', async () => {
            render(<ColorSystemTest />);

            // Initial state should be empty
            const emojiReactions = screen.getByTestId('emoji-reactions');
            expect(emojiReactions).toHaveAttribute('data-user-reaction', '');

            // Add reaction
            const addButton = screen.getByTestId('add-reaction-button');
            fireEvent.click(addButton);

            await waitFor(() => {
                expect(emojiReactions).toHaveAttribute('data-user-reaction', '🎉');
            });
        });
    });

    describe('Utility Functions Integration', () => {
        it('calls getDefaultColor on component mount', () => {
            render(<ColorSystemTest />);
            expect(getDefaultColor).toHaveBeenCalled();
        });

        it('calls getAvailableColors to render color options', () => {
            render(<ColorSystemTest />);
            expect(getAvailableColors).toHaveBeenCalled();
        });

        it('calls getCardStyling for each color display', () => {
            render(<ColorSystemTest />);
            // Should be called for each color in both sections
            expect(getCardStyling).toHaveBeenCalledWith('pastelBlue');
            expect(getCardStyling).toHaveBeenCalledWith('pastelGreen');
            expect(getCardStyling).toHaveBeenCalledWith('pastelYellow');
            expect(getCardStyling).toHaveBeenCalledWith('pastelPink');
            expect(getCardStyling).toHaveBeenCalledWith('pastelPurple');
        });
    });

    describe('Component Props and Attributes', () => {
        it('passes correct props to ColorPicker components', () => {
            render(<ColorSystemTest />);

            const colorPickers = screen.getAllByTestId('color-picker');

            // Main ColorPicker
            expect(colorPickers[0]).toHaveAttribute('data-show-label', 'true');
            expect(colorPickers[0]).toHaveAttribute('data-size', 'md');

            // Interactive card ColorPicker
            expect(colorPickers[1]).toHaveAttribute('data-size', 'sm');
        });

        it('passes correct props to EmojiReactions component', () => {
            render(<ColorSystemTest />);

            const emojiReactions = screen.getByTestId('emoji-reactions');
            expect(emojiReactions).toHaveAttribute('data-card-id', 'test-card');
            expect(emojiReactions).toHaveAttribute('data-user-reaction', '');
        });
    });

    describe('Accessibility and User Experience', () => {
        it('has proper heading hierarchy', () => {
            render(<ColorSystemTest />);

            const h1 = screen.getByRole('heading', { level: 1 });
            expect(h1).toHaveTextContent('Color System Test');

            const h2Elements = screen.getAllByRole('heading', { level: 2 });
            expect(h2Elements.length).toBe(6); // All section headings
        });

        it('provides descriptive text for each section', () => {
            render(<ColorSystemTest />);

            expect(screen.getByText(/this card demonstrates real-time color changes/i)).toBeInTheDocument();
            expect(screen.getByText(/esta tarjeta demuestra el sistema de emojis flotante/i)).toBeInTheDocument();
        });

        it('includes helpful instructions and labels', () => {
            render(<ColorSystemTest />);

            expect(screen.getByText('Selected Color:')).toBeInTheDocument();
            expect(screen.getByText('Current color:')).toBeInTheDocument();
            expect(screen.getAllByText('Click to select')).toHaveLength(5);
        });
    });

    describe('Error Boundaries and Edge Cases', () => {
        it('handles empty color arrays gracefully', () => {
            // Mock empty colors array
            vi.mocked(getAvailableColors).mockReturnValue([]);

            render(<ColorSystemTest />);

            // Component should still render without crashing
            expect(screen.getByRole('heading', { name: /color system test/i })).toBeInTheDocument();
        });

        it('handles missing emoji reactions', () => {
            render(<ColorSystemTest />);

            // Component should render emoji section even if reactions are empty initially
            expect(screen.getByTestId('emoji-reactions')).toBeInTheDocument();
        });

        it('maintains consistent state during rapid changes', async () => {
            render(<ColorSystemTest />);

            const changeButton = screen.getAllByTestId('color-option-pastelGreen')[1];

            // Rapid clicks
            fireEvent.click(changeButton);
            fireEvent.click(changeButton);
            fireEvent.click(changeButton);

            await waitFor(() => {
                // Should handle rapid state changes gracefully
                expect(screen.getByText('pastelGreen')).toBeInTheDocument();
            });
        });
    });
});
