import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import Button from '../../../components/ui/Button';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
    },
    AnimatePresence: vi.fn(({ children }) => children),
}));

const renderWithI18n = (component: React.ReactNode) => {
    return render(
        <I18nextProvider i18n={i18n}>
            {component}
        </I18nextProvider>
    );
};

describe('Button Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render with default props', () => {
        renderWithI18n(<Button>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
    });

    it('should handle click events', async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();

        renderWithI18n(<Button onClick={handleClick}>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });

        await user.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        renderWithI18n(<Button disabled>Disabled button</Button>);
        const button = screen.getByRole('button', { name: /disabled button/i });
        expect(button).toBeDisabled();
    });

    it('should show loading state', () => {
        renderWithI18n(<Button loading>Loading button</Button>);
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('should not call onClick when disabled', async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();

        renderWithI18n(<Button onClick={handleClick} disabled>Disabled</Button>);
        const button = screen.getByRole('button', { name: /disabled/i });

        await user.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', async () => {
        const handleClick = vi.fn();
        const user = userEvent.setup();

        renderWithI18n(<Button onClick={handleClick} loading>Loading</Button>);
        const button = screen.getByRole('button');

        await user.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
        renderWithI18n(<Button className="custom-class">Custom</Button>);
        const button = screen.getByRole('button', { name: /custom/i });
        expect(button).toHaveClass('custom-class');
    });

    it('should work with different variants', () => {
        const { rerender } = renderWithI18n(<Button variant="primary">Primary</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(
            <I18nextProvider i18n={i18n}>
                <Button variant="secondary">Secondary</Button>
            </I18nextProvider>
        );
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support different sizes', () => {
        const { rerender } = renderWithI18n(<Button size="sm">Small</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(
            <I18nextProvider i18n={i18n}>
                <Button size="lg">Large</Button>
            </I18nextProvider>
        );
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle keyboard events', async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Test Button</Button>);

        const button = screen.getByRole('button');
        button.focus();

        // Press Enter key
        await user.keyboard('{Enter}');
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should support custom button type', () => {
        renderWithI18n(<Button type="submit">Submit</Button>);
        const button = screen.getByRole('button', { name: /submit/i });
        expect(button).toHaveAttribute('type', 'submit');
    });
});
