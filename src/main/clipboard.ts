import { clipboard } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
let isCapturing = false;

// Cached frontmost app (the user's app) — set when popup is first shown,
// used to re-activate it before subsequent captures (avoids hiding the popup).
let cachedFrontmost: { bundleId: string; name: string } | null = null;

export function setCachedFrontmost(app: { bundleId: string; name: string } | null): void {
  cachedFrontmost = app;
}

export function getCachedFrontmost(): { bundleId: string; name: string } | null {
  return cachedFrontmost;
}

/**
 * Get the current frontmost application on macOS.
 * Returns null on other platforms.
 */
export async function getFrontmostApp(): Promise<{ bundleId: string; name: string } | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execFileAsync('osascript', ['-e',
      'tell application "System Events" to get {bundle identifier, name} of first application process whose frontmost is true',
    ], { timeout: 2000 });
    const parts = stdout.trim().split(', ');
    if (parts.length >= 2 && parts[0]) {
      return { bundleId: parts[0], name: parts[1] };
    }
  } catch (err) {
    console.warn('[clipboard] getFrontmostApp failed:', (err as Error).message);
  }
  return null;
}

/**
 * Activate a previously cached app via NSAppleScript.
 * This brings the app to the foreground so that Cmd+C (sent by nut-js)
 * targets the user's app, not our popup window.
 * The popup stays visible — no flicker.
 */
export async function activateCachedApp(): Promise<boolean> {
  if (!cachedFrontmost || process.platform !== 'darwin') return false;
  try {
    // NSAppleScript via osascript — activate by bundle ID
    await execFileAsync('osascript', ['-e',
      `tell application id "${cachedFrontmost.bundleId}" to activate`,
    ], { timeout: 2000 });
    // Brief wait for the app switch to complete
    await sleep(120);
    console.log(`[clipboard] Activated cached app: ${cachedFrontmost.name}`);
    return true;
  } catch (err) {
    console.warn('[clipboard] activateCachedApp failed:', (err as Error).message);
    return false;
  }
}

export async function captureSelectedText(): Promise<string> {
  if (isCapturing) return '';
  isCapturing = true;

  // Brief wait for user to release hotkey modifier
  await sleep(80);

  const savedText = clipboard.readText();
  let selectedText = '';

  try {
    // Clear clipboard to detect change
    clipboard.writeText('');
    await sleep(20);

    // Send the platform copy shortcut
    await sendCopyShortcut();

    // Wait for clipboard to update
    await waitForClipboardChange(600);

    selectedText = clipboard.readText();
    console.log(`[clipboard] Got ${selectedText.length} chars`);
  } catch (err) {
    console.error('[clipboard] Error:', err);
  } finally {
    // Always restore original clipboard
    clipboard.writeText(savedText);
    isCapturing = false;
  }

  return (selectedText && selectedText !== savedText) ? selectedText : '';
}

async function sendCopyShortcut(): Promise<void> {
  if (process.platform === 'darwin') {
    await sendMacCopy();
    return;
  }

  await sendWindowsCopy();
}

async function sendWindowsCopy(): Promise<void> {
  // Primary: VBScript SendKeys via cscript.exe
  // cscript.exe starts in ~20ms vs PowerShell's ~300ms.
  // SendKeys sends Ctrl+C to the foreground window (the user's app).
  try {
    await execFileAsync('cscript.exe', [
      '//nologo', '//E:jscript',
    ], {
      timeout: 1000,
      windowsHide: true,
      input: 'var s = new ActiveXObject("WScript.Shell"); s.SendKeys("^c");',
    } as any);
    console.log('[clipboard] VBScript SendKeys OK');
    return;
  } catch {
    // VBScript might not work on all systems, try PowerShell
  }

  // Fallback: PowerShell SendKeys
  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden',
      '-Command', 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^c")',
    ], { timeout: 2000, windowsHide: true });
    console.log('[clipboard] PowerShell SendKeys OK');
    return;
  } catch (err) {
    console.warn('[clipboard] PowerShell SendKeys failed');
  }

  // Fallback: nut-js
  try {
    const nutjs = await import('@nut-tree-fork/nut-js');
    await nutjs.keyboard.pressKey(nutjs.Key.LeftControl, nutjs.Key.C);
    await sleep(30);
    await nutjs.keyboard.releaseKey(nutjs.Key.LeftControl, nutjs.Key.C);
    console.log('[clipboard] nut-js OK');
  } catch (err) {
    console.error('[clipboard] All methods failed:', (err as Error).message);
  }
}

async function sendMacCopy(): Promise<void> {
  try {
    const nutjs = await import('@nut-tree-fork/nut-js');
    await nutjs.keyboard.pressKey(nutjs.Key.LeftSuper, nutjs.Key.C);
    await sleep(30);
    await nutjs.keyboard.releaseKey(nutjs.Key.LeftSuper, nutjs.Key.C);
    console.log('[clipboard] nut-js Command+C OK');
  } catch (err) {
    console.error('[clipboard] macOS copy failed. Grant Accessibility permission if text capture does not work:', (err as Error).message);
  }
}

async function waitForClipboardChange(timeoutMs: number): Promise<void> {
  const start = Date.now();
  const initial = clipboard.readText();
  while (Date.now() - start < timeoutMs) {
    await sleep(20);
    const current = clipboard.readText();
    if (current !== initial && current !== '') {
      await sleep(20);
      return;
    }
  }
  console.log('[clipboard] Clipboard unchanged after timeout');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
