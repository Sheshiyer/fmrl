/**
 * PIP Control Panel - sliders for all PIP shader parameters
 */
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PIPSettings } from '../../types';

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function ControlSlider({ label, value, min, max, step, onChange }: ControlSliderProps) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
    </label>
  );
}

interface PIPControlPanelProps {
  pipRenderer: {
    settings: PIPSettings;
    setParameter: <K extends keyof PIPSettings>(name: K, value: PIPSettings[K]) => void;
    loadPreset: (preset: Partial<PIPSettings>) => void;
  };
}

export function PIPControlPanel({ pipRenderer }: PIPControlPanelProps) {
  const { settings, setParameter } = pipRenderer;
  const [isExpanded, setIsExpanded] = React.useState(true);

  const presets = {
    default: {
      seed: 1348, period: 0.22, harmonics: 2, spread: 2.6, gain: 0.7,
      roughness: 0.5, exponent: 0.5, amplitude: 0.53, offset: 0.5,
      speed: 1.0, intensity: 1.0, monochrome: false,
    },
    subtle: {
      period: 0.3, harmonics: 1, amplitude: 0.3, intensity: 0.5,
    },
    intense: {
      period: 0.15, harmonics: 4, amplitude: 0.8, intensity: 1.5,
    },
    slow: {
      speed: 0.3, period: 0.4,
    },
    fast: {
      speed: 2.0, period: 0.1,
    },
  };

  return (
    <div className="mt-4 bg-gray-800/70 backdrop-blur rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">PIP Parameters</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(presets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => pipRenderer.loadPreset(preset)}
                className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-colors capitalize"
              >
                {name}
              </button>
            ))}
          </div>

          {/* Noise Parameters */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Noise</h4>
            <div className="grid grid-cols-2 gap-4">
              <ControlSlider
                label="Seed"
                value={settings.seed}
                min={0}
                max={9999}
                step={1}
                onChange={(v) => setParameter('seed', v)}
              />
              <ControlSlider
                label="Period"
                value={settings.period}
                min={0.01}
                max={2.0}
                step={0.01}
                onChange={(v) => setParameter('period', v)}
              />
              <ControlSlider
                label="Harmonics"
                value={settings.harmonics}
                min={0}
                max={8}
                step={1}
                onChange={(v) => setParameter('harmonics', v)}
              />
              <ControlSlider
                label="Spread"
                value={settings.spread}
                min={1.0}
                max={4.0}
                step={0.1}
                onChange={(v) => setParameter('spread', v)}
              />
              <ControlSlider
                label="Gain"
                value={settings.gain}
                min={0.0}
                max={1.0}
                step={0.01}
                onChange={(v) => setParameter('gain', v)}
              />
              <ControlSlider
                label="Roughness"
                value={settings.roughness}
                min={0.0}
                max={1.0}
                step={0.01}
                onChange={(v) => setParameter('roughness', v)}
              />
              <ControlSlider
                label="Exponent"
                value={settings.exponent}
                min={0.1}
                max={3.0}
                step={0.01}
                onChange={(v) => setParameter('exponent', v)}
              />
              <ControlSlider
                label="Amplitude"
                value={settings.amplitude}
                min={0.0}
                max={2.0}
                step={0.01}
                onChange={(v) => setParameter('amplitude', v)}
              />
              <ControlSlider
                label="Offset"
                value={settings.offset}
                min={0.0}
                max={1.0}
                step={0.01}
                onChange={(v) => setParameter('offset', v)}
              />
            </div>
          </div>

          {/* Animation */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Animation</h4>
            <ControlSlider
              label="Speed"
              value={settings.speed}
              min={0.0}
              max={3.0}
              step={0.1}
              onChange={(v) => setParameter('speed', v)}
            />
          </div>

          {/* Blend */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blend</h4>
            <ControlSlider
              label="Intensity"
              value={settings.intensity}
              min={0.0}
              max={2.0}
              step={0.01}
              onChange={(v) => setParameter('intensity', v)}
            />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={settings.monochrome}
                onChange={(e) => setParameter('monochrome', e.target.checked)}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500"
              />
              Monochrome
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default PIPControlPanel;
