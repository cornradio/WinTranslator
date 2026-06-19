import { ipcMain, shell } from 'electron';
import { IPC } from '../shared/ipc-channels';
import {
  getSettings,
  setSettings,
  getHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  exportFunctions,
  importFunctions,
} from './store';
import { hidePopup, getPopupWindow } from './windows/popup-window';
import { getSettingsWindow } from './windows/settings-window';
import { registerAllHotkeys } from './hotkeys';
import { rebuildTrayMenu } from './tray';
import type { AppSettings, TranslationEntry } from '../shared/types';

export function registerIpcHandlers(): void {
  // Config
  ipcMain.handle(IPC.CONFIG_GET_ALL, () => getSettings());

  ipcMain.handle(IPC.CONFIG_GET, (_event, key: string) => {
    const settings = getSettings();
    return (settings as unknown as Record<string, unknown>)[key];
  });

  ipcMain.handle(IPC.CONFIG_SET, (_event, key: string, value: unknown) => {
    const updated = setSettings({ [key]: value } as Partial<AppSettings>);
    // Refresh hotkeys and tray menu when functions change
    if (key === 'functions') {
      registerAllHotkeys();
      rebuildTrayMenu();
    }
    notifySettingsUpdated(updated);
  });

  ipcMain.handle(IPC.CONFIG_EXPORT_FUNCTIONS, () => exportFunctions());

  ipcMain.handle(IPC.CONFIG_IMPORT_FUNCTIONS, (_event, json: string) => {
    importFunctions(json);
    registerAllHotkeys();
    rebuildTrayMenu();
    notifySettingsUpdated(getSettings());
  });

  // Popup
  ipcMain.handle(IPC.POPUP_HIDE, () => hidePopup());
  ipcMain.handle(IPC.POPUP_START_DRAG, () => {});

  ipcMain.handle(IPC.POPUP_RESIZE, (_event, height: number) => {
    const win = getPopupWindow();
    if (win && !win.isDestroyed()) {
      const newHeight = Math.min(Math.max(height, 120), 500);
      win.setSize(480, newHeight, false);
    }
  });

  ipcMain.handle(IPC.OPEN_URL, (_event, url: string) => {
    shell.openExternal(url);
  });

  // Settings window
  ipcMain.handle(IPC.SETTINGS_CLOSE, () => {
    const win = getSettingsWindow();
    if (win) win.close();
  });

  // History
  ipcMain.handle(IPC.HISTORY_GET, () => getHistory());
  ipcMain.handle(IPC.HISTORY_ADD, (_event, entry: TranslationEntry) => {
    notifyHistoryUpdated(addHistoryEntry(entry));
  });
  ipcMain.handle(IPC.HISTORY_DELETE, (_event, id: string) => {
    notifyHistoryUpdated(deleteHistoryEntry(id));
  });
  ipcMain.handle(IPC.HISTORY_CLEAR, () => {
    clearHistory();
    notifyHistoryUpdated([]);
  });

  console.log('[IPC] All handlers registered');
}

function notifySettingsUpdated(settings: AppSettings): void {
  const popup = getPopupWindow();
  const settingsWin = getSettingsWindow();
  if (popup && !popup.isDestroyed()) popup.webContents.send(IPC.SETTINGS_UPDATED, settings);
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send(IPC.SETTINGS_UPDATED, settings);
}

function notifyHistoryUpdated(entries: TranslationEntry[]): void {
  const popup = getPopupWindow();
  if (popup && !popup.isDestroyed()) popup.webContents.send(IPC.HISTORY_UPDATED, entries);
  const settingsWin = getSettingsWindow();
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send(IPC.HISTORY_UPDATED, entries);
}
