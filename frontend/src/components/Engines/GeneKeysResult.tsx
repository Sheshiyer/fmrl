import { useState } from 'react';
import type { EngineOutput } from '../../types/selemene';
import { HologeneticProfile } from './GeneKeys/HologeneticProfile';
import { KeyDetail } from './GeneKeys/KeyDetail';
import { Clock, Cpu, Database } from 'lucide-react';

function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const val = obj[key] ?? obj[key.toLowerCase()];
    if (val !== undefined) return val;
  }
  return undefined;
}

export function GeneKeysResult({ result }: { result: EngineOutput }) {
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const data = (result.result ?? {}) as Record<string, unknown>;
  const sequences = (getField(data, 'sequences', 'Sequences', 'hologenetic_profile', 'profile') ?? {}) as Record<string, Record<string, number | { key: number; line?: number }>>;
  const keys = (getField(data, 'keys', 'gene_keys', 'GeneKeys', 'key_details') ?? {}) as Record<string, { shadow?: string; gift?: string; siddhi?: string; description?: string }>;

  const selectedKeyData = selectedKey ? keys[String(selectedKey)] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Witness Prompt */}
      {result.witness_prompt && (
        <div className="mystic-panel !p-5">
          <p className="text-lg italic text-pip-gold leading-relaxed">&ldquo;{result.witness_prompt}&rdquo;</p>
        </div>
      )}

      {/* Hologenetic Profile */}
      <div className="mystic-panel !p-4">
        <HologeneticProfile
          sequences={sequences}
          onKeyClick={setSelectedKey}
        />
      </div>

      {/* Key Detail Panel */}
      {selectedKeyData && selectedKey !== null ? (
        <KeyDetail
          keyNumber={selectedKey}
          shadow={selectedKeyData.shadow}
          gift={selectedKeyData.gift}
          siddhi={selectedKeyData.siddhi}
          description={selectedKeyData.description}
          onClose={() => setSelectedKey(null)}
        />
      ) : (
        <div className="mystic-panel !p-6 flex items-center justify-center text-pip-text-muted text-sm">
          Select a Gene Key to explore its Shadow → Gift → Siddhi journey
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-pip-text-muted px-1">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-pip-gold" />{result.metadata.calculation_time_ms.toFixed(1)}ms</span>
        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{result.metadata.backend}</span>
        <span className="flex items-center gap-1"><Database className="w-3 h-3" />{result.metadata.cached ? 'Cached' : 'Fresh'}</span>
      </div>
    </div>
  );
}
