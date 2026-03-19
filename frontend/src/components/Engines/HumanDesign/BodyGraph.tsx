import { useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CenterData {
  defined: boolean;
  gates?: number[];
}

interface ChannelData {
  from: string;
  to: string;
  defined: boolean;
  gates?: [number, number];
}

interface BodyGraphProps {
  centers?: Record<string, CenterData>;
  channels?: ChannelData[];
  onCenterClick?: (centerId: string) => void;
  onChannelClick?: (channelIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Constants — 9 Centers with fixed positions (viewBox 300x400)
// ---------------------------------------------------------------------------

interface CenterMeta {
  id: string;
  label: string;
  x: number;
  y: number;
}

const CENTERS: CenterMeta[] = [
  { id: 'head',          label: 'Head',          x: 150, y: 30  },
  { id: 'ajna',          label: 'Ajna',          x: 150, y: 80  },
  { id: 'throat',        label: 'Throat',        x: 150, y: 140 },
  { id: 'g',             label: 'G/Self',        x: 150, y: 200 },
  { id: 'sacral',        label: 'Sacral',        x: 150, y: 290 },
  { id: 'root',          label: 'Root',          x: 150, y: 360 },
  { id: 'heart',         label: 'Heart',         x: 90,  y: 200 },
  { id: 'spleen',        label: 'Spleen',        x: 70,  y: 290 },
  { id: 'solarplexus',   label: 'Solar Plexus',  x: 230, y: 290 },
];

const CENTER_MAP = new Map(CENTERS.map((c) => [c.id, c]));

// Key channels (subset of the full 36)
const DEFAULT_CHANNELS: Array<[string, string]> = [
  ['head',        'ajna'],
  ['ajna',        'throat'],
  ['throat',      'g'],
  ['g',           'sacral'],
  ['sacral',      'root'],
  ['heart',       'throat'],
  ['heart',       'g'],
  ['spleen',      'sacral'],
  ['spleen',      'throat'],
  ['solarplexus', 'sacral'],
  ['solarplexus', 'throat'],
  ['solarplexus', 'root'],
];

const CENTER_RADIUS = 16;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BodyGraph({
  centers = {},
  channels = [],
  onCenterClick,
  onChannelClick,
}: BodyGraphProps) {
  // Build a quick lookup for channel defined-state by "from-to" key
  const channelLookup = new Map<string, { defined: boolean; gates?: [number, number]; index: number }>();
  channels.forEach((ch, i) => {
    channelLookup.set(`${ch.from}-${ch.to}`, { defined: ch.defined, gates: ch.gates, index: i });
    channelLookup.set(`${ch.to}-${ch.from}`, { defined: ch.defined, gates: ch.gates, index: i });
  });

  const handleCenterClick = useCallback(
    (id: string) => {
      onCenterClick?.(id);
    },
    [onCenterClick],
  );

  const handleChannelClick = useCallback(
    (idx: number) => {
      onChannelClick?.(idx);
    },
    [onChannelClick],
  );

  return (
    <svg
      viewBox="0 0 300 400"
      className="w-full h-full max-w-[300px] mx-auto"
      role="img"
      aria-label="Human Design Body Graph"
    >
      {/* ---- Channels (lines) ---- */}
      {DEFAULT_CHANNELS.map(([fromId, toId]) => {
        const fromCenter = CENTER_MAP.get(fromId)!;
        const toCenter = CENTER_MAP.get(toId)!;
        const key = `${fromId}-${toId}`;
        const info = channelLookup.get(key);
        const defined = info?.defined ?? false;

        return (
          <line
            key={key}
            x1={fromCenter.x}
            y1={fromCenter.y}
            x2={toCenter.x}
            y2={toCenter.y}
            className={
              defined
                ? 'stroke-pip-gold'
                : 'stroke-pip-border/30'
            }
            strokeWidth={defined ? 2.5 : 1.5}
            style={{ cursor: info ? 'pointer' : 'default' }}
            onClick={() => {
              if (info) handleChannelClick(info.index);
            }}
          />
        );
      })}

      {/* ---- Gate labels on channels ---- */}
      {DEFAULT_CHANNELS.map(([fromId, toId]) => {
        const key = `${fromId}-${toId}`;
        const info = channelLookup.get(key);
        if (!info?.gates) return null;
        const fromCenter = CENTER_MAP.get(fromId)!;
        const toCenter = CENTER_MAP.get(toId)!;
        const [g1, g2] = info.gates;
        // Position gate labels at 25% and 75% along the line
        const x1 = fromCenter.x + (toCenter.x - fromCenter.x) * 0.25;
        const y1 = fromCenter.y + (toCenter.y - fromCenter.y) * 0.25;
        const x2 = fromCenter.x + (toCenter.x - fromCenter.x) * 0.75;
        const y2 = fromCenter.y + (toCenter.y - fromCenter.y) * 0.75;
        return (
          <g key={`gates-${key}`}>
            <text
              x={x1}
              y={y1}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-pip-text-muted text-[8px]"
            >
              {g1}
            </text>
            <text
              x={x2}
              y={y2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-pip-text-muted text-[8px]"
            >
              {g2}
            </text>
          </g>
        );
      })}

      {/* ---- Centers (shapes) ---- */}
      {CENTERS.map((center) => {
        const data = centers[center.id];
        const defined = data?.defined ?? false;

        return (
          <g
            key={center.id}
            style={{ cursor: onCenterClick ? 'pointer' : 'default' }}
            onClick={() => handleCenterClick(center.id)}
          >
            {/* Background circle */}
            <circle
              cx={center.x}
              cy={center.y}
              r={CENTER_RADIUS}
              className={
                defined
                  ? 'fill-pip-gold/30 stroke-pip-gold'
                  : 'fill-pip-bg stroke-pip-border'
              }
              strokeWidth={defined ? 2 : 1}
              strokeDasharray={!defined && !data ? '4 3' : undefined}
            />
            {/* Label */}
            <text
              x={center.x}
              y={center.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`text-[7px] font-medium ${defined ? 'fill-pip-gold' : 'fill-pip-text-muted'}`}
            >
              {center.label}
            </text>
            {/* Gate badges (if any) */}
            {data?.gates?.slice(0, 3).map((gate, gi) => (
              <text
                key={gate}
                x={center.x + (gi - 1) * 12}
                y={center.y + CENTER_RADIUS + 10}
                textAnchor="middle"
                className="fill-pip-text-muted text-[7px]"
              >
                {gate}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
