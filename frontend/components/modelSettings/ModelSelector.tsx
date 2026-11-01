/**
 * Model selector for local LLM model registry (Week 53)
 *
 * Allows users to choose the on-device language model:
 *  - phi3:mini  (2GB)  – low RAM devices
 *  - gemma-2b    (4GB) – balanced
 *  - llama-3.2-1b (1GB) – fastest
 */
import { config } from '@/lib/config';
import { Card, Select, StatTile } from '@/components/ui';
import { useState } from 'react';

export interface ModelPreset {
  model: string;
  label: string;
  memoryMb: number;
  isCurrent: boolean;
}

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const MEMORY_LABELS = {
  1024: '~1GB',
  2048: '~2GB',
  4096: '~4GB',
};

export function ModelSelector({ currentModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<string>(currentModel || config.model.default);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const model = event.target.value;
    setError(null);
    setSelectedModel(model);
    onModelChange(model);
  };

  const getPresets = (): ModelPreset[] => {
    return Object.entries(config.model.presets).map(([model, details]) => ({
      model,
      label: details.label,
      memoryMb: details.memoryMb,
      isCurrent: model === currentModel,
    }));
  };

  return (
    <Card title="Local AI model" subtitle="Choose which on-device language model runs your conversations.">
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          For best response quality, use a phone or tablet with 2GB+ RAM.
          The smallest model (&lt;1GB) runs on the broadest range of devices.
        </p>

        <div className="space-y-2">
          {getPresets().map((preset) => (
            <div
              key={preset.model}
              className={`hw-focus flex items-center justify-between rounded-xl border px-3 py-2 transition-colors ${
                selectedModel === preset.model
                  ? 'border-signal-500/40 bg-signal-500/5'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200">{preset.label}</p>
                <p className="text-xs text-slate-500">
                  {MEMORY_LABELS[preset.memoryMb] || `${preset.memoryMb}MB`} RAM
                  {preset.isCurrent && '  ·  Currently active'}
                </p>
              </div>
              <Select
                value={preset.model}
                onChange={handleChange}
                disabled={disabled}
                className="w-32"
              />
            </div>
          ))}

          {error && (
            <p role="alert" className="text-xs text-alarm">
              {error}
            </p>
          )}
        </div>

        <StatTile
          label="Model"
          value={selectedModel}
          icon="cpu"
          tone="info"
        />
      </div>
    </Card>
  );
}
