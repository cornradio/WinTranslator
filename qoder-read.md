# WinTranslator — AI Session Onboarding

## What This Is

WinTranslator is a **tray-only** desktop translation utility (no dock icon, no main window). User selects text in any app, presses a global hotkey, and a floating popup streams LLM translation results. Supports macOS, Windows, Linux.

- **Version:** 1.2.8
- **Bundle ID:** `com.wintranslator.app`
- **Repo:** https://github.com/cornradio/WinTranslator

## Tech Stack

- **Runtime:** Electron 36
- **Frontend:** React 19 + TypeScript 5.7
- **Build:** Vite 6 + vite-plugin-electron
- **Packaging:** electron-builder 25
- **Text capture:** @nut-tree-fork/nut-js (simulates Cmd+C / Ctrl+C)
- **LLM:** Anthropic Messages API or OpenAI-compatible (configurable)

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Vite dev server + Electron (hot reload) |
| `npm run build` | Vite build only (no packaging) |
| `npm run build:mac` | Full macOS build → DMG + ZIP in `release/` |
| `npm run build:win` | Full Windows build → NSIS + portable in `release/` |
| `npm run typecheck` | `tsc --noEmit` (no output = pass) |
| `npm run clean` | Delete `release/`, `dist/`, `dist-electron/` |

## Architecture

```
Main Process (Node.js)          Renderer (Browser)
┌──────────────────────┐        ┌──────────────────────┐
│  index.ts (entry)    │        │  main.tsx (entry)     │
│  hotkeys.ts          │──IPC──▶│  popup/App.tsx        │
│  clipboard.ts        │        │  settings/App.tsx     │
│  tray.ts             │        └──────────────────────┘
│  store.ts            │                 ▲
│  ipc-handlers.ts     │        Preload  │ contextBridge
│  windows/            │────────┘        │
│    popup-window.ts   │                 ▼
│    settings-window.ts│        window.electronAPI
└──────────────────────┘
```

**Two windows, one HTML entry:**
- `index.html` is the single entry point for both windows
- Hash routing: `#popup` → popup UI, anything else → settings UI
- Popup: frameless, transparent, always-on-top, never destroyed (hide on close)
- Settings: standard framed window, single-instance (focus if already open)

**Data flow:**
1. Global hotkey fires → main process captures selected text (simulates Cmd+C)
2. Main process shows popup window near cursor, sends text via IPC `popup:show-text`
3. Renderer streams parallel LLM requests (one per prompt in the FunctionGroup)
4. Results render with Markdown (react-markdown + remark-gfm)

## Key Files

### Main Process (`src/main/`)

| File | Role |
|------|------|
| `index.ts` | App entry. Dock hide, macOS state restoration prevention, hotkey/tray/IPC setup, popup creation, first-run detection |
| `hotkeys.ts` | Global hotkey registration via `globalShortcut`. Only registers FunctionGroup hotkeys (NOT settings shortcut — that was removed to avoid stealing Cmd+, from other apps) |
| `clipboard.ts` | Text capture: simulates Cmd+C via nut-js on macOS, VBScript/PowerShell/nut-js on Windows |
| `store.ts` | JSON file store in `userData/config.json`. Settings + translation history with deep-merge defaults |
| `tray.ts` | System tray icon + context menu. Dynamic menu from FunctionGroups, history, settings, quit |
| `ipc-handlers.ts` | All IPC handler registrations. Re-registers hotkeys when functions change |
| `windows/popup-window.ts` | Floating popup BrowserWindow. Hide-on-close pattern, cursor positioning |
| `windows/settings-window.ts` | Settings BrowserWindow. Single-instance, tab-based UI |

### Renderer (`src/renderer/`)

