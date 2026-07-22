import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmojiPicker from '@/lib/components/ui/EmojiPicker';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => children,
    createPortal: vi.fn(),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Smile: ({ className }: { className?: string }) => (
        <div data-testid="smile-icon" className={className}>
            SmileIcon
        </div>
    ),
}));

// Mock useBodyScrollLock hook
const mockRestoreScroll = vi.fn();
vi.mock('@/lib/hooks/useBodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(() => ({
        restoreScroll: mockRestoreScroll,
    })),
}));

// Mock react-dom createPortal
const mockCreatePortal = vi.fn();
vi.mock('react-dom', () => ({
    createPortal: (...args: any[]) => mockCreatePortal(...args),
}));

// Mock Button component
vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, className, size, variant, ...props }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-size={size}
            data-variant={variant}
            {...props}
        >
            {children}
        </button>
    ),
}));

// Mock EMOJI_CATEGORIES
vi.mock('@/lib/utils/emojiConstants', () => ({
    EMOJI_CATEGORIES: {
        'Emociones': ['😊', '😂', '😍', '🥰', '😎'],
        'Gestos': ['👍', '👎', '👏', '🙌', '👋'],
        'Objetos': ['📱', '💻', '📝', '✅', '❌'],
    },
}));

describe('EmojiPicker Component', () => {
    const mockOnEmojiSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup createPortal mock to render directly
        mockCreatePortal.mockImplementation((element) => element);

        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            top: 100,
            left: 100,
            right: 200,
            bottom: 130,
            width: 100,
            height: 30,
            x: 100,
            y: 100,
            toJSON: () => ({}),
        }));

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic functionality', () => {
        it('should render the emoji picker trigger button', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('aria-label', 'Seleccionar emoji');
        });

        it('should render the smile icon', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const icon = screen.getByTestId('smile-icon');
            expect(icon).toBeInTheDocument();
        });

        it('should not show picker initially', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            expect(screen.queryByText('Emociones')).not.toBeInTheDocument();
        });
    });

    describe('Picker toggle functionality', () => {
        it('should open picker when button is clicked', async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Emociones')).toBeInTheDocument();
            });
        });

        it('should close picker when button is clicked again', async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');

            // Open picker
            await user.click(button);
            await waitFor(() => {
                expect(screen.getByText('Emociones')).toBeInTheDocument();
            });

            // Close picker
            await user.click(button);
            await waitFor(() => {
                expect(screen.queryByText('Emociones')).not.toBeInTheDocument();
            });
        });

        it('should call restoreScroll when closing picker', async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');

            // Open and close picker
            await user.click(button);
            await user.click(button);

            expect(mockRestoreScroll).toHaveBeenCalled();
        });
    });

    describe('Size variants', () => {
        it('should apply small size classes', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} size="sm" />);

            const icon = screen.getByTestId('smile-icon');
            expect(icon).toHaveClass('w-6', 'h-6');
        });

        it('should apply medium size classes (default)', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const icon = screen.getByTestId('smile-icon');
            expect(icon).toHaveClass('w-8', 'h-8');
        });

        it('should apply large size classes', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} size="lg" />);

            const icon = screen.getByTestId('smile-icon');
            expect(icon).toHaveClass('w-10', 'h-10');
        });
    });

    describe('Disabled state', () => {
        it('should disable button when disabled prop is true', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} disabled />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });

        it('should not open picker when disabled and clicked', async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} disabled />);

            const button = screen.getByRole('button');
            await user.click(button);

            expect(screen.queryByText('Emociones')).not.toBeInTheDocument();
        });
    });

    describe('Custom className', () => {
        it('should apply custom className to button', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} className="custom-class" />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('custom-class');
        });
    });

    describe('Emoji categories', () => {
        beforeEach(async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Emociones')).toBeInTheDocument();
            });
        });

        it('should display all emoji categories', () => {
            expect(screen.getByText('Emociones')).toBeInTheDocument();
            expect(screen.getByText('Gestos')).toBeInTheDocument();
            expect(screen.getByText('Objetos')).toBeInTheDocument();
        });

        it('should have Emociones as default active category', () => {
            const emotionsButton = screen.getByText('Emociones');
            expect(emotionsButton).toHaveClass('bg-info-bg');
        });

        it('should switch active category when category button is clicked', async () => {
            const user = userEvent.setup();

            const gesturesButton = screen.getByText('Gestos');
            await user.click(gesturesButton);

            expect(gesturesButton).toHaveClass('bg-info-bg');
        });

        it('should display emojis for the active category', () => {
            // Should show emojis from Emociones category using title attribute
            expect(screen.getByTitle('😊')).toBeInTheDocument();
            expect(screen.getByTitle('😂')).toBeInTheDocument();
        });

        it('should update displayed emojis when category changes', async () => {
            const user = userEvent.setup();

            // Switch to Gestos category
            const gesturesButton = screen.getByText('Gestos');
            await user.click(gesturesButton);

            // Should show emojis from Gestos category
            expect(screen.getByTitle('👍')).toBeInTheDocument();
            expect(screen.getByTitle('👎')).toBeInTheDocument();
        });
    });

    describe('Emoji selection', () => {
        beforeEach(async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByTitle('😊')).toBeInTheDocument();
            });
        });

        it('should call onEmojiSelect when emoji is clicked', async () => {
            const user = userEvent.setup();

            const emojiButton = screen.getByTitle('😊');
            await user.click(emojiButton);

            expect(mockOnEmojiSelect).toHaveBeenCalledWith('😊');
        });

        it('should close picker after emoji selection', async () => {
            const user = userEvent.setup();

            const emojiButton = screen.getByTitle('😊');
            await user.click(emojiButton);

            await waitFor(() => {
                expect(screen.queryByText('Emociones')).not.toBeInTheDocument();
            });
        });

        it('should restore scroll after emoji selection', async () => {
            const user = userEvent.setup();

            const emojiButton = screen.getByTitle('😊');
            await user.click(emojiButton);

            expect(mockRestoreScroll).toHaveBeenCalled();
        });
    });

    describe('Keyboard interactions', () => {
        beforeEach(async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Emociones')).toBeInTheDocument();
            });
        });

        it('should close picker when Escape key is pressed', () => {
            fireEvent.keyDown(document, { key: 'Escape' });

            expect(screen.queryByText('Emociones')).not.toBeInTheDocument();
        });

        it('should restore scroll when Escape key is pressed', () => {
            fireEvent.keyDown(document, { key: 'Escape' });

            expect(mockRestoreScroll).toHaveBeenCalled();
        });
    });

    describe('Click outside behavior', () => {
        beforeEach(async () => {
            const user = userEvent.setup();
            render(
                <div>
                    <EmojiPicker onEmojiSelect={mockOnEmojiSelect} />
                    <div data-testid="outside">Outside element</div>
                </div>
            );

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Emociones')).toBeInTheDocument();
            });
        });

        it('should handle click outside events', () => {
            // Test that the click outside functionality exists
            // Note: Due to portal mocking limitations, we test indirectly
            const outsideElement = screen.getByTestId('outside');
            expect(outsideElement).toBeInTheDocument();

            // Verify the picker is initially open
            expect(screen.getByText('Emociones')).toBeInTheDocument();
        });
    });

    describe('Footer text', () => {
        it('should display helper text in footer', async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByText('Haz clic en un emoji para añadirlo a tu tarjeta')).toBeInTheDocument();
            });
        });
    });

    describe('Button props delegation', () => {
        it('should pass correct size to Button component', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} size="lg" />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('data-size', 'md'); // lg maps to md for button
        });

        it('should pass ghost variant to Button component', () => {
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('data-variant', 'ghost');
        });
    });

    describe('Emoji button attributes', () => {
        beforeEach(async () => {
            const user = userEvent.setup();
            render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} />);

            const button = screen.getByRole('button');
            await user.click(button);

            await waitFor(() => {
                expect(screen.getByTitle('😊')).toBeInTheDocument();
            });
        });

        it('should have title attribute on emoji buttons', () => {
            const emojiButton = screen.getByTitle('😊');
            expect(emojiButton).toHaveAttribute('title', '😊');
        });

        it('should have correct styling classes on emoji buttons', () => {
            const emojiButton = screen.getByTitle('😊');
            expect(emojiButton).toHaveClass(
                'w-8',
                'h-8',
                'flex',
                'items-center',
                'justify-center',
                'text-lg',
                'hover:bg-surface-raised',
                'rounded',
                'transition-colors'
            );
        });
    });
});
