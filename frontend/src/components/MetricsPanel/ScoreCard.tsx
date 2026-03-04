/**
 * Score Card Component - displays a single composite score
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreCardProps {
  title: string;
  value: number;
  maxValue?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  description?: string;
}

const getColorClasses = (value: number): string => {
  if (value >= 80) return 'bg-green-500';
  if (value >= 60) return 'bg-emerald-500';
  if (value >= 40) return 'bg-yellow-500';
  if (value >= 20) return 'bg-orange-500';
  return 'bg-red-500';
};

const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    case 'stable':
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

export function ScoreCard({
  title,
  value,
  maxValue = 100,
  trend,
  color,
  description,
}: ScoreCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const colorClass = color || getColorClasses(value);

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
          {title}
        </h3>
        {trend && getTrendIcon(trend)}
      </div>
      
      <div className="flex items-end gap-2 mb-2">
        <span className="text-3xl font-bold text-white">
          {Math.round(value)}
        </span>
        <span className="text-sm text-gray-500 mb-1">/ {maxValue}</span>
      </div>
      
      <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {description && (
        <p className="mt-2 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default ScoreCard;
