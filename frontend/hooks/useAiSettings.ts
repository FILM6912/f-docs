import { useState, useEffect, useCallback } from 'react';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export interface AiSettings {
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  anthropicModel: string;
  anthropicBaseUrl: string;
}

const STORAGE_KEY = 'ai-settings';

const defaultSettings: AiSettings = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  openaiBaseUrl: 'https://api.openai.com/v1',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-sonnet-latest',
  anthropicBaseUrl: 'https://api.anthropic.com',
};

export const useAiSettings = () => {
  const [settings, setSettings] = useState<AiSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      }
    } catch {
      // ignore
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AiSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const getEffectiveConfig = useCallback(() => {
    switch (settings.provider) {
      case 'openai':
        return {
          provider: 'openai' as const,
          apiKey: settings.openaiApiKey,
          model: settings.openaiModel,
          baseUrl: settings.openaiBaseUrl,
        };
      case 'anthropic':
        return {
          provider: 'anthropic' as const,
          apiKey: settings.anthropicApiKey,
          model: settings.anthropicModel,
          baseUrl: settings.anthropicBaseUrl,
        };
      case 'gemini':
      default:
        return {
          provider: 'gemini' as const,
          apiKey: settings.geminiApiKey,
          model: settings.geminiModel,
        };
    }
  }, [settings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    getEffectiveConfig,
  };
};

export const getAiSettings = (): AiSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultSettings, ...parsed };
    }
  } catch {
    // ignore
  }
  return defaultSettings;
};
