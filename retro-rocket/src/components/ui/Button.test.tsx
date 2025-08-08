import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/utils/test-utils';

// Create a simple Button component mock for testing
const Button = ({
    children,
    onClick,
    disabled,
    loading,
    variant = 'primary',
    size = 'md',
    ...props
}: any) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors';
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    };
    const sizeClasses = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
            onClick={onClick}
            disabled={disabled || loading}
            data-loading={loading}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    );
};

describe('Button Component', () => {
    it('should render button with text', () => {
        render(<Button>Click me</Button>);

        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should handle click events', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        const button = screen.getByRole('button', { name: /click me/i });
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Button disabled>Click me</Button>);

        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeDisabled();
    });

    it('should show loading state', () => {
        render(<Button loading>Click me</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('data-loading', 'true');
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should apply primary variant styles', () => {
        render(<Button variant="primary">Primary Button</Button>);

        const button = screen.getByRole('button', { name: /primary button/i });
        expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should apply secondary variant styles', () => {
        render(<Button variant="secondary">Secondary Button</Button>);

        const button = screen.getByRole('button', { name: /secondary button/i });
        expect(button).toHaveClass('bg-gray-200', 'text-gray-900');
    });

    it('should apply ghost variant styles', () => {
        render(<Button variant="ghost">Ghost Button</Button>);

        const button = screen.getByRole('button', { name: /ghost button/i });
        expect(button).toHaveClass('bg-transparent', 'text-gray-600');
    });

    it('should apply small size styles', () => {
        render(<Button size="sm">Small Button</Button>);

        const button = screen.getByRole('button', { name: /small button/i });
        expect(button).toHaveClass('px-3', 'py-2', 'text-sm');
    });

    it('should apply medium size styles by default', () => {
        render(<Button>Default Button</Button>);

        const button = screen.getByRole('button', { name: /default button/i });
        expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply large size styles', () => {
        render(<Button size="lg">Large Button</Button>);

        const button = screen.getByRole('button', { name: /large button/i });
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('should pass through additional props', () => {
        render(<Button data-testid="custom-button" aria-label="Custom button">Button</Button>);

        const button = screen.getByTestId('custom-button');
        expect(button).toHaveAttribute('aria-label', 'Custom button');
    });

    it('should not trigger click when disabled', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick} disabled>Disabled Button</Button>);

        const button = screen.getByRole('button', { name: /disabled button/i });
        fireEvent.click(button);

        expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not trigger click when loading', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick} loading>Loading Button</Button>);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(handleClick).not.toHaveBeenCalled();
    });
});
