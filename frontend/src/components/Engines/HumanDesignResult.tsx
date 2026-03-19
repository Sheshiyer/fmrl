import { useState } from 'react';
import type { EngineOutput } from '../../types/selemene';
import { TypeCard } from './HumanDesign/TypeCard';
import { BodyGraph } from './HumanDesign/BodyGraph';
import { CenterDetail } from './HumanDesign/CenterDetail';
import { ChannelDetail } from './HumanDesign/ChannelDetail';
import { Clock, Cpu, Database } from 'lucide-react';

function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

export function HumanDesignResult({ result }: { result: EngineOutput }) {
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);

  const data = (result.result ?? {}) as Record<string, unknown>;

  const type = String(getField(data, 'type', 'Type', 'hd_type') ?? '—');
  const strategy = String(getField(data, 'strategy', 'Strategy') ?? '—');
  const authority = String(getField(data, 'authority', 'Authority', 'inner_authority') ?? '—');
  const profile = String(getField(data, 'profile', 'Profile') ?? '—');

  const centers = (getField(data, 'centers', 'Centers', 'body_graph_centers') ?? {}) as Record<string, { defined: boolean; gates?: number[] }>;
  const channels = (getField(data, 'channels', 'Channels', 'body_graph_channels') ?? []) as Array<{ from: string; to: string; defined: boolean; gates?: [number, number] }>;

  // Center name mapping
  const centerNames: Record<string, string> = {
    head: 'Head', ajna: 'Ajna', throat: 'Throat', g: 'G/Self',
    sacral: 'Sacral', root: 'Root', heart: 'Heart/Will',
    spleen: 'Spleen', solar_plexus: 'Solar Plexus',
  };

  const selectedCenterData = selectedCenter ? centers[selectedCenter] : null;
  const selectedChannelData = selectedChannel !== null ? channels[selectedChannel] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">&ldquo;{result.witness_prompt}&rdquo;</p>
        </div>
      )}

      {/* Type Card */}
      <TypeCard type={type} strategy={strategy} authority={authority} profile={profile} />

      {/* Body Graph + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        <div className="mystic-panel !p-4 flex items-center justify-center">
          <BodyGraph
            centers={centers}
            channels={channels}
            onCenterClick={setSelectedCenter}
            onChannelClick={setSelectedChannel}
          />
        </div>
        <div className="flex flex-col gap-3">
          {selectedCenterData && selectedCenter && (
            <CenterDetail
              centerId={selectedCenter}
              centerName={centerNames[selectedCenter] ?? selectedCenter}
              defined={selectedCenterData.defined}
              gates={selectedCenterData.gates}
              onClose={() => setSelectedCenter(null)}
            />
          )}
          {selectedChannelData && selectedChannel !== null && (
            <ChannelDetail
              fromCenter={selectedChannelData.from}
              toCenter={selectedChannelData.to}
              gates={selectedChannelData.gates}
              defined={selectedChannelData.defined}
              onClose={() => setSelectedChannel(null)}
            />
          )}
          {!selectedCenterData && !selectedChannelData && (
            <div className="mystic-panel !p-6 flex items-center justify-center text-pip-text-muted text-sm">
              Click a center or channel to explore
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-pip-text-muted px-1">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-pip-gold" />{result.metadata.calculation_time_ms.toFixed(1)}ms</span>
        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{result.metadata.backend}</span>
        <span className="flex items-center gap-1"><Database className="w-3 h-3" />{result.metadata.cached ? 'Cached' : 'Fresh'}</span>
      </div>
    </div>
  );
}
