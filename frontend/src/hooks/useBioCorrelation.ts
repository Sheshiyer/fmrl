import { useState, useCallback } from 'react';
import { useAppState } from '../context/appState';

interface BioSnapshot {
  energy: number;
  symmetry: number;
  coherence: number;
  complexity: number;
  regulation: number;
  colorBalance: number;
  capturedAt: string;
}

export function useBioCorrelation() {
  const { state } = useAppState();
  const [snapshot, setSnapshot] = useState<BioSnapshot | null>(null);

  const captureSnapshot = useCallback(() => {
    const scores = state.compositeScores;
    const snap: BioSnapshot = {
      energy: scores.energy,
      symmetry: scores.symmetry,
      coherence: scores.coherence,
      complexity: scores.complexity,
      regulation: scores.regulation,
      colorBalance: scores.colorBalance,
      capturedAt: new Date().toISOString(),
    };
    setSnapshot(snap);
    return snap;
  }, [state.compositeScores]);

  const clearSnapshot = useCallback(() => setSnapshot(null), []);

  return { snapshot, captureSnapshot, clearSnapshot };
}
