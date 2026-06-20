import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';
import { getSettings } from './store';

let tray: Tray | null = null;
let groupHandler: ((groupId: string) => void) | null = null;
let settingsHandler: (() => void) | null = null;
let historyHandler: (() => void) | null = null;

function getIconPath(): string {
  return path.join(__dirname, '../../resources/icon.png');
}

function formatHotkeyForMenu(hotkey: string): string {
  if (process.platform !== 'darwin') return hotkey;
  return hotkey.split('+').map((part) => (part === 'Alt' ? 'Option' : part)).join('+');
}

export function createTray(
  onGroup: (groupId: string) => void,
  onSettings: () => void,
  onHistory: () => void,
): Tray {
  groupHandler = onGroup;
  settingsHandler = onSettings;
  historyHandler = onHistory;

  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('WinTranslator');

  rebuildTrayMenu();
  return tray;
}

export function rebuildTrayMenu(): void {
  if (!tray) return;

  const settings = getSettings();
  const menuItems: Electron.MenuItemConstructorOptions[] = [
    { label: 'WinTranslator', enabled: false },
    { type: 'separator' },
  ];

  // Dynamic function group entries
  for (const group of settings.functions) {
    if (!group.showInMenu) continue;
    const hotkeyLabel = group.hotkey ? `  (${formatHotkeyForMenu(group.hotkey)})` : '';
    menuItems.push({
      label: `${group.icon} ${group.name}${hotkeyLabel}`,
      click: () => groupHandler?.(group.id),
    });
  }

  const settingsAccelerator = process.platform === 'darwin' ? 'Command+,' : 'Ctrl+,';

  menuItems.push(
    { type: 'separator' },
    { label: 'History', click: () => historyHandler?.() },
    { label: 'Settings...', accelerator: settingsAccelerator, click: () => settingsHandler?.() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
