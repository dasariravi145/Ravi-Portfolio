import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'blue' | 'emerald' | 'amber' | 'neutral';
  };
  onClick?: () => void;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  onClick,
}) => {
  const getBadgeStyle = (variant?: 'blue' | 'emerald' | 'amber' | 'neutral') => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'neutral':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          </div>
        </div>

        {badge && (
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBadgeStyle(
              badge.variant
            )}`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5">{subtitle}</p>}
    </div>
  );
};

