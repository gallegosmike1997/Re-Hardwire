"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useProfileStore } from '@/state/useProfileStore';
import { Badge, Button, Icon } from '@/components/ui';

type ModelInfo = {
  model: string;
  name: string;
  memoryMb: number | null;
  description: string;
  provider: 'local' | 'openai' | 'ollama' | 'gemma';
};

const MODELS: ModelInfo[] = [
  { model: 're-hardwire-local', name: 'On-device coach', memoryMb: null, description: 'Private, deterministic offline coaching', provider: 'local' },
  { model: 'phi3:mini', name: 'Phi-3 Mini', memoryMb: 2048, description: 'Local Ollama model · 2GB+ RAM', provider: 'ollama' },
  { model: 'gemma2:2b', name: 'Gemma 2B', memoryMb: 4096, description: 'Local Ollama model · balanced speed and quality', provider: 'ollama' },
  { model: 'llama3.2:1b', name: 'Llama 3.2 1B', memoryMb: 1024, description: 'Local Ollama model · low memory use', provider: 'ollama' },
  { model: 'gemma3:3b', name: 'Gemma 3B', memoryMb: 8192, description: 'Local Gemma endpoint · higher memory use', provider: 'gemma' },
  { model: 'gpt-4o-mini', name: 'OpenAI GPT-4o mini', memoryMb: null, description: 'Remote provider · backend API key required', provider: 'openai' },
];

export function ModelSelector() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const isSaving = useProfileStore((state) => state.isSaving);
  const [providers, setProviders] = useState<string[]>(['local']);
  const [defaultProvider, setDefaultProvider] = useState('local');
  const [defaultModel, setDefaultModel] = useState('re-hardwire-local');
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    let active = true;
    void api.getCapabilities().then((response) => {
      const llm = response.data?.llm;
      if (!active || !response.success || !llm) return;
      setProviders(llm.providers.includes('local') ? llm.providers : ['local', ...llm.providers]);
      setDefaultProvider(llm.defaultProvider);
      setDefaultModel(llm.defaultModel);
    });
    return () => { active = false; };
  }, []);

  const availableModels = MODELS.filter((model) => providers.includes(model.provider));
  const savedModel = profile?.preferences.coachModel;
  const savedProvider = profile?.preferences.coachProvider;
  const selectedModel = availableModels.find(
    (model) => model.model === savedModel && model.provider === savedProvider,
  ) ?? availableModels.find(
    (model) => model.model === defaultModel && model.provider === defaultProvider,
  ) ?? availableModels[0] ?? MODELS[0];

  const handleModelSelect = async (model: ModelInfo) => {
    if (!profile) return;
    setShowModelPicker(false);
    await updateProfile({
      preferences: {
        ...profile.preferences,
        coachModel: model.model,
        coachProvider: model.provider,
      },
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={showModelPicker}
        aria-haspopup="menu"
        onClick={() => setShowModelPicker((open) => !open)}
        disabled={!profile || isSaving}
        title="Choose the coaching model for this profile"
      >
        <Icon name="settings" size={14} />
        <span>{selectedModel.name}</span>
        <Badge tone={selectedModel.provider === 'openai' ? 'warmth' : 'signal'}>
          {selectedModel.provider === 'local' ? 'offline' : selectedModel.provider}
        </Badge>
      </Button>
      {showModelPicker && (
        <div role="menu" aria-label="Choose coaching model" className="absolute right-0 z-50 mt-2 max-h-96 w-72 overflow-y-auto rounded-lg border border-edgesoft bg-panel p-2 shadow-xl">
          <p className="px-2 py-1 text-xs text-slate-500">Choices enabled by this backend</p>
          {availableModels.map((model) => (
            <button
              key={`${model.provider}:${model.model}`}
              type="button"
              role="menuitemradio"
              aria-checked={selectedModel.model === model.model && selectedModel.provider === model.provider}
              disabled={isSaving}
              onClick={() => void handleModelSelect(model)}
              className="hw-focus block w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-panelsoft disabled:opacity-50"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-slate-100">
                {model.name}
                {selectedModel.model === model.model && selectedModel.provider === model.provider && <Icon name="check" size={14} />}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{model.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}