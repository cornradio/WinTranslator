import { BrowserWindow, nativeImage } from 'electron';
import path from 'path';

let settingsWindow: BrowserWindow | null = null;

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  const iconPath = path.join(__dirname, '../../resources/icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 660,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#1c1c1e',
    title: 'WinTranslator Settings',
    icon,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show();
  });

  // Single entry point with hash routing
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    settingsWindow.loadURL(`${devUrl}#settings`);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: 'settings' });
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}
