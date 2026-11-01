import React from 'react';
import { Container } from './Container';

export interface SectionWrapperProps extends React.HTMLAttributes<HTMLElement> {
  id?: string;
  background?: 'white' | 'pearl' | 'ambient';
  containerSize?: 'sm' | 'md' | 'lg' | 'full';
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  children,
  background = 'white',
  containerSize = 'lg',
  className = '',
  ...props
}) => {
  const bgStyles = {
    white: 'bg-white',
    pearl: 'bg-canvas-pearl border-y border-stroke-subtle',
    ambient: 'bg-ambient-gradient border-b border-stroke-ice',
  };

  return (
    <section
      id={id}
      className={`py-16 md:py-24 ${bgStyles[background]} ${className}`}
      {...props}
    >
      <Container size={containerSize}>
        {children}
      </Container>
    </section>
  );
};

