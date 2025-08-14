import React from 'react';
import { Calendar } from 'lucide-react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { es, enUS } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';
import { useLanguage } from '../../hooks/useLanguage';

// Registrar las localizaciones
registerLocale('es', es);
registerLocale('en', enUS);

interface DatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
    minDate?: Date;
    maxDate?: Date;
    zIndex?: number; // Permitir personalizar el z-index del popper
}

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder,
    disabled = false,
    className = '',
    label,
    minDate,
    maxDate,
    zIndex = 9999
}) => {
    const { t, currentLanguage } = useLanguage();

    const effectivePlaceholder = placeholder || t('datePicker.placeholder');
    const locale = currentLanguage === 'en' ? 'en' : 'es';

    // Crear estilos dinámicos para el z-index del popper
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .datepicker-popper-z${zIndex} {
                z-index: ${zIndex} !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, [zIndex]);

    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <ReactDatePicker
                    selected={value}
                    onChange={onChange}
                    placeholderText={effectivePlaceholder}
                    disabled={disabled}
                    minDate={minDate}
                    maxDate={maxDate}
                    dateFormat="dd/MM/yyyy"
                    locale={locale}
                    showPopperArrow={false}
                    popperClassName={`datepicker-popper-z${zIndex}`}
                    className={`
                        w-full p-2 text-sm border border-slate-200 dark:border-slate-700 
                        rounded bg-white dark:bg-slate-800 
                        text-slate-900 dark:text-slate-100
                        placeholder-slate-500 dark:placeholder-slate-400
                        focus:ring-2 focus:ring-amber-500 focus:border-transparent
                        transition-colors
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750'}
                        ${className}
                    `}
                    wrapperClassName="w-full"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    isClearable
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
            </div>
        </div>
    );
};

export default DatePicker;