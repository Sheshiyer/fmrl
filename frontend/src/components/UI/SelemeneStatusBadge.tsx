/**
 * SelemeneStatusBadge
 * Shows the current Selemene API connection status with engine count.
 */
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import type { SelemeneConnectionStatus } from '../../services/SelemeneAuthBridge';

interface SelemeneStatusBadgeProps {
  status: SelemeneConnectionStatus;
  engineCount?: number;
  compact?: boolean;
}

const STATUS_CONFIG: Record<SelemeneConnectionStatus, {
  icon: typeof Wifi;
  label: string;
  color: string;
  dotColor: string;
}> = {
  connected: {
    icon: Wifi,
    label: 'Selemene Connected',
    color: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting...',
    color: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-pip-text-muted',
    dotColor: 'bg-pip-text-muted',
  },
  error: {
    icon: AlertTriangle,
    label: 'Connection Error',
    color: 'text-red-400',
    dotColor: 'bg-red-400',
  },
};

export function SelemeneStatusBadge({ status, engineCount, compact = false }: SelemeneStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={config.label}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
        <Icon className={`w-3 h-3 ${config.color} ${status === 'connecting' ? 'animate-spin' : ''}`} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/[0.06] bg-white/[0.03] ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      <Icon className={`w-3 h-3 ${status === 'connecting' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
      {status === 'connected' && engineCount != null && (
        <span className="text-pip-text-muted">· {engineCount} engines</span>
      )}
    </div>
  );
}
