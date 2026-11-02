/**
 * Model selector for local LLM model registry (Week 53)
 *
 * Allows users to choose the on-device language model:
 *  - phi3:mini  (2GB)  – low RAM devices
 *  - gemma-2b    (4GB) – balanced
 *  - llama-3.2-1b (1GB) – fastest
 */
import { config } from '@/lib/config';
import { Card, StatTile } from '@/components/ui';

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

const MEMORY_LABELS: Record<number, string> = {
  1024: '~1GB',
  2048: '~2GB',
  4096: '~4GB',
};

export function ModelSelector({ currentModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const selectedModel = currentModel || config.model.default;
  const presets: ModelPreset[] = Object.entries(config.model.presets).map(([model, details]) => ({
      model,
      label: details.label,
      memoryMb: details.memoryMb,
      isCurrent: model === currentModel,
  }));
  const selectedPreset = presets.find((preset) => preset.model === selectedModel);

  return (
    <Card title="Local AI model" subtitle="Choose which on-device language model runs your conversations.">
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          For best response quality, use a phone or tablet with 2GB+ RAM.
          The smallest model (&lt;1GB) runs on the broadest range of devices.
        </p>

        <label className="flex flex-col gap-1.5 text-xs text-slate-400">
          Model preset
          <select
            aria-label="Local AI model preset"
            value={selectedModel}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={disabled}
            className="hw-focus rounded-lg border border-edge bg-panel px-2.5 py-2 text-sm text-slate-200"
          >
            {presets.map((preset) => (
              <option key={preset.model} value={preset.model}>
                {preset.label} · {MEMORY_LABELS[preset.memoryMb] ?? `${preset.memoryMb}MB`}
              </option>
            ))}
          </select>
        </label>

        <StatTile
          label="Model"
          value={selectedPreset?.label ?? selectedModel}
          icon="shield"
          tone="signal"
        />
      </div>
    </Card>
  );
}
