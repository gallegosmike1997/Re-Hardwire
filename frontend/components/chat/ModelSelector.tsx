"use client";

import { useState, useEffect } from 'react';
import { useSession } from '@/state/useSession';
import { config } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type ModelInfo = {
  name: string;
  memoryMb: number | null;
  description: string;
  provider: 'local' | 'openai' | 'gemma' | 'phi3';
};

const MODELS: ModelInfo[] = [
  { name: 'Phi-3 Mini (local)', memoryMb: 2048, description: 'Low RAM: runs on 2GB+ devices', provider: 'local' },
  { name: 'Gemma 2B (local)', memoryMb: 4096, description: 'Balanced: good quality and speed', provider: 'local' },
  { name: 'Llama 3.2 1B (local)', memoryMb: 1024, description: 'Fastest: minimal memory footprint', provider: 'local' },
  { name: 'Gemma 3B (local)', memoryMb: 8192, description: 'High quality: 3B parameters for clinical accuracy', provider: 'local' },
  { name: 'OpenAI GPT-4', memoryMb: null, description: 'Cloud: highest quality, requires API key', provider: 'openai' },
];

export function ModelSelector() {
  const { subjectId, setModelPreference } = useSession();
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const handleModelSelect = (model: ModelInfo) => {
    setSelectedModel(model);
    setShowModelPicker(false);
    // Save preference to session
    if (subjectId && setModelPreference) {
      setModelPreference(model.provider, model.name);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2" onClick={() => setShowModelPicker(!showModelPicker)}>
        <span className="text-sm font-medium text-slate-100 selected-model-name">
          {selectedModel?.name || 'Local AI'}
          <br />
          <span className="text-[10px] opacity-60">{selectedModel?.provider || 'local'}</span>
        </span>
        <Badge variant="outline" size="small" className="text-[10px]">
          {selectedModel?.provider || 'local'}
        </Badge>
      </div>
      {showModelPicker && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-signal-500/30 bg-signal-500/5 p-4 max-h-96 overflow-y-auto z-50">
          <p className="text-sm font-medium text-slate-200 mb-3">Select Model</p>
          {MODELS.map((model) => (
            <button
              key={model.name}
              onClick={() => handleModelSelect(model)}
              className="w-full justify-start rounded-xl border border-signal-500/20 bg-panelsoft p-2.5 text-left hover:bg-signal-500/10 transition-colors mb-1"
            >
              <span className="font-medium text-slate-100">{model.name}</span>
              <br />
              <span className="text-[10px] opacity-60">{model.description}</span>
              {model.memoryMb && <span className="text-[10px] ml-2">{model.memoryMb}MB min}</span>
            </button>
          ))}
          <button
            onClick={() => setShowModelPicker(false)}
            className="w-full text-sm text-slate-400 hover:text-signal-300 mt-2"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}