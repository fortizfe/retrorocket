import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import BoardTemplateSelector from '../../components/create-board/BoardTemplateSelector';

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: vi.fn()
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: 'div',
        label: 'label'
    }
}));

const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
        'createBoard.selectTemplate.title': 'Choose Template',
        'createBoard.selectTemplate.choose': 'Choose',
        'createBoard.selectTemplate.preview': 'Preview',
        'createBoard.selectTemplate.defaultSelected': 'Selected',
        'createBoard.selectTemplate.actionItemsNote': 'All templates include Action Items',
        'boardTemplates.default.name': 'Default Template',
        'boardTemplates.default.description': 'Traditional retrospective',
        'boardTemplates.madSadGlad.name': 'Mad, Sad, Glad',
        'boardTemplates.madSadGlad.description': 'Explore team emotions',
        'boardTemplates.startStopContinue.name': 'Start, Stop, Continue',
        'boardTemplates.startStopContinue.description': 'Focus on actions',
        'columns.helped': 'What helped',
        'columns.hindered': 'What hindered',
        'columns.improve': 'What to improve',
        'columns.mad': 'Mad',
        'columns.sad': 'Sad',
        'columns.glad': 'Glad',
        'columns.start': 'Start',
        'columns.stop': 'Stop',
        'columns.continue': 'Continue',
        'columns.actionItems': 'Action Items'
    };
    return translations[key] || key;
});

describe('BoardTemplateSelector', () => {
    beforeEach(() => {
        (useTranslation as any).mockReturnValue({ t: mockT });
    });

    const defaultProps = {
        value: null,
        onChange: vi.fn()
    };

    describe('Rendering', () => {
        it('should render all template options', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            expect(screen.getByText('Default Template')).toBeInTheDocument();
            expect(screen.getByText('Mad, Sad, Glad')).toBeInTheDocument();
            expect(screen.getByText('Start, Stop, Continue')).toBeInTheDocument();
        });

        it('should render template descriptions', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            expect(screen.getByText('Traditional retrospective')).toBeInTheDocument();
            expect(screen.getByText('Explore team emotions')).toBeInTheDocument();
            expect(screen.getByText('Focus on actions')).toBeInTheDocument();
        });

        it('should render preview sections for each template', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            const previewLabels = screen.getAllByText('Preview:');
            expect(previewLabels).toHaveLength(3);
        });

        it('should render action items note', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            expect(screen.getByText('All templates include Action Items')).toBeInTheDocument();
        });
    });

    describe('Selection behavior', () => {
        it('should show no template selected initially', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            const chooseButtons = screen.getAllByText('Choose');
            expect(chooseButtons).toHaveLength(3);
        });

        it('should show selected state when value is provided', () => {
            const props = { ...defaultProps, value: 'default' as const };
            render(<BoardTemplateSelector {...props} />);

            expect(screen.getByText('Selected')).toBeInTheDocument();
            const chooseButtons = screen.getAllByText('Choose');
            expect(chooseButtons).toHaveLength(2);
        });

        it('should call onChange when template is clicked', () => {
            const onChange = vi.fn();
            const props = { ...defaultProps, onChange };

            render(<BoardTemplateSelector {...props} />);

            const defaultTemplate = screen.getByLabelText('Choose Default Template');
            fireEvent.click(defaultTemplate);

            expect(onChange).toHaveBeenCalledWith('default');
        });

        it('should handle keyboard navigation', () => {
            const onChange = vi.fn();
            const props = { ...defaultProps, onChange };

            render(<BoardTemplateSelector {...props} />);

            const defaultTemplate = screen.getByLabelText('Choose Default Template');
            fireEvent.keyDown(defaultTemplate, { key: 'Enter' });

            expect(onChange).toHaveBeenCalledWith('default');
        });

        it('should handle space key selection', () => {
            const onChange = vi.fn();
            const props = { ...defaultProps, onChange };

            render(<BoardTemplateSelector {...props} />);

            const madSadGladTemplate = screen.getByLabelText('Choose Mad, Sad, Glad');
            fireEvent.keyDown(madSadGladTemplate, { key: ' ' });

            expect(onChange).toHaveBeenCalledWith('madSadGlad');
        });
    });

    describe('Accessibility', () => {
        it('should have proper radio button structure', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            const radioButtons = screen.getAllByRole('radio');
            expect(radioButtons).toHaveLength(3);
        });

        it('should have proper labels for screen readers', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            expect(screen.getByLabelText('Choose Default Template')).toBeInTheDocument();
            expect(screen.getByLabelText('Choose Mad, Sad, Glad')).toBeInTheDocument();
            expect(screen.getByLabelText('Choose Start, Stop, Continue')).toBeInTheDocument();
        });

        it('should check correct radio when value is set', () => {
            const props = { ...defaultProps, value: 'madSadGlad' as const };
            render(<BoardTemplateSelector {...props} />);

            const radioButtons = screen.getAllByRole('radio');
            const madSadGladRadio = radioButtons.find(radio =>
                (radio as HTMLInputElement).value === 'madSadGlad'
            );

            expect(madSadGladRadio).toBeChecked();
        });
    });

    describe('Column preview', () => {
        it('should render correct number of preview blocks for each template', () => {
            render(<BoardTemplateSelector {...defaultProps} />);

            // Each template should show 4 preview blocks (3 regular + 1 action)
            // Since we have 3 templates, we should have 12 preview blocks total
            const templateCards = screen.getAllByRole('radio').map(radio => radio.closest('label'));

            templateCards.forEach(card => {
                if (card) {
                    const previewBlocks = card.querySelectorAll('[title]');
                    expect(previewBlocks.length).toBeGreaterThanOrEqual(4);
                }
            });
        });
    });
});
