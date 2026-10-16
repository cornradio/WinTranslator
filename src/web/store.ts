import type { AppSettings, TranslationEntry } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

const STORAGE_KEY = 'wintranslator-web-v1';

interface StoreData {
  settings: AppSettings;
  history: TranslationEntry[];
  selectedFunctionId?: string;
}

type SettingsListener = (settings: AppSettings) => void;
type HistoryListener = (entries: TranslationEntry[]) => void;

const settingsListeners = new Set<SettingsListener>();
const historyListeners = new Set<HistoryListener>();

let cache: StoreData | null = null;

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function load(): StoreData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw) as StoreData;
    cache = {
      settings: deepMerge(
        DEFAULT_SETTINGS as unknown as Record<string, unknown>,
        (parsed.settings || {}) as unknown as Record<string, unknown>
      ) as unknown as AppSettings,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      selectedFunctionId: parsed.selectedFunctionId,
    };
  } catch {
    cache = { settings: structuredClone(DEFAULT_SETTINGS), history: [] };
    persist();
  }
  return cache;
}

function persist(): void {
  if (!cache) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

function emitSettings(): void {
  const settings = getSettings();
  settingsListeners.forEach((cb) => cb(settings));
}

function emitHistory(): void {
  const history = getHistory();
  historyListeners.forEach((cb) => cb(history));
}

export function getSettings(): AppSettings {
  return structuredClone(load().settings);
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): AppSettings {
  const data = load();
  data.settings = deepMerge(
    data.settings as unknown as Record<string, unknown>,
    { [key]: value } as unknown as Record<string, unknown>
  ) as unknown as AppSettings;
  if (key === 'ai' && (value as AppSettings['ai'])?.apiKey) {
    data.settings.hasCompletedSetup = true;
  }
  persist();
  emitSettings();
  return getSettings();
}

export function resetSettings(): AppSettings {
  const data = load();
  data.settings = structuredClone(DEFAULT_SETTINGS);
  persist();
  emitSettings();
  return getSettings();
}

export function subscribeSettings(cb: SettingsListener): () => void {
  settingsListeners.add(cb);
  return () => settingsListeners.delete(cb);
}

export function getHistory(): TranslationEntry[] {
  return load().history.map((entry) => ({ ...entry }));
}

export function addHistoryEntry(entry: TranslationEntry): TranslationEntry[] {
  const data = load();
  const next: TranslationEntry = { ...entry };
  data.history.unshift(next);
  persist();
  emitHistory();
  return getHistory();
}

export function deleteHistoryEntry(id: string): TranslationEntry[] {
  const data = load();
  data.history = data.history.filter((entry) => entry.id !== id);
  persist();
  emitHistory();
  return getHistory();
}

export function deleteHistoryEntries(ids: string[]): TranslationEntry[] {
  const drop = new Set(ids);
  const data = load();
  data.history = data.history.filter((entry) => !drop.has(entry.id));
  persist();
  emitHistory();
  return getHistory();
}

export function toggleHistoryStar(id: string): TranslationEntry[] {
  const data = load();
  const entry = data.history.find((item) => item.id === id);
  if (entry) entry.starred = !entry.starred;
  persist();
  emitHistory();
  return getHistory();
}

export function setHistoryStars(ids: string[], starred: boolean): TranslationEntry[] {
  const wanted = new Set(ids);
  const data = load();
  for (const entry of data.history) {
    if (wanted.has(entry.id)) entry.starred = starred;
  }
  persist();
  emitHistory();
  return getHistory();
}

export function clearHistory(): TranslationEntry[] {
  const data = load();
  data.history = [];
  persist();
  emitHistory();
  return getHistory();
}

export function subscribeHistory(cb: HistoryListener): () => void {
  historyListeners.add(cb);
  return () => historyListeners.delete(cb);
}

export function exportFunctions(): string {
  return JSON.stringify(getSettings().functions, null, 2);
}

export function importFunctions(json: string): void {
  const functions = JSON.parse(json);
  if (!Array.isArray(functions)) throw new Error('Invalid format: expected array');
  const data = load();
  data.settings.functions = functions;
  persist();
  emitSettings();
}

export interface PortableConfig {
  version: 1;
  exportedAt: string;
  ai: AppSettings['ai'];
  functions: AppSettings['functions'];
}

export function exportConfig(): string {
  const settings = getSettings();
  const payload: PortableConfig = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ai: settings.ai,
    functions: settings.functions,
  };
  return JSON.stringify(payload, null, 2);
}

export function importConfig(json: string): void {
  const parsed = JSON.parse(json) as Partial<PortableConfig> & { functions?: unknown; ai?: unknown };
  if (Array.isArray(parsed)) {
    importFunctions(json);
    return;
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid format: expected config object');
  }
  const data = load();
  if (parsed.ai && typeof parsed.ai === 'object') {
    data.settings.ai = deepMerge(
      data.settings.ai as unknown as Record<string, unknown>,
      parsed.ai as unknown as Record<string, unknown>
    ) as unknown as AppSettings['ai'];
    if (data.settings.ai.apiKey) data.settings.hasCompletedSetup = true;
  }
  if (Array.isArray(parsed.functions)) {
    data.settings.functions = parsed.functions as AppSettings['functions'];
  }
  if (!parsed.ai && !parsed.functions) {
    throw new Error('Invalid format: missing ai and functions');
  }
  persist();
  emitSettings();
}

export function getSelectedFunctionId(): string | undefined {
  return load().selectedFunctionId;
}

export function setSelectedFunctionId(id: string): void {
  const data = load();
  data.selectedFunctionId = id;
  persist();
}
