import React, { useEffect, useState } from 'react';
import type { AiProvider } from '../hooks/useAiSettings';
import { listAiModels, type AiModel } from '../services/aiModels';

interface Props {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
  value: string;
  onChange: (value: string) => void;
}

export function AiModelSelect({ provider, apiKey, baseUrl = '', value, onChange }: Props) {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const needsKey = !apiKey.trim() && !(provider === 'openai' && baseUrl.trim() && !baseUrl.includes('api.openai.com'));

  useEffect(() => {
    const controller = new AbortController();
    setModels([]);
    setError('');
    setLoading(!needsKey);
    if (needsKey) return () => controller.abort();
    // Wait for typing to settle; cancel stale requests when connection settings change.
    let timeout: ReturnType<typeof setTimeout>;
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const result = await listAiModels(provider, apiKey.trim(), baseUrl, controller.signal);
        if (!controller.signal.aborted) setModels(result);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof TypeError
          ? 'Cannot reach the API. Check Base URL, network, and browser access (CORS).'
          : e instanceof Error ? e.message : 'Unable to load models.');
        else if (!disposed) setError('Loading models timed out. Please retry.');
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    }, 500);
    let disposed = false;
    return () => { disposed = true; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [provider, apiKey, baseUrl, needsKey, revision]);

  const listed = models.some(model => model.id === value);
  return <div>
    <div className="flex items-center justify-between mb-1">
      <label htmlFor={`${provider}-model`} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Model</label>
      <button type="button" disabled={loading || needsKey} onClick={() => setRevision(n => n + 1)}
        className="text-xs text-blue-600 dark:text-blue-400 disabled:opacity-40">Refresh models</button>
    </div>
    <select id={`${provider}-model`} value={value} disabled={loading || !models.length}
      onChange={event => onChange(event.target.value)}
      className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-60">
      {!listed && <option value={value}>{loading ? 'Loading models…' : value ? `${value} (saved)` : 'Select a model'}</option>}
      {models.map(model => <option key={model.id} value={model.id}>{model.name === model.id ? model.id : `${model.name} — ${model.id}`}</option>)}
    </select>
    <p role={error ? 'alert' : 'status'} className={`mt-1 text-xs ${error ? 'text-red-500' : 'text-zinc-500'}`}>
      {error || (needsKey ? 'Enter an API key to load available models.' : loading ? 'Fetching models from your API…' : models.length ? `${models.length} models available` : 'No models returned by this API.')}
    </p>
  </div>;
}
