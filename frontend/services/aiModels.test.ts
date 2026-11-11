import { afterEach, expect, it, vi } from 'vitest';
import { listAiModels } from './aiModels';

afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;

it('lists custom OpenAI models using the normalized URL and credentials', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ data: [{ id: 'custom-b' }, { id: 'custom-a' }, { id: 'custom-a' }] }));
  vi.stubGlobal('fetch', fetch);
  expect((await listAiModels('openai', 'test-key', 'https://example.test/v1/chat/completions/', signal())).map(m => m.id)).toEqual(['custom-a', 'custom-b']);
  expect(String(fetch.mock.calls[0][0])).toBe('https://example.test/v1/models');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-key');
});

it('follows Gemini pages and excludes non-generation models', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ models: [{ name: 'models/embed', supportedGenerationMethods: ['embedContent'] }], nextPageToken: 'next' }))
    .mockResolvedValueOnce(Response.json({ models: [{ name: 'models/generate', displayName: 'Generate', supportedGenerationMethods: ['generateContent'] }] }));
  vi.stubGlobal('fetch', fetch);
  expect(await listAiModels('gemini', 'test', '', signal())).toEqual([{ id: 'generate', name: 'Generate' }]);
  expect(String(fetch.mock.calls[1][0])).toContain('pageToken=next');
});

it('follows Anthropic pagination without duplicating /v1', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ data: [{ id: 'a' }], has_more: true, last_id: 'a' }))
    .mockResolvedValueOnce(Response.json({ data: [{ id: 'b' }], has_more: false }));
  vi.stubGlobal('fetch', fetch);
  expect(await listAiModels('anthropic', 'test', 'https://example.test/v1', signal())).toHaveLength(2);
  expect(String(fetch.mock.calls[1][0])).toBe('https://example.test/v1/models?after_id=a');
});

it('reports HTTP failures without exposing the response or API key', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret', { status: 401 })));
  await expect(listAiModels('openai', 'secret', '', signal())).rejects.toThrow('HTTP 401');
});

it('rejects malformed responses instead of treating them as an empty list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'bad response' })));
  await expect(listAiModels('openai', '', 'https://example.test/v1', signal())).rejects.toThrow('invalid model list');
});
