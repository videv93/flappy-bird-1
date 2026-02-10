import { AlertTriangle } from 'lucide-react';

interface AnomalyBadgeProps {
  isAnomaly: boolean;
  className?: string;
}

export function AnomalyBadge({ isAnomaly, className }: AnomalyBadgeProps) {
  if (!isAnomaly) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400 ${className ?? ''}`}
      role="status"
      aria-label="Anomaly detected"
    >
      <AlertTriangle className="h-3 w-3" />
      Anomaly
    </span>
  );
}
