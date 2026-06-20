export type Provider = 'anthropic' | 'openai';

export interface PromptTemplate {
  id: string;           // crypto.randomUUID()
  name: string;         // "Translate", "Concise", "Polished"
  prompt: string;       // prompt text, {text} = selected text placeholder
}

export interface FunctionGroup {
  id: string;           // crypto.randomUUID()
  name: string;         // group display name: "Translate", "Refine"
  icon: string;         // emoji
  hotkey: string;       // "Alt+T" or "" for none
  showInMenu: boolean;  // tray right-click menu
  prompts: PromptTemplate[];
}

export interface TranslationEntry {
  id: string;
  timestamp: number;
  sourceText: string;
  resultText: string;
  groupName?: string;
  groupIcon?: string;
  promptName?: string;
}

export interface FunctionResult {
  promptId: string;
  promptName: string;
  text: string;
  isStreaming: boolean;
  isError: boolean;
}

export interface AISettings {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  thinking: boolean;
}

export type Theme = 'dark' | 'monokai' | 'paper' | 'light';

export interface AppearanceSettings {
  theme: Theme;
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  blurEnabled: boolean;
}

export interface PopupSettings {
  autoDismissSeconds: number;
  maxHeightPercent: number;
}

export interface AppSettings {
  ai: AISettings;
  functions: FunctionGroup[];
  popup: PopupSettings;
  appearance: AppearanceSettings;
  autoStart: boolean;
}

export interface ElectronAPI {
  config: {
    getAll(): Promise<AppSettings>;
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    exportFunctions(): Promise<string>;   // returns JSON string
    importFunctions(json: string): Promise<void>;
  };
  popup: {
    resize(height: number): Promise<void>;
    hide(): Promise<void>;
    startDrag(): Promise<void>;
    openUrl(url: string): Promise<void>;
    setVibrancy(enabled: boolean): Promise<void>;
    onShowText(callback: (data: { text: string; groupId: string }) => void): () => void;
    onShowHistory(callback: () => void): () => void;
    onDismissTimer(callback: (data: { ms: number }) => void): () => void;
  };
  history: {
    getAll(): Promise<TranslationEntry[]>;
    add(entry: TranslationEntry): Promise<void>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    onUpdated(callback: (entries: TranslationEntry[]) => void): () => void;
  };
  settings: {
    close(): Promise<void>;
    onUpdated(callback: (data: Partial<AppSettings>) => void): () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
