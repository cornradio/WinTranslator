import { app, clipboard, shell } from 'electron';
import { createTray, destroyTray } from './tray';
import { registerAllHotkeys, unregisterAllHotkeys, setGroupHandler, setSettingsHandler } from './hotkeys';
import { captureSelectedText } from './clipboard';
import { createPopupWindow, showPopupAtCursor, showPopupForHistory, togglePopup, isPopupVisible } from './windows/popup-window';
import { createSettingsWindow } from './windows/settings-window';
import { registerIpcHandlers } from './ipc-handlers';
import { getSetting } from './store';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

async function handleGroupAction(groupId: string): Promise<void> {
  console.log(`[action] Group ${groupId} triggered, popup visible: ${isPopupVisible()}`);

  // Toggle: if popup is already visible, hide it
  if (!togglePopup()) {
    console.log('[action] Popup was visible → hidden');
    return;
  }

  // Capture text FIRST (popup not shown yet, focus stays on user's app)
  let text = await captureSelectedText();

  // Fallback to clipboard
  if (!text || !text.trim()) {
    text = clipboard.readText();
    console.log(`[action] Clipboard fallback: "${text.slice(0, 80)}" (${text.length} chars)`);
  } else {
    console.log(`[action] Captured: "${text.slice(0, 80)}" (${text.length} chars)`);
  }

  if (!text || !text.trim()) {
    console.log('[action] No text available');
    return;
  }

  showPopupAtCursor(text, groupId);
}

app.whenReady().then(() => {
  console.log('[WinTranslator] App ready');

  // Hide dock icon on macOS — this is a tray-only utility app
  if (process.platform === 'darwin') {
    app.dock?.hide();
  }

  registerIpcHandlers();

  const popup = createPopupWindow();
  popup.webContents.on('did-finish-load', () => console.log('[popup] Initial page loaded'));
  popup.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[popup] Load FAILED: ${code} ${desc}`);
  });

  // Single handler: receives groupId, looks up prompts from settings
  setGroupHandler((groupId) => handleGroupAction(groupId));
  setSettingsHandler(() => createSettingsWindow());
  registerAllHotkeys();

  createTray(
    (groupId) => handleGroupAction(groupId),
    () => createSettingsWindow(),
    () => showPopupForHistory(),
  );

  // First-run: open settings + README so user knows how to set up
  if (!getSetting('hasCompletedSetup')) {
    console.log('[WinTranslator] First run — opening settings + README');
    createSettingsWindow();
    shell.openExternal('https://github.com/cornradio/WinTranslator');
  }

  console.log('[WinTranslator] Initialized');
});

app.on('second-instance', () => createSettingsWindow());
app.on('will-quit', () => { unregisterAllHotkeys(); destroyTray(); });
