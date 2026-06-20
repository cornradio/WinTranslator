import { globalShortcut } from 'electron';
import { getSettings } from './store';

type GroupHandler = (groupId: string) => void;
type SettingsHandler = () => void;

let handler: GroupHandler | null = null;
let settingsHandler: SettingsHandler | null = null;

export function setGroupHandler(h: GroupHandler): void {
  handler = h;
}

export function setSettingsHandler(h: SettingsHandler): void {
  settingsHandler = h;
}

export function registerAllHotkeys(): void {
  globalShortcut.unregisterAll();

  const settings = getSettings();

  for (const group of settings.functions) {
    if (!group.hotkey) continue;

    try {
      const ok = globalShortcut.register(group.hotkey, () => {
        console.log(`[hotkey] ${group.hotkey} → ${group.name}`);
        handler?.(group.id);
      });
      console.log(`[hotkey] ${group.hotkey} registered: ${ok} → ${group.name}`);
    } catch (err) {
      console.error(`[hotkey] Failed to register ${group.hotkey}:`, err);
    }
  }

  // Register settings shortcut: Cmd+, on macOS, Ctrl+, elsewhere
  const settingsAccelerator = process.platform === 'darwin' ? 'Command+,' : 'Ctrl+,';
  try {
    const ok = globalShortcut.register(settingsAccelerator, () => {
      console.log(`[hotkey] ${settingsAccelerator} → Settings`);
      settingsHandler?.();
    });
    console.log(`[hotkey] ${settingsAccelerator} registered: ${ok} → Settings`);
  } catch (err) {
    console.error(`[hotkey] Failed to register ${settingsAccelerator}:`, err);
  }
}

export function unregisterAllHotkeys(): void {
  globalShortcut.unregisterAll();
}
