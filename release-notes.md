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
