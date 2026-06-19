import { clipboard } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
let isCapturing = false;

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

    // Send Ctrl+C
    await sendCtrlC();

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

async function sendCtrlC(): Promise<void> {
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
