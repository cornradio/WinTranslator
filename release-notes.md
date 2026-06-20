## WinTranslator v1.2.4

### New
- **Check Balance** — AI 设置页可直接查询 API 账户余额（支持 DeepSeek 及兼容的 OpenAI 服务商）
- **Check Online** — 一键打开 DeepSeek 用量页面
- **Linux 支持** — 新增 AppImage 和 deb 安装包

### Improved
- Functions 标签页布局优化：快捷键和托盘菜单开关各占一行，不再拥挤
- 删除功能移至左侧列表，hover 显示删除按钮
- 新增 functions.md 文档，记录所有预设功能和 prompt
- 自动化构建：Windows / macOS / Linux 三平台 GitHub Actions 自动打包发布


# WinTranslator v1.2.0

## macOS Support

This release brings full macOS support, making WinTranslator a truly cross-platform translation tool.

- **Native vibrancy blur** — Popup uses macOS native `NSVisualEffectView` for a frosted-glass effect, with a toggle in Appearance settings to switch between blur and classic opacity.
- **Dock-free operation** — Runs as a tray-only utility with no dock icon.
- **Option key hotkeys** — Fixed hotkey recording so `Option + letter` shortcuts (e.g. `Option+E`) work correctly instead of being intercepted by the macOS compose modifier.
- **Launch at Login** — New toggle in General settings to start WinTranslator automatically at login.

## General

- **New General tab** — Consolidated app-level settings (auto-hide, launch at login, check for updates, reset defaults) into a dedicated tab.
- **Settings shortcut** — Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux) anywhere to open settings. Also works when the tray menu is open.
- **GitHub button** — Quick link to the project repo in the General tab.
- **Quit fix** — Tray menu "Quit" now properly exits the app in dev mode.

---

# WinTranslator v1.1.1

## New Features

**Chat Button** - Popup header adds a Chat dropdown menu. Select an AI platform (Claude, ChatGPT, Gemini, Grok, DeepSeek, Doubao, Qianwen) to copy the current translation context to clipboard and open the chat page in your browser, ready to continue the conversation.

**Thinking Mode Toggle** - New toggle in AI settings to control DeepSeek's thinking/reasoning mode. Disabled by default for fast translation; enable it when you need deeper reasoning. Automatically sends `thinking: disabled` to DeepSeek API to override the default behavior. Only affects DeepSeek requests, other APIs are untouched.

**Check for Updates** - Settings footer now fetches the latest release from GitHub and compares versions. Shows a clickable link to the releases page when a new version is available.

**Global Max Tokens** - Max output tokens is now a single global setting in the AI tab (slider + number input, 256-16384), instead of per-prompt. Default raised to 4096.

## Improvements

**History via Tray** - History moved from the popup header to the tray right-click menu. Opens in a centered popup at full height, filling available space. Each history entry shows the function group's custom icon for quick visual identification.

**Cleaner UI** - Removed all emojis from buttons (Copy, header icons kept for function group identification only). Popup header shows "HISTORY" when viewing history, function group name + icon when translating.

**Font Scaling** - StreamingText now uses `em`-based sizing instead of hardcoded `px`, properly scales with Ctrl+Plus zoom. Auto-resize buffer increased to prevent content clipping at larger font sizes.

**Error Handling** - When a stream errors out, any partial text received so far is preserved and displayed (with a small "Output may be incomplete" note), instead of being replaced entirely by "Error".

## Bug Fixes

- Fixed SSE stream parser dropping the last data chunk when server doesn't send a trailing newline (both Anthropic and OpenAI parsers)
- Fixed output truncation: new prompts now default to 2048 max tokens instead of 512
- Removed box-shadow from popup (frameless transparent windows on Windows render shadows as rectangular artifacts, not clipped by border-radius)
- Removed resize grip from popup bottom-right corner
