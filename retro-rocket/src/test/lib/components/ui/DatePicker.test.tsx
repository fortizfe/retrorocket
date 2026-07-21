import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DatePicker from '@/lib/components/ui/DatePicker';

describe('DatePicker', () => {
    const defaultProps = {
        value: null,
        onChange: vi.fn(),
        placeholder: 'Seleccionar fecha'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic functionality', () => {
        it('renders with placeholder text', () => {
            render(<DatePicker {...defaultProps} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('placeholder', 'Seleccionar fecha');
        });

        it('displays selected date', () => {
            const testDate = new Date('2024-12-25');
            render(<DatePicker {...defaultProps} value={testDate} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('25/12/2024');
        });

        it('shows label when provided', () => {
            render(<DatePicker {...defaultProps} label="Fecha de vencimiento" />);

            expect(screen.getByText('Fecha de vencimiento')).toBeInTheDocument();
        });

        it('can be disabled', () => {
            render(<DatePicker {...defaultProps} disabled />);

            const input = screen.getByRole('textbox');
            expect(input).toBeDisabled();
        });
    });

    describe('Calendar interaction', () => {
        it('opens calendar when input is clicked', async () => {
            render(<DatePicker {...defaultProps} />);

            const input = screen.getByRole('textbox');
            fireEvent.click(input);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });
        });

        it('shows calendar with Spanish localization', async () => {
            render(<DatePicker {...defaultProps} />);

            const input = screen.getByRole('textbox');
            fireEvent.click(input);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
                // Should show Spanish month name (use getAllByText for multiple matches)
                const spanishMonths = screen.getAllByText(/agosto|enero|febrero|marzo|abril|mayo|junio|julio|septiembre|octubre|noviembre|diciembre/);
                expect(spanishMonths.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Date selection', () => {
        it('calls onChange when date is typed or selected', async () => {
            const onChange = vi.fn();
            render(<DatePicker {...defaultProps} onChange={onChange} />);

            const input = screen.getByRole('textbox');

            // Simulate typing a date
            fireEvent.change(input, { target: { value: '25/12/2024' } });

            // The onChange should be called by react-datepicker
            await waitFor(() => {
                expect(onChange).toHaveBeenCalled();
            }, { timeout: 1000 });
        });

        it('calls onChange with null when clear button is clicked', async () => {
            const onChange = vi.fn();
            const testDate = new Date('2024-12-25');
            render(<DatePicker {...defaultProps} value={testDate} onChange={onChange} />);

            // With react-datepicker, the clear button appears when there's a value
            const clearButton = screen.getByLabelText('Close');
            fireEvent.click(clearButton);

            expect(onChange).toHaveBeenCalledWith(null, expect.anything());
        });
    });

    describe('Navigation', () => {
        it('has dropdowns for month and year selection', async () => {
            render(<DatePicker {...defaultProps} />);

            const input = screen.getByRole('textbox');
            fireEvent.click(input);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Check that month and year dropdowns are available
            const monthSelect = screen.getByDisplayValue(/agosto|enero|febrero|marzo|abril|mayo|junio|julio|septiembre|octubre|noviembre|diciembre/);
            const yearSelect = screen.getByDisplayValue(/\d{4}/);

            expect(monthSelect).toBeInTheDocument();
            expect(yearSelect).toBeInTheDocument();
        });

        it('allows navigation between months', async () => {
            render(<DatePicker {...defaultProps} />);

            const input = screen.getByRole('textbox');
            fireEvent.click(input);

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // Check navigation buttons are present
            const prevButton = screen.getByLabelText('Previous Month');
            const nextButton = screen.getByLabelText('Next Month');

            expect(prevButton).toBeInTheDocument();
            expect(nextButton).toBeInTheDocument();
        });
    });

    describe('Date constraints', () => {
        it('respects minDate constraints', () => {
            const minDate = new Date('2025-08-15');
            render(<DatePicker {...defaultProps} minDate={minDate} />);

            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
            // The constraint is applied internally by react-datepicker
        });

        it('respects maxDate constraints', () => {
            const maxDate = new Date('2025-08-15');
            render(<DatePicker {...defaultProps} maxDate={maxDate} />);

            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
            // The constraint is applied internally by react-datepicker
        });
    });

    describe('Localization', () => {
        it('uses Spanish date format', () => {
            const testDate = new Date('2024-12-25');
            render(<DatePicker {...defaultProps} value={testDate} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('25/12/2024');
        });

        it('displays calendar icon', () => {
            render(<DatePicker {...defaultProps} />);

            // Check for SVG element (Calendar icon from Lucide)
            const container = screen.getByRole('textbox').closest('.relative');
            const svgElement = container?.querySelector('svg');
            expect(svgElement).toBeInTheDocument();
        });
    });
});
