import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'compact' | 'lg' | 'full';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    compact: 'max-w-6xl',
    lg: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

