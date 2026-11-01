import React from 'react';

export type StatusType =
  | 'Verified Live Implementation'
  | 'Working Prototype'
  | 'In Active Development'
  | 'Planned Capability'
  | 'Production Pipeline Automated'
  | 'Google Play Closed Testing ONLY'
  | 'Published on Google Play Store'
  | 'Interactive Showcase Demo (Static Frontend Only)';

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (status) {
    case 'Live / Deployed':
    case 'Verified Live Implementation':
    case 'Production Pipeline Automated':
    case 'Published on Google Play Store':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-500 animate-pulse';
      break;
    case 'Working Prototype':
    case 'Google Play Closed Testing ONLY':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-500';
      break;
    case 'In Development':
    case 'In Active Development':
    case 'Interactive Showcase Demo (Static Frontend Only)':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
      dotColor = 'bg-brand-primary';
      break;
    case 'Planned':
    case 'Planned Capability':
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      dotColor = 'bg-indigo-500';
      break;
    case 'Not Available':
      colorClasses = 'bg-slate-100 text-slate-500 border-slate-200';
      dotColor = 'bg-slate-400';
      break;
  }

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClass} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};

export const CategoryPill: React.FC<{ label: string }> = ({ label }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
      {label}
    </span>
  );
};

export const TechTag: React.FC<{ label: string }> = ({ label }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors">
      {label}
    </span>
  );
};

export const VerificationBadge: React.FC<{
  status?: 'VERIFIED' | 'UNVERIFIED' | 'NOT PROVIDED' | string;
  size?: 'sm' | 'md';
}> = ({ status = 'NOT PROVIDED', size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (status === 'VERIFIED') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (status === 'UNVERIFIED') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClass} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};

export const EvidenceBadge: React.FC<{
  status?: 'Verified' | 'Owner-Reported' | 'Not Verified' | string;
  size?: 'sm' | 'md';
}> = ({ status = 'Not Verified', size = 'md' }) => {
  let colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (status === 'Verified') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (status === 'Owner-Reported') {
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
    dotColor = 'bg-teal-500';
  }

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClass} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>Evidence: {status}</span>
    </span>
  );
};


