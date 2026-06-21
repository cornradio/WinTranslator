import type { AppSettings } from './types';

export const APP_VERSION = '1.2.7';
export const GITHUB_RELEASES_URL = 'https://github.com/cornradio/WinTranslator/releases';
export const GITHUB_API_LATEST_RELEASE = 'https://api.github.com/repos/cornradio/WinTranslator/releases/latest';

export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    baseUrl: 'https://api.anthropic.com',
    maxTokens: 4096,
    thinking: false,
  },
  functions: [
    {
      id: 'default-translate',
      name: 'Translate',
      icon: '\u{1F310}',
      hotkey: 'Alt+T',
      showInMenu: true,
      prompts: [
        {
          id: 'default-translate-prompt',
          name: 'Translate',
          prompt: 'You are a professional translator. Translate the given text between Chinese and English.\nRules:\n- Auto-detect the source language and translate to the other language.\n- Preserve the original tone, style, and meaning.\n- Use natural, idiomatic expressions in the target language.\n- For technical terms, use commonly accepted translations.\n- Output ONLY the translation, no explanations.\n\n{text}',
        },
      ],
    },
    {
      id: 'default-refine',
      name: 'Refine',
      icon: '\u{2728}',
      hotkey: 'Alt+R',
      showInMenu: true,
      prompts: [
        {
          id: 'default-concise',
          name: 'Concise',
          prompt: 'Rewrite the following text to be more concise and direct. Keep the same meaning but use fewer words. Output only the refined text.\n\n{text}',
        },
        {
          id: 'default-polished',
          name: 'Polished',
          prompt: 'Rewrite the following text to be more polished and professional. Improve grammar, word choice, and sentence structure. Output only the refined text.\n\n{text}',
        },
      ],
    },
  ],
  popup: {
    autoDismissSeconds: 8,
    maxHeightPercent: 30,
  },
  appearance: {
    theme: 'dark',
    opacity: 0.82,
    borderRadius: 14,
    borderWidth: 1,
    blurEnabled: true,
  },
  autoStart: false,
  hasCompletedSetup: false,
};

export const POPUP_WIDTH = 480;
export const POPUP_MIN_HEIGHT = 120;
export const POPUP_MAX_HEIGHT = 500;
export const HISTORY_MAX_ENTRIES = 50;
export const TEXT_MAX_LENGTH = 5000;
