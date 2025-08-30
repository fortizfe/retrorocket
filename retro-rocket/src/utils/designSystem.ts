import { clsx } from 'clsx';

/**
 * Enhanced spacing system with more granular control
 * Based on 8px grid system with additional micro-spacing options
 */
export const spacing = {
    // Micro spacing (for fine adjustments)
    'xs': 'gap-1',     // 4px
    'sm': 'gap-2',     // 8px
    'md': 'gap-4',     // 16px
    'lg': 'gap-6',     // 24px
    'xl': 'gap-8',     // 32px
    '2xl': 'gap-12',   // 48px
    '3xl': 'gap-16',   // 64px
} as const;

/**
 * Enhanced layout utilities for better responsive behavior
 */
export const layout = {
    container: {
        xs: 'max-w-sm mx-auto px-4',
        sm: 'max-w-md mx-auto px-4',
        md: 'max-w-4xl mx-auto px-6',
        lg: 'max-w-6xl mx-auto px-8',
        xl: 'max-w-7xl mx-auto px-8',
        full: 'w-full px-4 sm:px-6 lg:px-8',
    },
    grid: {
        // Responsive grid for retrospective columns
        retrospective: clsx(
            'grid grid-cols-1',
            'sm:grid-cols-2',
            'lg:grid-cols-3',
            'xl:grid-cols-4',
            'gap-4 sm:gap-6',
            'min-h-0'
        ),
        // Mobile-optimized single column
        retrospectiveMobile: 'flex flex-col gap-4 min-h-0',
        // Cards grid within columns
        cards: 'space-y-3',
    }
} as const;

/**
 * Enhanced typography scale with better hierarchy
 */
export const typography = {
    display: {
        1: 'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
        2: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
        3: 'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight',
    },
    heading: {
        1: 'text-2xl sm:text-3xl font-semibold tracking-tight',
        2: 'text-xl sm:text-2xl font-semibold tracking-tight',
        3: 'text-lg sm:text-xl font-semibold tracking-tight',
        4: 'text-base sm:text-lg font-semibold tracking-tight',
    },
    body: {
        lg: 'text-lg leading-relaxed',
        md: 'text-base leading-relaxed',
        sm: 'text-sm leading-relaxed',
        xs: 'text-xs leading-normal',
    },
    caption: 'text-xs text-slate-600 dark:text-slate-400 leading-tight',
    overline: 'text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400',
} as const;

/**
 * Enhanced color palette with better accessibility
 */
export const colors = {
    // Primary brand colors
    primary: {
        50: 'bg-blue-50 text-blue-900',
        100: 'bg-blue-100 text-blue-900',
        500: 'bg-blue-500 text-white',
        600: 'bg-blue-600 text-white',
        700: 'bg-blue-700 text-white',
    },
    // Status colors with better contrast
    success: {
        subtle: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
        default: 'bg-green-500 text-white',
        strong: 'bg-green-600 text-white',
    },
    warning: {
        subtle: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
        default: 'bg-amber-500 text-white',
        strong: 'bg-amber-600 text-white',
    },
    error: {
        subtle: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
        default: 'bg-red-500 text-white',
        strong: 'bg-red-600 text-white',
    },
    info: {
        subtle: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
        default: 'bg-blue-500 text-white',
        strong: 'bg-blue-600 text-white',
    },
} as const;

/**
 * Enhanced shadow system for better depth perception
 */
export const shadows = {
    // Subtle shadows for cards
    card: 'shadow-sm hover:shadow-md transition-shadow duration-200',
    cardElevated: 'shadow-md hover:shadow-lg transition-shadow duration-200',
    cardFloating: 'shadow-lg hover:shadow-xl transition-shadow duration-200',

    // Interactive element shadows
    button: 'shadow-sm hover:shadow transition-shadow duration-200',
    modal: 'shadow-2xl',
    dropdown: 'shadow-lg',

    // Focus states
    focus: 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900',
    focusInset: 'ring-2 ring-inset ring-blue-500',
} as const;

/**
 * Enhanced border radius system
 */
export const borderRadius = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',

    // Component-specific radius
    card: 'rounded-lg',
    button: 'rounded-lg',
    input: 'rounded-md',
    modal: 'rounded-xl',
} as const;

/**
 * Animation and transition presets
 */
export const animations = {
    // Standard transitions
    default: 'transition-all duration-200 ease-out',
    fast: 'transition-all duration-100 ease-out',
    slow: 'transition-all duration-300 ease-out',

    // Specific property transitions  
    colors: 'transition-colors duration-200 ease-out',
    transform: 'transition-transform duration-200 ease-out',
    opacity: 'transition-opacity duration-200 ease-out',
    shadow: 'transition-shadow duration-200 ease-out',

    // Hover and focus states
    hover: 'hover:scale-[1.02] hover:shadow-md transition-all duration-200',
    press: 'active:scale-[0.98] transition-transform duration-100',

    // Loading states
    pulse: 'animate-pulse',
    spin: 'animate-spin',
    bounce: 'animate-bounce',
} as const;

/**
 * Responsive breakpoint utilities
 */
export const breakpoints = {
    // Content breakpoints
    sm: 'sm:',  // 640px
    md: 'md:',  // 768px  
    lg: 'lg:',  // 1024px
    xl: 'xl:',  // 1280px
    '2xl': '2xl:', // 1536px

    // Custom breakpoints for retrospective
    mobile: 'max-sm:', // < 640px
    tablet: 'sm:max-lg:', // 640px - 1024px
    desktop: 'lg:', // >= 1024px
} as const;

/**
 * Enhanced interactive states
 */
export const interactiveStates = {
    // Button states
    buttonDefault: 'hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150',
    buttonDisabled: 'opacity-50 cursor-not-allowed',

    // Card states  
    cardHover: 'hover:shadow-md hover:scale-[1.01] transition-all duration-200',
    cardActive: 'ring-2 ring-blue-500 ring-offset-2',

    // Input states
    inputFocus: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    inputError: 'border-red-300 focus:border-red-500 focus:ring-red-500/20',

    // Touch-friendly states (mobile)
    touchTarget: 'min-h-[44px] min-w-[44px]', // WCAG touch target size
    touchHover: 'active:bg-slate-100 dark:active:bg-slate-700',
} as const;

/**
 * Accessibility utilities
 */
export const a11y = {
    // Screen reader only text
    srOnly: 'sr-only',

    // Focus management
    focusVisible: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    skipLink: 'absolute left-[-10000px] top-auto width-[1px] height-[1px] overflow-hidden focus:left-0 focus:top-0 focus:width-auto focus:height-auto focus:overflow-visible',

    // High contrast mode support
    highContrast: 'contrast-more:border-black contrast-more:dark:border-white',

    // Motion preferences
    motionReduce: 'motion-reduce:transition-none motion-reduce:animate-none',
} as const;

/**
 * Utility function to combine design tokens
 */
export function designTokens(...tokens: string[]) {
    return clsx(tokens);
}

/**
 * Responsive utility for conditional classes
 */
export function responsive(classes: {
    default?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
}) {
    return clsx(
        classes.default,
        classes.sm && `sm:${classes.sm}`,
        classes.md && `md:${classes.md}`,
        classes.lg && `lg:${classes.lg}`,
        classes.xl && `xl:${classes.xl}`
    );
}

export type SpacingKey = keyof typeof spacing;
export type LayoutKey = keyof typeof layout;
export type TypographyKey = keyof typeof typography;
export type ColorKey = keyof typeof colors;
export type ShadowKey = keyof typeof shadows;
export type BorderRadiusKey = keyof typeof borderRadius;
export type AnimationKey = keyof typeof animations;
