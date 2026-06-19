import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { IPC } from '../../shared/ipc-channels';
import { POPUP_WIDTH, POPUP_MIN_HEIGHT, POPUP_MAX_HEIGHT } from '../../shared/constants';

let popupWindow: BrowserWindow | null = null;

export function createPopupWindow(): BrowserWindow {
  if (popupWindow && !popupWindow.isDestroyed()) {
    return popupWindow;
  }

  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_MIN_HEIGHT,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minWidth: 320,
    minHeight: 80,
    movable: true,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWindow.setAlwaysOnTop(true, 'screen-saver');

  // Prevent the popup from being destroyed on close - hide instead
  popupWindow.on('close', (e) => {
    if (!popupWindow) return;
    e.preventDefault();
    popupWindow.hide();
  });

  popupWindow.on('blur', () => {
    console.log('[popup] Window blurred');
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    popupWindow.loadURL(`${devUrl}#popup`);
  } else {
    popupWindow.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: 'popup' });
  }

  popupWindow.webContents.on('did-finish-load', () => {
    console.log('[popup] Page loaded');
  });

  popupWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[popup] Load FAILED: ${code} ${desc}`);
  });

  return popupWindow;
}

export function showPopupAtCursor(text: string, groupId: string): void {
  const win = createPopupWindow();
  if (!win || win.isDestroyed()) return;

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x: workX, y: workY, width: workW, height: workH } = display.workArea;

  let x = cursorPoint.x + 10;
  let y = cursorPoint.y + 20;
  if (x + POPUP_WIDTH > workX + workW) x = cursorPoint.x - POPUP_WIDTH - 10;
  if (y + POPUP_MAX_HEIGHT > workY + workH) y = cursorPoint.y - POPUP_MAX_HEIGHT - 10;
  x = Math.max(workX, Math.min(x, workX + workW - POPUP_WIDTH));
  y = Math.max(workY, Math.min(y, workY + workH - POPUP_MIN_HEIGHT));

  win.setSize(POPUP_WIDTH, POPUP_MIN_HEIGHT, false);
  win.setPosition(Math.round(x), Math.round(y));

  console.log('[popup] Showing at', Math.round(x), Math.round(y));
  win.show();

  // Send text to renderer after page is ready
  const sendText = () => {
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.POPUP_SHOW_TEXT, { text, groupId });
      console.log(`[popup] Sent text to renderer (group: ${groupId}, ${text.length} chars)`);
    }
  };

  // Use did-finish-load for first show, setTimeout for subsequent shows
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', () => setTimeout(sendText, 50));
  } else {
    setTimeout(sendText, 50);
  }
}

export function hidePopup(): void {
  if (!popupWindow || popupWindow.isDestroyed()) return;
  console.log('[popup] Hiding');
  popupWindow.hide();
}

export function getPopupWindow(): BrowserWindow | null {
  return popupWindow;
}

export function isPopupVisible(): boolean {
  return popupWindow !== null && !popupWindow.isDestroyed() && popupWindow.isVisible();
}

export function togglePopup(): boolean {
  if (isPopupVisible()) {
    hidePopup();
    return false;
  }
  return true;
}
