import React from 'react';
import { CheckStatus, PRStatus } from '../../types';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface BadgeProps {
  status: CheckStatus | PRStatus | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  let colorClass = 'bg-gray-800 text-gray-300 border-gray-700';
  let Icon = AlertCircle;

  switch (status) {
    case CheckStatus.Success:
    case PRStatus.Mergeable:
    case PRStatus.Merged:
      colorClass = 'bg-green-900/30 text-green-400 border-green-800';
      Icon = CheckCircle2;
      break;
    case CheckStatus.Failure:
    case PRStatus.CIFailing:
    case PRStatus.ChangesRequested:
      colorClass = 'bg-red-900/30 text-red-400 border-red-800';
      Icon = XCircle;
      break;
    case CheckStatus.Running:
    case CheckStatus.Queued:
    case PRStatus.InReview:
      colorClass = 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      Icon = Clock;
      break;
    case PRStatus.Open:
      colorClass = 'bg-blue-900/30 text-blue-400 border-blue-800';
      Icon = AlertCircle;
      break;
  }

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClass} ${sizeClass} font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  );
};