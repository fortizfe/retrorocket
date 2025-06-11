import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: React.ReactNode;
  customBackground?: boolean; // Add this prop to disable default background
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    hover = false,
    customBackground = false,
    className,
    children,
    ...props
  }, ref) => {
    const baseClasses = 'rounded-lg transition-all duration-200';

    // If customBackground is true, don't include the default bg-white
    const variants = {
      default: customBackground ? 'border border-gray-200' : 'bg-white border border-gray-200',
      outlined: customBackground ? 'border-2 border-gray-200' : 'bg-white border-2 border-gray-200',
      elevated: customBackground ? 'shadow-md border border-gray-100' : 'bg-white shadow-md border border-gray-100',
      filled: customBackground ? 'border border-gray-200' : 'bg-gray-50 border border-gray-200'
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };

    const cardClasses = clsx(
      baseClasses,
      variants[variant],
      paddings[padding],
      hover && 'hover:shadow-lg hover:border-gray-300 cursor-pointer',
      className
    );

    const CardComponent = hover ? motion.div : 'div';
    const motionProps = hover ? {
      whileHover: { y: -2 },
      transition: { duration: 0.2 }
    } : {};

    return (
      <CardComponent
        ref={ref}
        className={cardClasses}
        {...motionProps}
        {...(props as any)}
      >
        {children}
      </CardComponent>
    );
  }
);

Card.displayName = 'Card';

export default Card;