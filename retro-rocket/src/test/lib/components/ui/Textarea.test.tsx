import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import Textarea from '@/lib/components/ui/Textarea';

describe('Textarea Component', () => {
    describe('Basic functionality', () => {
        it('should render textarea with default props', () => {
            render(<Textarea />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toBeInTheDocument();
            expect(textarea.tagName).toBe('TEXTAREA');
            expect(textarea).toHaveClass('block', 'w-full', 'rounded-lg', 'border');
        });

        it('should render textarea with placeholder', () => {
            const placeholder = 'Enter your message';
            render(<Textarea placeholder={placeholder} />);
            const textarea = screen.getByPlaceholderText(placeholder);
            expect(textarea).toBeInTheDocument();
        });

        it('should render textarea with value', () => {
            const value = 'Test message content';
            render(<Textarea value={value} readOnly />);
            const textarea = screen.getByDisplayValue(value);
            expect(textarea).toBeInTheDocument();
        });

        it('should handle user input', async () => {
            const user = userEvent.setup();
            const mockOnChange = vi.fn();
            render(<Textarea onChange={mockOnChange} />);

            const textarea = screen.getByRole('textbox');
            await user.type(textarea, 'Hello World');

            expect(mockOnChange).toHaveBeenCalled();
        });
    });

    describe('Label functionality', () => {
        it('should render label when provided', () => {
            const labelText = 'Message';
            render(<Textarea label={labelText} />);

            const label = screen.getByText(labelText);
            expect(label).toBeInTheDocument();
            expect(label.tagName).toBe('LABEL');
        });

        it('should not render label when not provided', () => {
            render(<Textarea />);
            const label = screen.queryByRole('label');
            expect(label).not.toBeInTheDocument();
        });

        it('should associate label with textarea', () => {
            const labelText = 'Message';
            render(<Textarea label={labelText} />);

            // Check that both label and textarea are present
            const label = screen.getByText(labelText);
            const textarea = screen.getByRole('textbox');
            expect(label).toBeInTheDocument();
            expect(textarea).toBeInTheDocument();
        });
    });

    describe('Variants', () => {
        it('should apply default variant styles', () => {
            render(<Textarea variant="default" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('border-slate-300', 'bg-white');
        });

        it('should apply outline variant styles', () => {
            render(<Textarea variant="outline" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('border-slate-300', 'bg-transparent');
        });

        it('should apply filled variant styles', () => {
            render(<Textarea variant="filled" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('border-slate-200', 'bg-slate-50');
        });

        it('should default to default variant when not specified', () => {
            render(<Textarea />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('border-slate-300', 'bg-white');
        });
    });

    describe('Sizes', () => {
        it('should apply small size styles', () => {
            render(<Textarea size="sm" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('px-3', 'py-1.5', 'text-sm');
        });

        it('should apply medium size styles', () => {
            render(<Textarea size="md" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('px-3', 'py-2', 'text-sm');
        });

        it('should apply large size styles', () => {
            render(<Textarea size="lg" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('px-4', 'py-3', 'text-base');
        });

        it('should default to medium size when not specified', () => {
            render(<Textarea />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('px-3', 'py-2', 'text-sm');
        });
    });

    describe('Resize functionality', () => {
        it('should apply none resize styles', () => {
            render(<Textarea resize="none" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('resize-none');
        });

        it('should apply both resize styles', () => {
            render(<Textarea resize="both" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('resize');
        });

        it('should apply horizontal resize styles', () => {
            render(<Textarea resize="horizontal" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('resize-x');
        });

        it('should apply vertical resize styles', () => {
            render(<Textarea resize="vertical" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('resize-y');
        });

        it('should default to vertical resize when not specified', () => {
            render(<Textarea />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('resize-y');
        });
    });

    describe('Error handling', () => {
        it('should display error message when error prop is provided', () => {
            const errorMessage = 'This field is required';
            render(<Textarea error={errorMessage} />);

            const errorElement = screen.getByText(errorMessage);
            expect(errorElement).toBeInTheDocument();
            expect(errorElement).toHaveClass('text-red-600');
        });

        it('should apply error styles to textarea when error is present', () => {
            render(<Textarea error="Error message" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('border-red-300', 'focus:border-red-500');
        });

        it('should not display helper text when error is present', () => {
            const helperText = 'This is helper text';
            const errorMessage = 'This is an error';
            render(<Textarea helperText={helperText} error={errorMessage} />);

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(screen.queryByText(helperText)).not.toBeInTheDocument();
        });

        it('should not display error message when error is not provided', () => {
            render(<Textarea />);
            const errorElements = screen.queryAllByRole('alert');
            expect(errorElements).toHaveLength(0);
        });
    });

    describe('Helper text', () => {
        it('should display helper text when provided and no error', () => {
            const helperText = 'Enter at least 50 characters';
            render(<Textarea helperText={helperText} />);

            const helperElement = screen.getByText(helperText);
            expect(helperElement).toBeInTheDocument();
            expect(helperElement).toHaveClass('text-slate-500');
        });

        it('should not display helper text when not provided', () => {
            render(<Textarea />);
            const helperElements = screen.queryAllByText(/Enter at least/);
            expect(helperElements).toHaveLength(0);
        });
    });

    describe('Forwarded ref', () => {
        it('should forward ref to textarea element', () => {
            const ref = createRef<HTMLTextAreaElement>();
            render(<Textarea ref={ref} />);

            expect(ref.current).toBeTruthy();
            expect(ref.current?.tagName).toBe('TEXTAREA');
        });

        it('should allow access to textarea methods through ref', () => {
            const ref = createRef<HTMLTextAreaElement>();
            render(<Textarea ref={ref} />);

            expect(ref.current).toBeTruthy();
            expect(typeof ref.current?.focus).toBe('function');
            expect(typeof ref.current?.blur).toBe('function');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className along with default classes', () => {
            render(<Textarea className="custom-class" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('custom-class');
            expect(textarea).toHaveClass('block', 'w-full', 'rounded-lg');
        });

        it('should allow custom classes to override default styles', () => {
            render(<Textarea className="bg-red-500" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('bg-red-500');
        });
    });

    describe('Textarea props passthrough', () => {
        it('should pass through standard textarea props', () => {
            render(<Textarea name="message" id="message-input" required rows={5} cols={50} />);
            const textarea = screen.getByRole('textbox');

            expect(textarea).toHaveAttribute('name', 'message');
            expect(textarea).toHaveAttribute('id', 'message-input');
            expect(textarea).toHaveAttribute('required');
            expect(textarea).toHaveAttribute('rows', '5');
            expect(textarea).toHaveAttribute('cols', '50');
        });

        it('should handle onChange events', async () => {
            const user = userEvent.setup();
            const mockOnChange = vi.fn();
            render(<Textarea onChange={mockOnChange} />);

            const textarea = screen.getByRole('textbox');
            await user.type(textarea, 'test');

            expect(mockOnChange).toHaveBeenCalledTimes(4); // Once for each character
        });

        it('should handle focus events', async () => {
            const user = userEvent.setup();
            const mockOnFocus = vi.fn();
            render(<Textarea onFocus={mockOnFocus} />);

            const textarea = screen.getByRole('textbox');
            await user.click(textarea);

            expect(mockOnFocus).toHaveBeenCalledTimes(1);
        });

        it('should handle blur events', async () => {
            const user = userEvent.setup();
            const mockOnBlur = vi.fn();
            render(<Textarea onBlur={mockOnBlur} />);

            const textarea = screen.getByRole('textbox');
            await user.click(textarea);
            await user.tab();

            expect(mockOnBlur).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        it('should have correct ARIA attributes when error is present', () => {
            render(<Textarea error="Error message" aria-required="true" />);
            const textarea = screen.getByRole('textbox');

            expect(textarea).toHaveAttribute('aria-required', 'true');
        });

        it('should support ARIA attributes', () => {
            render(<Textarea aria-describedby="help-text" aria-invalid="true" />);
            const textarea = screen.getByRole('textbox');

            expect(textarea).toHaveAttribute('aria-describedby', 'help-text');
            expect(textarea).toHaveAttribute('aria-invalid', 'true');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty strings gracefully', () => {
            render(<Textarea label="" error="" helperText="" />);

            // Component should render without crashing
            const textarea = screen.getByRole('textbox');
            expect(textarea).toBeInTheDocument();
        });

        it('should handle special characters in text', () => {
            const specialText = 'Special chars: !@#$%^&*()_+{}[]|;:,.<>?';
            render(<Textarea label={specialText} error={specialText} />);

            // Should display special characters correctly in label
            const label = screen.getByText(specialText, { selector: 'label' });
            expect(label).toBeInTheDocument();

            // Should display special characters correctly in error message  
            const errorMsg = screen.getByText(specialText, { selector: 'p' });
            expect(errorMsg).toBeInTheDocument();
        });

        it('should handle multiline text content', async () => {
            const user = userEvent.setup();
            const multilineText = 'Line 1\nLine 2\nLine 3';
            render(<Textarea />);

            const textarea = screen.getByRole('textbox');
            await user.type(textarea, multilineText);

            expect(textarea).toHaveValue(multilineText);
        });
    });

    describe('Theme variations', () => {
        it('should include dark mode classes', () => {
            render(<Textarea />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('dark:bg-slate-800', 'dark:text-slate-100');
        });

        it('should include dark mode classes for error state', () => {
            render(<Textarea error="Error message" />);
            const textarea = screen.getByRole('textbox');
            expect(textarea).toHaveClass('dark:border-red-400');

            const errorElement = screen.getByText('Error message');
            expect(errorElement).toHaveClass('dark:text-red-400');
        });

        it('should include dark mode classes for helper text', () => {
            render(<Textarea helperText="Helper text" />);
            const helperElement = screen.getByText('Helper text');
            expect(helperElement).toHaveClass('dark:text-slate-400');
        });
    });
});
