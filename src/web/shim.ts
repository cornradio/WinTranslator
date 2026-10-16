import type { AppSettings, TranslationEntry } from '../shared/types';
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  exportConfig,
  exportFunctions,
  getHistory,
  getSettings,
  importConfig,
  importFunctions,
  setSetting,
  subscribeHistory,
  subscribeSettings,
  toggleHistoryStar,
} from './store';

type SettingsCallback = (data: Partial<AppSettings>) => void;
type HistoryCallback = (entries: TranslationEntry[]) => void;
type ShowHistoryCallback = () => void;

const settingsCallbacks = new Set<SettingsCallback>();
const historyCallbacks = new Set<HistoryCallback>();
const showHistoryCallbacks = new Set<ShowHistoryCallback>();

let closeSettings = () => {};

export function setSettingsCloseHandler(handler: () => void): void {
  closeSettings = handler;
}

export function installWebShim(): void {
  subscribeSettings((settings) => {
    settingsCallbacks.forEach((cb) => cb(settings));
  });
  subscribeHistory((entries) => {
    historyCallbacks.forEach((cb) => cb(entries));
  });

  window.electronAPI = {
    config: {
      getAll: async () => getSettings(),
      get: async (key: string) => (getSettings() as unknown as Record<string, unknown>)[key],
      set: async (key: string, value: unknown) => {
        setSetting(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      },
      exportFunctions: async () => exportFunctions(),
      importFunctions: async (json: string) => {
        importFunctions(json);
      },
      exportConfig: async () => exportConfig(),
      importConfig: async (json: string) => {
        importConfig(json);
      },
    },
    popup: {
      resize: async () => {},
      hide: async () => {},
      startDrag: async () => {},
      openUrl: async (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      setVibrancy: async () => {},
      onShowText: () => () => {},
      onShowHistory: () => () => {},
      onDismissTimer: () => () => {},
    },
    history: {
      getAll: async () => getHistory(),
      add: async (entry: TranslationEntry) => {
        addHistoryEntry(entry);
      },
      delete: async (id: string) => {
        deleteHistoryEntry(id);
      },
      toggleStar: async (id: string) => {
        toggleHistoryStar(id);
      },
      clear: async () => {
        clearHistory();
      },
      onUpdated: (callback: HistoryCallback) => {
        historyCallbacks.add(callback);
        return () => historyCallbacks.delete(callback);
      },
    },
    settings: {
      close: async () => {
        closeSettings();
      },
      onUpdated: (callback: SettingsCallback) => {
        settingsCallbacks.add(callback);
        return () => settingsCallbacks.delete(callback);
      },
      onShowHistory: (callback: ShowHistoryCallback) => {
        showHistoryCallbacks.add(callback);
        return () => showHistoryCallbacks.delete(callback);
      },
    },
    app: {
      restart: async () => {
        window.location.reload();
      },
    },
  };
}
