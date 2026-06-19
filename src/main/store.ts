import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { AppSettings, TranslationEntry } from '../shared/types';
import { DEFAULT_SETTINGS, HISTORY_MAX_ENTRIES, TEXT_MAX_LENGTH } from '../shared/constants';

interface StoreData {
  settings: AppSettings;
  history: TranslationEntry[];
}

let storeData: StoreData | null = null;

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadStore(): StoreData {
  if (storeData) return storeData;
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8');
    storeData = JSON.parse(raw);
    // Merge with defaults for any missing keys
    storeData = deepMerge({ settings: DEFAULT_SETTINGS, history: [] }, storeData as unknown as Record<string, unknown>) as unknown as StoreData;
  } catch {
    storeData = { settings: DEFAULT_SETTINGS, history: [] };
    saveStore();
  }
  return storeData;
}

function saveStore(): void {
  if (!storeData) return;
  try {
    const dir = path.dirname(getStorePath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(getStorePath(), JSON.stringify(storeData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

export function getSettings(): AppSettings {
  return loadStore().settings;
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const data = loadStore();
  data.settings = deepMerge(data.settings as unknown as Record<string, unknown>, partial as unknown as Record<string, unknown>) as unknown as AppSettings;
  saveStore();
  return data.settings;
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return loadStore().settings[key];
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  const data = loadStore();
  (data.settings as unknown as Record<string, unknown>)[key] = value;
  saveStore();
}

export function getHistory(): TranslationEntry[] {
  return loadStore().history;
}

export function addHistoryEntry(entry: TranslationEntry): TranslationEntry[] {
  const data = loadStore();
  entry.sourceText = entry.sourceText.slice(0, TEXT_MAX_LENGTH);
  entry.resultText = entry.resultText.slice(0, TEXT_MAX_LENGTH);
  data.history.unshift(entry);
  if (data.history.length > HISTORY_MAX_ENTRIES) {
    data.history.length = HISTORY_MAX_ENTRIES;
  }
  saveStore();
  return data.history;
}

export function deleteHistoryEntry(id: string): TranslationEntry[] {
  const data = loadStore();
  data.history = data.history.filter((e) => e.id !== id);
  saveStore();
  return data.history;
}

export function clearHistory(): void {
  const data = loadStore();
  data.history = [];
  saveStore();
}

export function resetSettings(): AppSettings {
  const data = loadStore();
  data.settings = DEFAULT_SETTINGS;
  saveStore();
  return DEFAULT_SETTINGS;
}

export function exportFunctions(): string {
  return JSON.stringify(getSettings().functions, null, 2);
}

export function importFunctions(json: string): void {
  const functions = JSON.parse(json);
  if (!Array.isArray(functions)) throw new Error('Invalid format: expected array');
  const data = loadStore();
  data.settings.functions = functions;
  saveStore();
}

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
