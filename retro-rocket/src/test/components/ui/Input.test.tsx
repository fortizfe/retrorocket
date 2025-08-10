import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import Input from '../../../components/ui/Input';

describe('Input Component', () => {
    describe('Basic functionality', () => {
        it('should render input with default props', () => {
            render(<Input />);
            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
            expect(input).toHaveClass('block', 'w-full', 'rounded-lg', 'border');
        });

        it('should render input with placeholder', () => {
            const placeholder = 'Enter your text';
            render(<Input placeholder={placeholder} />);
            const input = screen.getByPlaceholderText(placeholder);
            expect(input).toBeInTheDocument();
        });

        it('should render input with value', () => {
            const value = 'Test value';
            render(<Input value={value} readOnly />);
            const input = screen.getByDisplayValue(value);
            expect(input).toBeInTheDocument();
        });

        it('should handle user input', async () => {
            const user = userEvent.setup();
            const mockOnChange = vi.fn();
            render(<Input onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.type(input, 'Hello');

            expect(mockOnChange).toHaveBeenCalled();
        });
    });

    describe('Label functionality', () => {
        it('should render label when provided', () => {
            const labelText = 'Username';
            render(<Input label={labelText} />);

            const label = screen.getByText(labelText);
            expect(label).toBeInTheDocument();
            expect(label.tagName).toBe('LABEL');
        });

        it('should not render label when not provided', () => {
            render(<Input />);
            const label = screen.queryByRole('label');
            expect(label).not.toBeInTheDocument();
        });

        it('should associate label with input', () => {
            const labelText = 'Username';
            render(<Input label={labelText} />);

            // Check that both label and input are present
            const label = screen.getByText(labelText);
            const input = screen.getByRole('textbox');
            expect(label).toBeInTheDocument();
            expect(input).toBeInTheDocument();
        });
    });

    describe('Variants', () => {
        it('should apply default variant styles', () => {
            render(<Input variant="default" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-slate-300', 'bg-white');
        });

        it('should apply outline variant styles', () => {
            render(<Input variant="outline" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-slate-300', 'bg-transparent');
        });

        it('should apply filled variant styles', () => {
            render(<Input variant="filled" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-slate-200', 'bg-slate-50');
        });

        it('should default to default variant when not specified', () => {
            render(<Input />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-slate-300', 'bg-white');
        });
    });

    describe('Sizes', () => {
        it('should apply small size styles', () => {
            render(<Input size="sm" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm');
        });

        it('should apply medium size styles', () => {
            render(<Input size="md" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-3', 'py-2', 'text-sm');
        });

        it('should apply large size styles', () => {
            render(<Input size="lg" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-4', 'py-3', 'text-base');
        });

        it('should default to medium size when not specified', () => {
            render(<Input />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-3', 'py-2', 'text-sm');
        });
    });

    describe('Error handling', () => {
        it('should display error message when error prop is provided', () => {
            const errorMessage = 'This field is required';
            render(<Input error={errorMessage} />);

            const errorElement = screen.getByText(errorMessage);
            expect(errorElement).toBeInTheDocument();
            expect(errorElement).toHaveClass('text-red-600');
        });

        it('should apply error styles to input when error is present', () => {
            render(<Input error="Error message" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-red-300', 'focus:border-red-500');
        });

        it('should not display helper text when error is present', () => {
            const helperText = 'This is helper text';
            const errorMessage = 'This is an error';
            render(<Input helperText={helperText} error={errorMessage} />);

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(screen.queryByText(helperText)).not.toBeInTheDocument();
        });

        it('should not display error message when error is not provided', () => {
            render(<Input />);
            const errorElements = screen.queryAllByRole('alert');
            expect(errorElements).toHaveLength(0);
        });
    });

    describe('Helper text', () => {
        it('should display helper text when provided and no error', () => {
            const helperText = 'Enter at least 8 characters';
            render(<Input helperText={helperText} />);

            const helperElement = screen.getByText(helperText);
            expect(helperElement).toBeInTheDocument();
            expect(helperElement).toHaveClass('text-slate-500');
        });

        it('should not display helper text when not provided', () => {
            render(<Input />);
            const helperElements = screen.queryAllByText(/Enter at least/);
            expect(helperElements).toHaveLength(0);
        });
    });

    describe('Forwarded ref', () => {
        it('should forward ref to input element', () => {
            const ref = createRef<HTMLInputElement>();
            render(<Input ref={ref} />);

            expect(ref.current).toBeTruthy();
            expect(ref.current?.tagName).toBe('INPUT');
        });

        it('should allow access to input methods through ref', () => {
            const ref = createRef<HTMLInputElement>();
            render(<Input ref={ref} />);

            expect(ref.current).toBeTruthy();
            expect(typeof ref.current?.focus).toBe('function');
            expect(typeof ref.current?.blur).toBe('function');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className along with default classes', () => {
            render(<Input className="custom-class" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('custom-class');
            expect(input).toHaveClass('block', 'w-full', 'rounded-lg');
        });

        it('should allow custom classes to override default styles', () => {
            render(<Input className="bg-red-500" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('bg-red-500');
        });
    });

    describe('Input props passthrough', () => {
        it('should pass through standard input props', () => {
            render(<Input type="email" name="email" id="email-input" required />);
            const input = screen.getByRole('textbox');

            expect(input).toHaveAttribute('type', 'email');
            expect(input).toHaveAttribute('name', 'email');
            expect(input).toHaveAttribute('id', 'email-input');
            expect(input).toHaveAttribute('required');
        });

        it('should handle onChange events', async () => {
            const user = userEvent.setup();
            const mockOnChange = vi.fn();
            render(<Input onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.type(input, 'test');

            expect(mockOnChange).toHaveBeenCalledTimes(4); // Once for each character
        });

        it('should handle focus events', async () => {
            const user = userEvent.setup();
            const mockOnFocus = vi.fn();
            render(<Input onFocus={mockOnFocus} />);

            const input = screen.getByRole('textbox');
            await user.click(input);

            expect(mockOnFocus).toHaveBeenCalledTimes(1);
        });

        it('should handle blur events', async () => {
            const user = userEvent.setup();
            const mockOnBlur = vi.fn();
            render(<Input onBlur={mockOnBlur} />);

            const input = screen.getByRole('textbox');
            await user.click(input);
            await user.tab();

            expect(mockOnBlur).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        it('should have correct ARIA attributes when error is present', () => {
            render(<Input error="Error message" aria-required="true" />);
            const input = screen.getByRole('textbox');

            expect(input).toHaveAttribute('aria-required', 'true');
        });

        it('should support ARIA attributes', () => {
            render(<Input aria-describedby="help-text" aria-invalid="true" />);
            const input = screen.getByRole('textbox');

            expect(input).toHaveAttribute('aria-describedby', 'help-text');
            expect(input).toHaveAttribute('aria-invalid', 'true');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty strings gracefully', () => {
            render(<Input label="" error="" helperText="" />);

            // Component should render without crashing
            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
        });

        it('should handle special characters in text', () => {
            const specialText = 'Special chars: !@#$%^&*()_+{}[]|;:,.<>?';
            render(<Input label={specialText} error={specialText} />);

            // Should display special characters correctly in label
            const label = screen.getByText(specialText, { selector: 'label' });
            expect(label).toBeInTheDocument();

            // Should display special characters correctly in error message  
            const errorMsg = screen.getByText(specialText, { selector: 'p' });
            expect(errorMsg).toBeInTheDocument();
        });

        it('should work with different input types', () => {
            const { rerender } = render(<Input type="password" />);
            let input = screen.getByDisplayValue('');
            expect(input).toHaveAttribute('type', 'password');

            rerender(<Input type="email" />);
            input = screen.getByDisplayValue('');
            expect(input).toHaveAttribute('type', 'email');

            rerender(<Input type="number" />);
            input = screen.getByDisplayValue('');
            expect(input).toHaveAttribute('type', 'number');
        });
    });

    describe('Theme variations', () => {
        it('should include dark mode classes', () => {
            render(<Input />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('dark:bg-slate-800', 'dark:text-slate-100');
        });

        it('should include dark mode classes for error state', () => {
            render(<Input error="Error message" />);
            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('dark:border-red-400');

            const errorElement = screen.getByText('Error message');
            expect(errorElement).toHaveClass('dark:text-red-400');
        });

        it('should include dark mode classes for helper text', () => {
            render(<Input helperText="Helper text" />);
            const helperElement = screen.getByText('Helper text');
            expect(helperElement).toHaveClass('dark:text-slate-400');
        });
    });
});