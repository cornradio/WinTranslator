import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { ElectronAPI, AppSettings, TranslationEntry } from '../shared/types';

const electronAPI: ElectronAPI = {
  config: {
    getAll: () => ipcRenderer.invoke(IPC.CONFIG_GET_ALL),
    get: (key: string) => ipcRenderer.invoke(IPC.CONFIG_GET, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC.CONFIG_SET, key, value),
    exportFunctions: () => ipcRenderer.invoke(IPC.CONFIG_EXPORT_FUNCTIONS),
    importFunctions: (json: string) => ipcRenderer.invoke(IPC.CONFIG_IMPORT_FUNCTIONS, json),
  },
  popup: {
    resize: (height: number) => ipcRenderer.invoke(IPC.POPUP_RESIZE, height),
    hide: () => ipcRenderer.invoke(IPC.POPUP_HIDE),
    startDrag: () => ipcRenderer.invoke(IPC.POPUP_START_DRAG),
    onShowText: (callback: (data: { text: string; groupId: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { text: string; groupId: string }) => callback(data);
      ipcRenderer.on(IPC.POPUP_SHOW_TEXT, handler);
      return () => ipcRenderer.removeListener(IPC.POPUP_SHOW_TEXT, handler);
    },
    onDismissTimer: (callback: (data: { ms: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { ms: number }) => callback(data);
      ipcRenderer.on(IPC.POPUP_DISMISS_TIMER, handler);
      return () => ipcRenderer.removeListener(IPC.POPUP_DISMISS_TIMER, handler);
    },
  },
  history: {
    getAll: () => ipcRenderer.invoke(IPC.HISTORY_GET),
    add: (entry: TranslationEntry) => ipcRenderer.invoke(IPC.HISTORY_ADD, entry),
    delete: (id: string) => ipcRenderer.invoke(IPC.HISTORY_DELETE, id),
    clear: () => ipcRenderer.invoke(IPC.HISTORY_CLEAR),
    onUpdated: (callback: (entries: TranslationEntry[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, entries: TranslationEntry[]) => callback(entries);
      ipcRenderer.on(IPC.HISTORY_UPDATED, handler);
      return () => ipcRenderer.removeListener(IPC.HISTORY_UPDATED, handler);
    },
  },
  settings: {
    close: () => ipcRenderer.invoke(IPC.SETTINGS_CLOSE),
    onUpdated: (callback: (data: Partial<AppSettings>) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: Partial<AppSettings>) => callback(data);
      ipcRenderer.on(IPC.SETTINGS_UPDATED, handler);
      return () => ipcRenderer.removeListener(IPC.SETTINGS_UPDATED, handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
