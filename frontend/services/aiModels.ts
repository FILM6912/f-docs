import type { AiProvider } from '../hooks/useAiSettings';

export interface AiModel { id: string; name: string }

export async function listAiModels(provider: AiProvider, apiKey: string, baseUrl: string, signal: AbortSignal): Promise<AiModel[]> {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const endpoint = provider === 'gemini'
    ? 'https://generativelanguage.googleapis.com/v1beta/models'
    : provider === 'openai'
      ? `${(base || 'https://api.openai.com/v1').replace(/\/chat\/completions$/, '')}/models`
      : `${(base || 'https://api.anthropic.com').replace(/\/v1(?:\/messages)?$/, '')}/v1/models`;
  const headers: Record<string, string> = provider === 'gemini'
    ? { 'x-goog-api-key': apiKey }
    : provider === 'anthropic'
      ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
      : apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const models = new Map<string, AiModel>();
  let cursor = '';
  const seen = new Set<string>();
  do {
    const url = new URL(endpoint);
    if (cursor) url.searchParams.set(provider === 'gemini' ? 'pageToken' : 'after_id', cursor);
    const response = await fetch(url, { headers, signal });
    if (!response.ok) throw new Error(`Unable to load models (HTTP ${response.status}). Check API key and Base URL.`);
    const data = await response.json();
    const rows = provider === 'gemini' ? data.models : data.data;
    if (!Array.isArray(rows)) throw new Error('The API returned an invalid model list.');
    for (const row of rows) {
      if (provider === 'gemini' && !row.supportedGenerationMethods?.includes('generateContent')) continue;
      const id = provider === 'gemini' ? row.name?.replace(/^models\//, '') : row.id;
      if (typeof id === 'string' && id) models.set(id, { id, name: row.displayName || row.display_name || id });
    }
    cursor = provider === 'gemini' ? data.nextPageToken : provider === 'anthropic' && data.has_more ? data.last_id : '';
    if (cursor && seen.has(cursor)) throw new Error('The API repeated a model page. Please retry.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
}
