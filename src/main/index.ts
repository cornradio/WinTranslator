import { app, clipboard, shell } from 'electron';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { createTray, destroyTray } from './tray';
import { registerAllHotkeys, unregisterAllHotkeys, setGroupHandler } from './hotkeys';
import { captureSelectedText } from './clipboard';
import { createPopupWindow, showPopupAtCursor, showPopupForHistory, hidePopup, isPopupVisible, getPopupWindow } from './windows/popup-window';
import { createSettingsWindow } from './windows/settings-window';
import { registerIpcHandlers } from './ipc-handlers';
import { activateCachedApp } from './clipboard';
import { IPC } from '../shared/ipc-channels';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

async function handleGroupAction(groupId: string): Promise<void> {
  const wasVisible = isPopupVisible();
  console.log(`[action] Group ${groupId} triggered, popup visible: ${wasVisible}`);

  let text = '';

  if (wasVisible && process.platform === 'darwin') {
    // macOS: activate the cached frontmost app via osascript.
    // The popup stays visible — no hide/show flicker.
    // After activation, the user's app has focus, so Cmd+C targets it.
    const activated = await activateCachedApp();
    if (activated) {
      text = await captureSelectedText();
    } else {
      // Fallback: hide popup to return focus, then capture
      hidePopup();
      text = await captureSelectedText();
    }
  } else {
    // Windows/Linux (or first show): hide popup if visible to return focus
    if (wasVisible) {
      hidePopup();
      console.log('[action] Popup was visible → hidden for fresh capture');
    }
    text = await captureSelectedText();
  }

  // Fallback to clipboard
  if (!text || !text.trim()) {
    text = clipboard.readText();
    console.log(`[action] Clipboard fallback: "${text.slice(0, 80)}" (${text.length} chars)`);
  } else {
    console.log(`[action] Captured: "${text.slice(0, 80)}" (${text.length} chars)`);
  }

  if (!text || !text.trim()) {
    console.log('[action] No text available');
    // On macOS activation path, popup is still visible — keep it as is
    return;
  }

  if (wasVisible && process.platform === 'darwin') {
    // Update popup in place — no repositioning, just send new text
    const win = getPopupWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.POPUP_SHOW_TEXT, { text, groupId });
      console.log(`[action] Updated popup in place (group: ${groupId}, ${text.length} chars)`);
    }
  } else {
    showPopupAtCursor(text, groupId);
  }
}

app.whenReady().then(() => {
  console.log('[WinTranslator] App ready');

  // Hide dock icon on macOS — this is a tray-only utility app
  if (process.platform === 'darwin') {
    app.dock?.hide();
    // Disable macOS window state restoration so auto-launch stays tray-only.
    // Without this, macOS may restore Settings/popup windows that were open at last quit.
    try {
      execSync('defaults write com.wintranslator.app NSQuitAlwaysKeepsWindows -bool false', { stdio: 'ignore' });
    } catch { /* ignore if defaults fails */ }
  }

  registerIpcHandlers();

  const popup = createPopupWindow();
  // Explicitly hide popup on startup — prevents any window from briefly
  // flashing during auto-launch (the "strange popup" issue).
  popup.hide();
  popup.webContents.on('did-finish-load', () => console.log('[popup] Initial page loaded'));
  popup.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[popup] Load FAILED: ${code} ${desc}`);
  });

  // Single handler: receives groupId, looks up prompts from settings
  setGroupHandler((groupId) => handleGroupAction(groupId));
  registerAllHotkeys();

  createTray(
    (groupId) => handleGroupAction(groupId),
    () => createSettingsWindow(),
    () => showPopupForHistory(),
  );

  // First-run: open settings + README so user knows how to set up.
  // Uses a marker file for detection — persists across dev runs (unlike config store
  // which only sets hasCompletedSetup after API key entry).
  const markerPath = app.isPackaged
    ? path.join(app.getPath('userData'), '.setup-done')
    : path.join(__dirname, '../../.setup-done');
  if (!fs.existsSync(markerPath)) {
    console.log('[WinTranslator] First run — opening settings + README');
    createSettingsWindow();
    shell.openExternal('https://github.com/cornradio/WinTranslator');
    fs.writeFileSync(markerPath, '', 'utf-8');
  }

  console.log('[WinTranslator] Initialized');
});

app.on('second-instance', () => createSettingsWindow());
app.on('will-quit', () => { unregisterAllHotkeys(); destroyTray(); });
