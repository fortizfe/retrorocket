import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Palette } from 'lucide-react';
import { CardColor } from '../../types/card';
import { getAvailableColors, getColorConfig } from '../../utils/cardColors';

interface ColorPickerProps {
    selectedColor: CardColor;
    onColorChange: (color: CardColor) => void;
    disabled?: boolean;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onColorChange,
    disabled = false,
    showLabel = false,
    size = 'md'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const colors = getAvailableColors();
    const selectedConfig = getColorConfig(selectedColor);

    // Calculate icon size based on size prop
    const getIconSize = (size: 'sm' | 'md' | 'lg') => {
        switch (size) {
            case 'sm': return 12;
            case 'md': return 14;
            case 'lg': return 16;
            default: return 14;
        }
    };

    // Size configurations
    const sizeConfig = {
        sm: {
            trigger: 'w-6 h-6',
            colorButton: 'w-8 h-8',
            popup: 'p-2 gap-2'
        },
        md: {
            trigger: 'w-8 h-8',
            colorButton: 'w-10 h-10',
            popup: 'p-3 gap-2'
        },
        lg: {
            trigger: 'w-10 h-10',
            colorButton: 'w-12 h-12',
            popup: 'p-4 gap-3'
        }
    };

    const config = sizeConfig[size];

    // Calculate popup position
    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Popup dimensions (approximate)
        const popupWidth = 260;
        const popupHeight = 120;

        let left = triggerRect.left;
        let top = triggerRect.bottom + 8;

        // Adjust horizontal position if it would overflow
        if (left + popupWidth > viewportWidth) {
            left = triggerRect.right - popupWidth;
        }

        // Adjust vertical position if it would overflow
        if (top + popupHeight > viewportHeight) {
            top = triggerRect.top - popupHeight - 8;
        }

        setPopupPosition({ top, left });
    };

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                popupRef.current &&
                triggerRef.current &&
                !popupRef.current.contains(event.target as Node) &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            calculatePosition();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleTriggerClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleColorSelect = (color: CardColor) => {
        onColorChange(color);
        setIsOpen(false);
    };

    const popup = isOpen ? (
        // eslint-disable-next-line react/forbid-dom-props
        <div
            ref={popupRef}
            className={`
        fixed z-[9999] 
        bg-white border border-gray-200 rounded-xl shadow-2xl 
        ${config.popup}
        animate-in fade-in-0 zoom-in-95 duration-200
      `}
            // eslint-disable-next-line react/forbid-dom-props
            style={{
                top: popupPosition.top,
                left: popupPosition.left,
            }}
        >
            <div className="flex flex-wrap max-w-[240px]">
                {colors.map((color) => {
                    const colorConfig = getColorConfig(color);
                    const isSelected = color === selectedColor;

                    return (
                        <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            className={`
                ${config.colorButton}
                ${colorConfig.preview}
                border-2 rounded-full
                transition-all duration-200
                hover:scale-110 hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                ${isSelected
                                    ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 border-blue-500'
                                    : 'border-gray-300 hover:border-gray-400'
                                }
              `}
                            aria-label={colorConfig.ariaLabel}
                            title={colorConfig.tooltip}
                        >
                            {isSelected && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <svg
                                        className="w-4 h-4 text-blue-600 drop-shadow-sm"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Color name display with enhanced info */}
            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-medium">
                        {selectedConfig.name}
                    </span>
                    <span className="text-xs text-gray-500">
                        {colors.indexOf(selectedColor) + 1}/{colors.length}
                    </span>
                </div>
                {selectedConfig.tooltip && (
                    <div className="text-xs text-gray-500 mt-1">
                        {selectedConfig.tooltip}
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                ref={triggerRef}
                onClick={handleTriggerClick}
                disabled={disabled}
                className={`
          ${config.trigger}
          ${selectedConfig.preview}
          border-2 border-gray-300 rounded-full
          flex items-center justify-center
          transition-all duration-200
          hover:scale-105 hover:shadow-md hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          relative
        `}
                aria-label={`Color selector: ${selectedConfig.name}`}
                title={`Cambiar color (actual: ${selectedConfig.name})`}
            >
                {/* Palette icon overlay for better visibility */}
                <Palette
                    size={getIconSize(size)}
                    className="text-gray-600 drop-shadow-sm"
                />
            </button>

            {/* Color name label */}
            {showLabel && (
                <span className="block text-xs text-gray-600 mt-1 text-center">
                    {selectedConfig.name}
                </span>
            )}

            {/* Portal for popup to ensure it appears above everything */}
            {typeof document !== 'undefined' && createPortal(popup, document.body)}
        </div>
    );
};

export default ColorPicker;
