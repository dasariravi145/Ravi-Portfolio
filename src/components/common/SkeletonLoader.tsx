import React from 'react';

export interface SkeletonProps {
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className = 'h-4 w-full',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-slate-200/70 rounded-md ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