| File | Role |
|------|------|
| `main.tsx` | React entry. Hash-based routing: `#popup` → PopupApp, else SettingsApp |
| `popup/App.tsx` | Popup UI. Receives text, streams LLM results, keyboard shortcuts (ESC/Cmd+C/Shift+C/arrows), auto-dismiss, chat-to-AI-services menu |
| `settings/App.tsx` | Settings shell with tab bar (AI, Functions, Appearance, General), save/cancel, export/import |
| `settings-components/` | Individual setting tabs: AIConfigTab, FunctionsTab (hotkey recorder), AppearanceTab (theme/opacity/blur), GeneralTab (auto-hide/launch-at-login) |
| `components/` | Shared UI: StreamingText (Markdown + cursor), CopyButton, ErrorBanner, HistoryList |
| `hooks/` | useAutoResize (debounced popup height), useAutoDismiss (auto-hide timer) |
| `lib/api-client.ts` | LLM streaming client. Anthropic Messages API + OpenAI Chat Completions with SSE parsing |

### Shared (`src/shared/`)

| File | Role |
|------|------|
| `types.ts` | All TypeScript types: FunctionGroup, AppSettings, ElectronAPI (context bridge interface), etc. |
| `constants.ts` | Defaults (2 built-in FunctionGroups: Translate Alt+T, Refine Alt+R), popup dimensions, version |
| `ipc-channels.ts` | IPC channel name constants (21 channels total) |

## Core Concepts

### FunctionGroup
The fundamental unit of functionality. Each group has a name, icon, hotkey, and one or more prompts. When triggered, all prompts in the group run in parallel, each producing a streaming result card. Default groups: "Translate" (1 prompt) and "Refine" (2 prompts: Concise + Polished).

### Text Capture
On hotkey press, main process simulates Cmd+C to copy selected text, then reads clipboard. Falls back to existing clipboard content if capture fails. This avoids requiring accessibility permissions for text reading.

### Popup Lifecycle
Popup is created once at startup (`show: false`), never destroyed. Show/hide cycle:
1. `showPopupAtCursor()` → position near cursor, `win.show()`
2. Send text to renderer via IPC
3. Renderer streams results
4. Auto-dismiss timer or ESC/blur hides the popup
5. `close` event is intercepted → `hide()` instead of destroy

### Hotkey System
Uses Electron's `globalShortcut` module. Only FunctionGroup hotkeys are registered globally. The Settings shortcut (Cmd+,) was intentionally removed from global registration to avoid intercepting the standard macOS Preferences shortcut from other apps. Settings is accessible via tray menu only.

## Known Pitfalls

1. **Electron 36 API gaps:** `BrowserWindow` has no `setRestorable()` method and no `restorable` constructor option. `app` has no `browser-window-restore` event. To prevent macOS window state restoration, use `execSync('defaults write com.wintranslator.app NSQuitAlwaysKeepsWindows -bool false')`.

2. **Global Cmd+, bug (fixed):** Previously `hotkeys.ts` registered `Command+,` as a global hotkey, stealing it from all other apps. This was removed; tray menu accelerator is display-only.

3. **macOS state restoration (fixed):** Login Items + macOS "Reopen windows when logging back in" would restore Settings/popup windows with stale Vite dev URLs. Fixed by disabling `NSQuitAlwaysKeepsWindows` via `defaults write` on each startup.

4. **First-run detection:** Uses a marker file `.setup-done` (project root in dev, `userData` in packaged). Previous approach using `hasCompletedSetup` in config store was unreliable — only set after API key entry, causing repeated first-run triggers.

5. **Launch at Login:** Implemented via `app.setLoginItemSettings({ openAtLogin, args: [] })`. Empty `args` prevents Vite dev flags from leaking into the login item.

6. **nut-js external:** Must be in `rollupOptions.external` in vite.config.ts — it's a native module that can't be bundled.

## Build Output

- `dist/` — Renderer build (HTML + CSS + JS)
- `dist-electron/main/` — Main process build
- `dist-electron/preload/` — Preload script build
- `release/` — Packaged apps (DMG, NSIS, AppImage, etc.)

## Path Aliases (Vite)

- `@shared` → `src/shared`
- `@renderer` → `src/renderer`

## Uncommitted Changes (as of 2026-06-22)

Three fixes applied but not yet committed:

1. **`src/main/hotkeys.ts`** — Removed global `Command+,` registration and `setSettingsHandler`
2. **`src/main/index.ts`** — Added `execSync` for `NSQuitAlwaysKeepsWindows`, switched first-run detection to marker file, removed `getSetting` import
3. **`.gitignore`** — Added `.setup-done`
