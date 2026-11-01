import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
  target?: string;
  rel?: string;
  download?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  as = 'button',
  href,
  target,
  rel,
  download,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-ring disabled:opacity-60 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5',
    md: 'text-sm px-4 py-2.5 rounded-md gap-2',
    lg: 'text-base px-6 py-3 rounded-lg gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-brand-primary text-white hover:bg-brand-hover shadow-subtle hover:shadow-card hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-canvas-surface text-brand-primary border border-stroke-ice hover:bg-blue-100/70 hover:border-stroke-active',
    outline: 'bg-white text-slate-700 border border-stroke-subtle hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-subtle hover:shadow-card',
  };

  const combinedClasses = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  if (as === 'a' && href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === '_blank' ? (rel || 'noopener noreferrer') : rel}
        download={download}
        className={combinedClasses}
      >
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </a>
    );
  }

  return (
    <button
      disabled={disabled || isLoading}
      className={combinedClasses}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 mr-2 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
