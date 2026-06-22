import { globalShortcut } from 'electron';
import { getSettings } from './store';

type GroupHandler = (groupId: string) => void;

let handler: GroupHandler | null = null;

export function setGroupHandler(h: GroupHandler): void {
  handler = h;
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
}

export function unregisterAllHotkeys(): void {
  globalShortcut.unregisterAll();
}
