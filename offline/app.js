const KEY = "wintranslator-web-v1";
const VERSION = "1.3.0";

const DEFAULTS = {
  ai: {
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-20250514",
    baseUrl: "https://api.anthropic.com",
    maxTokens: 4096,
    thinking: false,
  },
  functions: [
    {
      id: "default-translate",
      name: "Translate",
      icon: "🌐",
      prompts: [{
        id: "default-translate-prompt",
        name: "Translate",
        prompt: "You are a professional translator. Translate the given text between Chinese and English.\nRules:\n- Auto-detect the source language and translate to the other language.\n- Preserve the original tone, style, and meaning.\n- Output ONLY the translation, no explanations.",
      }],
    },
    {
      id: "default-refine",
      name: "Refine",
      icon: "✨",
      prompts: [
        { id: "default-concise", name: "Concise", prompt: "Rewrite the following text to be more concise and direct. Keep the same meaning but use fewer words. Output only the refined text." },
        { id: "default-polished", name: "Polished", prompt: "Rewrite the following text to be more polished and professional. Improve grammar, word choice, and sentence structure. Output only the refined text." },
      ],
    },
  ],
  appearance: { theme: "dark" },
};

const THEMES = [
  { id: "dark", name: "Dark", bg: "#1c1c1e", fg: "#f5f5f7", desc: "默认深色" },
  { id: "monokai", name: "Monokai", bg: "#272822", fg: "#a6e22e", desc: "绿色点缀" },
  { id: "paper", name: "Paper", bg: "#f8f4ec", fg: "#3c3836", desc: "暖纸" },
  { id: "light", name: "Light", bg: "#f5f5f7", fg: "#1d1d1f", desc: "浅色" },
  { id: "square", name: "方正", bg: "#f4f0e6", fg: "#1a1a1a", desc: "直角、宋体" },
];

let db = load();
let ui = {
  text: "",
  results: [],
  streaming: false,
  error: "",
  filter: "all",
  query: "",
  searching: false,
  openIds: new Set(),
  editing: null,
  settings: false,
  settingsTab: "ai",
  menu: null,
  dragId: null,
  chat: false,
  copied: "",
  test: "",
  balance: "",
};
let runToken = 0;
let controller = null;

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "");
    const settings = parsed.settings || {};
    return {
      settings: {
        ...normalizeAi(settings),
        functions: Array.isArray(settings.functions) && settings.functions.length ? settings.functions : DEFAULTS.functions,
        appearance: { theme: settings.appearance?.theme || "dark" },
      },
      history: Array.isArray(parsed.history) ? parsed.history : [],
      selectedFunctionId: parsed.selectedFunctionId,
    };
  } catch {
    return { settings: structuredClone(DEFAULTS), history: [], selectedFunctionId: DEFAULTS.functions[0].id };
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function selected() {
  return db.settings.functions.find((item) => item.id === db.selectedFunctionId) || db.settings.functions[0];
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function md(text) {
  const safe = esc(text || "");
  return safe
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function groups() {
  const name = selected()?.name;
  const map = new Map();
  for (const entry of db.history) {
    if (name && entry.groupName !== name) continue;
    const id = entry.queryId || entry.id;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(entry);
  }
  return [...map.entries()].map(([id, entries]) => ({
    id,
    timestamp: Math.max(...entries.map((entry) => entry.timestamp)),
    sourceText: entries[0].sourceText,
    starred: entries.every((entry) => entry.starred),
    entries,
  }));
}

function visibleHistory() {
  const needle = ui.query.trim().toLowerCase();
  return groups().filter((group) => {
    if (ui.filter === "star" && !group.starred) return false;
    if (!needle) return true;
    const blob = [group.sourceText, ...group.entries.map((entry) => entry.resultText)].join("\n").toLowerCase();
    return blob.includes(needle);
  });
}

function render(opts = {}) {
  const focus = document.activeElement;
  const focusId = focus?.id;
  const caret = focus?.selectionStart;
  const desk = document.querySelector(".desk");
  const scrollTop = desk ? desk.scrollTop : 0;
  const theme = db.settings.appearance.theme || "dark";
  const dark = theme === "dark" || theme === "monokai";
  document.documentElement.className = "theme-" + theme + (dark ? " dark" : " light");
  const root = document.getElementById("app");
  root.innerHTML = pageHtml() + (ui.editing ? editorHtml() : "") + (ui.settings ? settingsHtml() : "") + (ui.menu ? menuHtml() : "");
  const nextDesk = document.querySelector(".desk");
  if (nextDesk) nextDesk.scrollTop = scrollTop;
  if (opts.focusId) {
    const card = document.querySelector(`[data-hist="${opts.focusId}"]`);
    card?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  if (focusId) {
    const next = document.getElementById(focusId);
    if (next) {
      next.focus();
      if (typeof caret === "number" && next.setSelectionRange) next.setSelectionRange(caret, caret);
    }
  } else if (opts.focusSearch) {
    document.getElementById("find")?.focus();
  }
}

const GEAR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;

function pageHtml() {
  const current = selected();
  const theme = db.settings.appearance.theme || "dark";
  const dark = theme === "dark" || theme === "monokai";
  const names = current ? current.prompts.map((prompt) => prompt.name).join("、") : "";
  const hasText = ui.text.trim().length > 0;
  const missing = !db.settings.ai.apiKey;
  return `<div class="web-app theme-${theme} ${dark ? "dark" : "light"}">
    <div class="atmosphere"></div>
    <header class="topbar">
      <div class="brand"><img class="brand-mark" src="./icon.png" alt="" width="36" height="36" /><div><strong>WinTranslator</strong><span>选一段文字，交给你配置的模型</span></div></div>
      <div class="top-actions">
        <button class="textish" data-act="import">导入配置</button>
        <button data-act="export">导出配置</button>
        <button class="gear" data-act="settings" aria-label="设置">${GEAR}</button>
      </div>
    </header>
    <div class="desk"><main class="stage">
      <nav class="fn-tabs" aria-label="功能">${db.settings.functions.map((item) => `<button class="tab${item.id === current?.id ? " on" : ""}${ui.dragId === item.id ? " drag" : ""}" draggable="true" data-tab="${item.id}"><span class="fn-icon">${esc(item.icon)}</span><span>${esc(item.name)}</span></button>`).join("")}<button class="tab add-tab" data-act="add" aria-label="添加模板">+</button></nav>
      <section class="composer">
        <div class="composer-label"><span>输入${names ? " → " + esc(names) : ""}</span><span>${ui.text.length}</span></div>
        <textarea id="input" placeholder="${current ? `粘贴或输入文字，用「${esc(current.name)}」处理。Enter 分析，Shift + Enter 换行。` : "粘贴或输入要处理的文字"}">${esc(ui.text)}</textarea>
        <div class="action-row">
          <button class="primary run" data-act="run" ${missing || ui.streaming ? "disabled" : ""}>${ui.streaming ? "生成中…" : hasText ? "Enter" : "粘贴并分析"}</button>
          <button class="clear-btn" data-act="clear">清空</button>
          ${ui.streaming ? `<button class="textish" data-act="stop">停止</button>` : ""}
        </div>
        ${missing ? `<p class="key-hint">还没有 API Key。点右上角齿轮，填入 Base URL、模型和密钥。</p>` : ""}
        ${ui.error ? `<p class="result-error">${esc(ui.error)}</p>` : ""}
      </section>
      ${ui.results.length ? resultHtml(current) : ""}
      ${historyHtml()}
    </main></div>
  </div>`;
}

const COPY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/></svg>`;
const TRASH_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>`;

function copyBtn(key) {
  const done = ui.copied === key;
  return `<button class="icon-btn copy-btn${done ? " on" : ""}" data-copy="${key}" title="${done ? "已复制" : "复制"}" aria-label="复制">${done ? "已复制" : COPY_SVG}</button>`;
}

function resultHtml(current) {
  const hasOutput = ui.results.some((result) => result.text);
  const chats = [["Claude", "https://claude.ai/new"], ["ChatGPT", "https://chatgpt.com/"], ["Gemini", "https://gemini.google.com/app"], ["Grok", "https://x.com/i/grok"], ["DeepSeek", "https://chat.deepseek.com/"], ["豆包", "https://www.doubao.com/chat/"], ["通义千问", "https://www.qianwen.com/"]];
  return `<section class="output">
    <div class="output-head"><div><span class="output-icon">${esc(current?.icon || "")}</span><strong>${esc(current?.name || "")}</strong>${ui.streaming ? `<i class="pulse"></i>` : ""}</div>
      <div class="output-tools">${hasOutput ? `<div class="chat-wrap"><button class="textish" data-act="chat">继续聊</button>${ui.chat ? `<div class="chat-menu">${chats.map(([name, url]) => `<button data-chat="${url}">${name}</button>`).join("")}</div>` : ""}</div>` : ""}</div>
    </div>
    <div class="result-stack">${ui.results.map((result, index) => `<article>
      <div class="prompt-head"><span>${esc(result.promptName)}</span><span class="prompt-tools">${ui.streaming && !result.text ? `<i class="pulse"></i>` : ""}${result.text ? copyBtn("r:" + index) : ""}</span></div>
      ${result.error && !result.text ? `<div class="result-error">${esc(result.error)}</div>` : result.text ? `<div class="markdown-content">${md(result.text)}</div>` : `<div class="thinking">思考中…</div>`}
      ${index < ui.results.length - 1 ? "<hr>" : ""}
    </article>`).join("")}</div>
  </section>`;
}

function historyHtml() {
  const list = visibleHistory();
  const all = groups();
  return `<section class="rail">
    <div class="rail-head">
      <div class="rail-title">
        <h2>历史</h2>
        <button class="icon-btn search-btn${ui.searching ? " on" : ""}" data-act="search-toggle" title="搜索" aria-label="搜索"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg></button>
      </div>
      <div class="chip-row rail-filters">
        <button class="chip${ui.filter === "all" ? " on" : ""}" data-filter="all">全部 ${all.length}</button>
        <button class="chip${ui.filter === "star" ? " on" : ""}" data-filter="star">收藏</button>
        <button class="chip quiet" data-act="wipe" ${all.length ? "" : "disabled"}>清空</button>
      </div>
    </div>
    ${ui.searching ? `<div class="rail-tools"><input class="rail-search" id="find" placeholder="搜索原文或结果" value="${esc(ui.query)}" /></div>` : ""}
    <div class="rail-list">
      ${all.length === 0 ? `<div class="rail-empty">这个模板还没有记录。分析一次之后，结果会留在这里。</div>` : ""}
      ${all.length > 0 && list.length === 0 ? `<div class="rail-empty">没有符合条件的记录。</div>` : ""}
      ${list.map((group) => {
        const open = ui.openIds.has(group.id);
        return `<article class="hist${open ? " open" : ""}" data-hist="${group.id}">
        <div class="hist-top">
          <div class="hist-main">
            <button class="hist-open" data-open="${group.id}">
              <span class="hist-meta"><time>${new Date(group.timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></span>
              <span class="hist-source">${esc(group.sourceText)}</span>
              ${open ? "" : `<span class="hist-preview">${esc(group.entries.map((entry) => entry.resultText).filter(Boolean).join("  ·  ") || "无结果")}</span>`}
            </button>
            ${open ? `<div class="hist-body">${group.entries.map((entry) => `<section class="hist-result"><div class="hist-result-head"><span>${esc(entry.promptName || "Result")}</span>${entry.resultText ? copyBtn("h:" + entry.id) : ""}</div><div class="markdown-content">${md(entry.resultText)}</div></section>`).join("")}<div class="hist-foot"><button data-reuse="${group.id}">填回输入框</button></div></div>` : ""}
          </div>
          <button class="icon-btn star-btn${group.starred ? " on" : ""}" data-star="${group.id}" title="收藏" aria-label="收藏"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 14.6 8.8 20.6 9.5 16.1 13.6 17.4 19.5 12 16.6 6.6 19.5 7.9 13.6 3.4 9.5 9.4 8.8 12 3.2Z"/></svg></button>
          <button class="icon-btn trash-btn" data-del="${group.id}" title="删除" aria-label="删除">${TRASH_SVG}</button>
        </div>
      </article>`;
      }).join("")}
    </div>
  </section>`;
}

function editorHtml() {
  const group = db.settings.functions.find((item) => item.id === ui.editing);
  if (!group) return "";
  return `<div class="editor-layer"><div class="editor">
    <div class="editor-top">
      <input class="editor-icon" id="ed-icon" value="${esc(group.icon)}" />
      <input class="editor-title" id="ed-name" value="${esc(group.name)}" />
      <button class="primary" data-act="edit-done">完成</button>
    </div>
    <p class="editor-note">这个模板里的提示词会一起发给模型。</p>
    ${group.prompts.map((prompt) => `<section class="editor-block">
      <div class="editor-block-head"><input data-pname="${prompt.id}" value="${esc(prompt.name)}" placeholder="提示词名称" />${group.prompts.length > 1 ? `<button class="textish" data-premove="${prompt.id}">移除</button>` : ""}</div>
      <textarea data-ptext="${prompt.id}" placeholder="写下这条提示词">${esc(prompt.prompt)}</textarea>
    </section>`).join("")}
    <div class="editor-foot">
      <button data-act="padd">添加提示词</button>
      <button class="danger" data-act="pdelete">删除模板</button>
    </div>
  </div></div>`;
}

function settingsHtml() {
  const ai = db.settings.ai;
  const tab = ui.settingsTab;
  const title = tab === "ai" ? "AI" : tab === "appearance" ? "Appearance" : "About";
  const nav = [
    ["ai", "🤖", "AI"],
    ["appearance", "🎨", "Appearance"],
    ["about", "ℹ️", "About"],
  ];
  return `<div class="settings-modal-backdrop" data-act="settings-close"><div class="settings-modal" data-stop="1">
    <button class="settings-modal-x" data-act="settings-close" aria-label="关闭">×</button>
    <div class="settings-root">
      <aside class="settings-sidebar">
        <div class="settings-sidebar-title">WinTranslator</div>
        ${nav.map(([key, icon, label]) => `<button class="settings-nav-item${tab === key ? " active" : ""}" data-stab="${key}"><span class="settings-nav-icon">${icon}</span>${label}</button>`).join("")}
      </aside>
      <div class="settings-content">
        <div class="settings-header"><h2>${title}</h2></div>
        <div class="settings-body">${tab === "ai" ? aiHtml(ai) : tab === "appearance" ? themeHtml() : aboutHtml()}</div>
      </div>
    </div>
  </div></div>`;
}

function aiFields(ai) {
  return {
    provider: ai?.provider === "anthropic" ? "anthropic" : "openai",
    apiKey: ai?.apiKey || "",
    model: ai?.model || "",
    baseUrl: ai?.baseUrl || "",
    maxTokens: Number(ai?.maxTokens) || 4096,
    thinking: !!ai?.thinking,
  };
}

function normalizeAi(settings) {
  const ai = { ...DEFAULTS.ai, ...aiFields(settings.ai || {}) };
  const profiles = (Array.isArray(settings.aiProfiles) ? settings.aiProfiles : []).map((item) => ({
    id: item.id || crypto.randomUUID(),
    name: item.name || item.model || "未命名",
    ...aiFields(item),
  }));
  if (!profiles.length) profiles.push({ id: crypto.randomUUID(), name: "默认", ...aiFields(ai) });
  const activeAiId = profiles.some((item) => item.id === settings.activeAiId) ? settings.activeAiId : profiles[0].id;
  return { ai, aiProfiles: profiles, activeAiId };
}

function aiHtml(ai) {
  const profiles = db.settings.aiProfiles || [];
  const active = db.settings.activeAiId;
  return `<div class="settings-section">
      <div class="settings-section-title">接口模板</div>
      <div class="presets">${profiles.map((item) => `<span class="preset${item.id === active ? " on" : ""}"><button data-ai="${item.id}">${esc(item.name)}</button><button data-ai-del="${item.id}" aria-label="删除${esc(item.name)}">×</button></span>`).join("")}</div>
      <div class="preset-save">
        <input id="ai-preset-name" type="text" placeholder="新模板名称，留空则更新当前" />
        <button data-act="save-ai">保存为模板</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-field"><label class="settings-field-label">Provider</label><div class="settings-segmented">
        <button data-provider="anthropic" class="${ai.provider === "anthropic" ? "active" : ""}">Anthropic</button>
        <button data-provider="openai" class="${ai.provider === "openai" ? "active" : ""}">OpenAI Compatible</button>
      </div></div>
      <div class="settings-field"><label class="settings-field-label">Base URL</label><input id="base" type="text" value="${esc(ai.baseUrl)}" /></div>
      <div class="settings-field"><label class="settings-field-label">API Key</label><input id="key" type="password" value="${esc(ai.apiKey)}" /></div>
      <div class="settings-field"><label class="settings-field-label">Model</label><input id="model" type="text" value="${esc(ai.model)}" /></div>
      <div class="settings-field"><label class="settings-field-label">Max Output Tokens</label><div class="settings-slider-row"><input id="tokens" type="range" min="256" max="16384" step="256" value="${ai.maxTokens}" /><span class="settings-slider-value">${ai.maxTokens}</span></div></div>
      <div class="settings-row"><div><div class="settings-row-label">Thinking Mode</div></div><button class="settings-toggle${ai.thinking ? " on" : ""}" data-act="think" aria-label="Thinking"><span class="settings-toggle-knob"></span></button></div>
      <div class="settings-actions">
        <button data-act="test">Test Connection</button>
        <button data-act="balance">Check Balance</button>
        ${ui.test ? `<span class="result">${esc(ui.test)}</span>` : ""}
        ${ui.balance ? `<span class="result">${esc(ui.balance)}</span>` : ""}
      </div>
    </div>`;
}

function themeHtml() {
  const current = db.settings.appearance.theme;
  return `<div class="settings-section"><div class="theme-grid">${THEMES.map((theme) => `<button class="theme-card${theme.id === current ? " active" : ""}" data-theme="${theme.id}" style="background:${theme.bg};color:${theme.fg}"><div class="theme-card-label">${theme.name}</div><div class="theme-card-desc">${theme.desc}</div></button>`).join("")}</div></div>`;
}

function aboutHtml() {
  return `<div class="settings-section"><div class="settings-row"><div><div class="settings-row-label">WinTranslator v${VERSION}</div><div class="settings-row-hint">网页版直接请求你填写的接口。如果浏览器被跨域拦住，请换成允许当前网页来源的地址。</div></div><a href="https://github.com/cornradio/WinTranslator" target="_blank" rel="noreferrer">GitHub</a></div></div>`;
}

function menuHtml() {
  return `<div class="tab-menu" style="left:${ui.menu.x}px;top:${ui.menu.y}px">
    <button data-act="edit" data-id="${ui.menu.id}">编辑模板</button>
    <button class="danger" data-act="remove" data-id="${ui.menu.id}">删除模板</button>
  </div>`;
}

function patchAi(partial) {
  db.settings.ai = { ...db.settings.ai, ...partial };
  if (db.settings.ai.apiKey) db.settings.hasCompletedSetup = true;
  save();
}

async function run(text) {
  const group = selected();
  const trimmed = text.trim();
  if (!group || !trimmed || !db.settings.ai.apiKey) return;
  controller?.abort();
  controller = new AbortController();
  const token = ++runToken;
  ui.streaming = true;
  ui.error = "";
  ui.text = trimmed;
  const queryId = crypto.randomUUID();
  ui.results = group.prompts.map((prompt) => ({ promptId: prompt.id, promptName: prompt.name, text: "", error: "" }));
  render();
  await Promise.all(group.prompts.map(async (prompt, index) => {
    const userText = `<prompt>\n${prompt.prompt.replace("{text}", "").trim()}\n</prompt>\n<input>\n${trimmed}\n</input>`;
    try {
      await stream(userText, (chunk) => {
        if (token !== runToken) return;
        ui.results[index].text += chunk;
        render();
      });
      if (token !== runToken) return;
      if (ui.results[index].text) {
        db.history.unshift({
          id: crypto.randomUUID(),
          queryId,
          timestamp: Date.now(),
          sourceText: trimmed,
          resultText: ui.results[index].text,
          groupName: group.name,
          groupIcon: group.icon,
          promptName: prompt.name,
        });
        save();
      }
    } catch (err) {
      if (token !== runToken || err.name === "AbortError") return;
      const message = /failed to fetch|networkerror|load failed/i.test(err.message)
        ? err.message + "。浏览器直接请求被接口拒绝时，把 Base URL 换成允许当前网页来源的兼容接口。"
        : err.message;
      ui.results[index].error = message;
      ui.error = message;
    }
  }));
  if (token === runToken) ui.streaming = false;
  render();
}

async function stream(userText, onChunk) {
  const ai = db.settings.ai;
  const signal = controller.signal;
  if (ai.provider === "anthropic") {
    const response = await fetch(ai.baseUrl.replace(/\/$/, "") + "/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ai.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ai.model, max_tokens: ai.maxTokens, stream: true, messages: [{ role: "user", content: userText }] }),
      signal,
    });
    if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text()}`);
    await readSSE(response, (data) => { if (data.type === "content_block_delta" && data.delta?.text) onChunk(data.delta.text); });
    return;
  }
  const body = { model: ai.model, stream: true, max_tokens: ai.maxTokens, messages: [{ role: "system", content: "" }, { role: "user", content: userText }] };
  if (ai.baseUrl.toLowerCase().includes("deepseek")) {
    body.thinking = { type: ai.thinking ? "enabled" : "disabled" };
    if (ai.thinking) body.reasoning_effort = "high";
  }
  const response = await fetch(ai.baseUrl.replace(/\/$/, "") + "/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + ai.apiKey },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text()}`);
  await readSSE(response, (data) => {
    const content = data.choices?.[0]?.delta?.content;
    if (content) onChunk(content);
  });
}

async function readSSE(response, onData) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try { onData(JSON.parse(data)); } catch { /* skip */ }
    }
  }
}

function rememberInput() {
  const input = document.getElementById("input");
  if (input) ui.text = input.value;
  const find = document.getElementById("find");
  if (find) ui.query = find.value;
  const base = document.getElementById("base");
  if (base) patchAi({ baseUrl: base.value, apiKey: document.getElementById("key").value, model: document.getElementById("model").value, maxTokens: Number(document.getElementById("tokens").value) });
  const icon = document.getElementById("ed-icon");
  if (icon) {
    const group = db.settings.functions.find((item) => item.id === ui.editing);
    if (group) {
      group.icon = icon.value;
      group.name = document.getElementById("ed-name").value;
      group.prompts.forEach((prompt) => {
        const name = document.querySelector(`[data-pname="${prompt.id}"]`);
        const text = document.querySelector(`[data-ptext="${prompt.id}"]`);
        if (name) prompt.name = name.value;
        if (text) prompt.prompt = text.value;
      });
      save();
    }
  }
}

document.getElementById("app").addEventListener("input", (event) => {
  if (event.target.id === "input") ui.text = event.target.value;
  if (event.target.id === "find") { ui.query = event.target.value; rememberInput(); render(); }
  if (event.target.id === "tokens") { patchAi({ maxTokens: Number(event.target.value) }); render(); }
  if (["base", "key", "model"].includes(event.target.id)) {
    patchAi({
      baseUrl: document.getElementById("base").value,
      apiKey: document.getElementById("key").value,
      model: document.getElementById("model").value,
    });
  }
  if (event.target.id === "ed-icon" || event.target.id === "ed-name" || event.target.dataset.pname || event.target.dataset.ptext) rememberInput();
});

document.getElementById("app").addEventListener("keydown", (event) => {
  if (event.target.id !== "input") return;
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  ui.text = event.target.value;
  if (ui.text.trim()) run(ui.text);
});

document.getElementById("app").addEventListener("click", async (event) => {
  if (event.target.classList?.contains("settings-modal-backdrop")) {
    rememberInput();
    ui.settings = false;
    render();
    return;
  }
  const button = event.target.closest("button");
  if (!button) {
    if (ui.menu && !event.target.closest(".tab-menu")) { ui.menu = null; render(); return; }
    return;
  }
  const act = button.dataset.act;
  const tab = button.dataset.tab;
  if (tab) { db.selectedFunctionId = tab; save(); ui.results = []; render(); return; }
  if (button.dataset.filter) { ui.filter = button.dataset.filter; render(); return; }
  if (button.dataset.stab) { rememberInput(); ui.settingsTab = button.dataset.stab; render(); return; }
  if (button.dataset.provider) { patchAi({ provider: button.dataset.provider }); render(); return; }
  if (button.dataset.ai) {
    rememberInput();
    const profile = db.settings.aiProfiles.find((item) => item.id === button.dataset.ai);
    if (!profile) return;
    db.settings.activeAiId = profile.id;
    db.settings.ai = { ...db.settings.ai, ...aiFields(profile) };
    ui.test = "";
    ui.balance = "";
    save();
    render();
    return;
  }
  if (button.dataset.aiDel) {
    rememberInput();
    const id = button.dataset.aiDel;
    db.settings.aiProfiles = db.settings.aiProfiles.filter((item) => item.id !== id);
    if (!db.settings.aiProfiles.length) {
      const created = { id: crypto.randomUUID(), name: db.settings.ai.model || "默认", ...aiFields(db.settings.ai) };
      db.settings.aiProfiles = [created];
      db.settings.activeAiId = created.id;
    } else if (db.settings.activeAiId === id) {
      db.settings.activeAiId = db.settings.aiProfiles[0].id;
      db.settings.ai = { ...db.settings.ai, ...aiFields(db.settings.aiProfiles[0]) };
    }
    save();
    render();
    return;
  }
  if (button.dataset.theme) { db.settings.appearance.theme = button.dataset.theme; save(); render(); return; }
  if (button.dataset.copy) {
    const key = button.dataset.copy;
    const text = key.startsWith("r:")
      ? ui.results[Number(key.slice(2))]?.text || ""
      : db.history.find((entry) => entry.id === key.slice(2))?.resultText || "";
    if (!text) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      area.remove();
    }
    if (ok) {
      ui.copied = key;
      render();
      setTimeout(() => { if (ui.copied === key) { ui.copied = ""; render(); } }, 1200);
    }
    return;
  }
  if (button.dataset.star) {
    const group = groups().find((item) => item.id === button.dataset.star);
    const starred = !group.starred;
    db.history.forEach((entry) => { if ((entry.queryId || entry.id) === group.id) entry.starred = starred; });
    save(); render(); return;
  }
  if (button.dataset.open) {
    const id = button.dataset.open;
    if (ui.openIds.has(id)) ui.openIds.delete(id);
    else ui.openIds.add(id);
    render({ focusId: ui.openIds.has(id) ? id : null });
    return;
  }
  if (button.dataset.del) {
    const id = button.dataset.del;
    db.history = db.history.filter((entry) => (entry.queryId || entry.id) !== id);
    ui.openIds.delete(id);
    save(); render(); return;
  }
  if (button.dataset.reuse) {
    const group = groups().find((item) => item.id === button.dataset.reuse);
    ui.text = group?.sourceText || "";
    render();
    return;
  }
  if (button.dataset.premove) {
    const group = db.settings.functions.find((item) => item.id === ui.editing);
    rememberInput();
    group.prompts = group.prompts.filter((prompt) => prompt.id !== button.dataset.premove);
    save(); render(); return;
  }
  if (act === "add") {
    const group = { id: crypto.randomUUID(), name: "新模板", icon: "✦", prompts: [{ id: crypto.randomUUID(), name: "Prompt 1", prompt: "" }] };
    db.settings.functions.push(group);
    db.selectedFunctionId = group.id;
    save();
    ui.editing = group.id;
    render();
    return;
  }
  if (act === "edit") { ui.editing = button.dataset.id; ui.menu = null; render(); return; }
  if (act === "remove" || act === "pdelete") {
    rememberInput();
    const id = button.dataset.id || ui.editing;
    if (db.settings.functions.length <= 1) { alert("至少保留一个模板。"); return; }
    if (!confirm("删除这个模板？")) return;
    db.settings.functions = db.settings.functions.filter((item) => item.id !== id);
    if (db.selectedFunctionId === id) db.selectedFunctionId = db.settings.functions[0].id;
    ui.editing = null;
    ui.menu = null;
    save(); render(); return;
  }
  if (act === "edit-done") { rememberInput(); ui.editing = null; render(); return; }
  if (act === "padd") {
    rememberInput();
    const group = db.settings.functions.find((item) => item.id === ui.editing);
    group.prompts.push({ id: crypto.randomUUID(), name: "Prompt " + (group.prompts.length + 1), prompt: "" });
    save(); render(); return;
  }
  if (act === "run") {
    ui.text = document.getElementById("input")?.value || ui.text;
    if (ui.text.trim()) { run(ui.text); return; }
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) { ui.error = "剪贴板是空的。"; render(); return; }
      run(clip);
    } catch { ui.error = "无法读取剪贴板。"; render(); }
    return;
  }
  if (act === "clear") { controller?.abort(); ui.text = ""; ui.results = []; ui.error = ""; ui.streaming = false; render(); return; }
  if (act === "stop") { runToken++; controller?.abort(); ui.streaming = false; render(); return; }
  if (act === "search-toggle") {
    ui.searching = !ui.searching;
    if (!ui.searching) ui.query = "";
    render({ focusSearch: ui.searching });
    return;
  }
  if (act === "wipe") {
    if (!confirm("清空当前模板的历史记录？")) return;
    const name = selected()?.name;
    db.history = db.history.filter((entry) => entry.groupName !== name);
    ui.openIds.clear();
    save(); render(); return;
  }
  if (act === "chat") { ui.chat = !ui.chat; render(); return; }
  if (button.dataset.chat) {
    const parts = [];
    if (ui.text.trim()) parts.push("[Source]\n" + ui.text.trim());
    ui.results.forEach((result) => { if (result.text) parts.push("[" + result.promptName + "]\n" + result.text); });
    if (parts.length) await navigator.clipboard.writeText(parts.join("\n\n")).catch(() => {});
    window.open(button.dataset.chat, "_blank", "noopener");
    ui.chat = false;
    render();
    return;
  }
  if (act === "settings") { ui.settings = true; ui.settingsTab = "ai"; render(); return; }
  if (act === "settings-close") { rememberInput(); ui.settings = false; render(); return; }
  if (act === "think") { patchAi({ thinking: !db.settings.ai.thinking }); render(); return; }
  if (act === "save-ai") {
    rememberInput();
    const typed = (document.getElementById("ai-preset-name")?.value || "").trim();
    const fields = aiFields(db.settings.ai);
    const current = db.settings.aiProfiles.find((item) => item.id === db.settings.activeAiId);
    const name = typed || current?.name || db.settings.ai.model || "未命名";
    let profile = typed ? db.settings.aiProfiles.find((item) => item.name === name) : current;
    if (profile) Object.assign(profile, fields);
    else {
      profile = { id: crypto.randomUUID(), name, ...fields };
      db.settings.aiProfiles.push(profile);
    }
    db.settings.activeAiId = profile.id;
    save();
    render();
    return;
  }
  if (act === "export") {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ai: db.settings.ai, aiProfiles: db.settings.aiProfiles, activeAiId: db.settings.activeAiId, functions: db.settings.functions }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wintranslator-config.json";
    link.click();
    return;
  }
  if (act === "import") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const parsed = JSON.parse(await file.text());
      if (parsed.ai) db.settings.ai = { ...db.settings.ai, ...aiFields(parsed.ai) };
      if (Array.isArray(parsed.aiProfiles)) {
        const next = normalizeAi({ ai: db.settings.ai, aiProfiles: parsed.aiProfiles, activeAiId: parsed.activeAiId });
        db.settings.ai = next.ai;
        db.settings.aiProfiles = next.aiProfiles;
        db.settings.activeAiId = next.activeAiId;
      }
      if (Array.isArray(parsed.functions)) db.settings.functions = parsed.functions;
      if (Array.isArray(parsed) ) db.settings.functions = parsed;
      save(); render();
    };
    input.click();
    return;
  }
  if (act === "test") {
    ui.test = "Testing..."; render();
    try {
      const ai = db.settings.ai;
      const url = ai.provider === "anthropic" ? ai.baseUrl + "/v1/messages" : ai.baseUrl + "/v1/chat/completions";
      const headers = { "Content-Type": "application/json" };
      if (ai.provider === "anthropic") { headers["x-api-key"] = ai.apiKey; headers["anthropic-version"] = "2023-06-01"; }
      else headers.Authorization = "Bearer " + ai.apiKey;
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ model: ai.model, max_tokens: 32, messages: [{ role: "user", content: "Say OK" }] }) });
      ui.test = res.ok ? "OK: Connected" : "Failed: " + res.status;
    } catch (err) { ui.test = "Failed: " + err.message; }
    render();
    return;
  }
  if (act === "balance") {
    try {
      const ai = db.settings.ai;
      const res = await fetch(ai.baseUrl.replace(/\/$/, "") + "/user/balance", { headers: { Authorization: "Bearer " + ai.apiKey } });
      const data = await res.json();
      ui.balance = data.balance_infos?.map((info) => `${info.currency} ${info.total_balance}`).join(" · ") || "没有返回余额";
    } catch (err) { ui.balance = err.message; }
    render();
  }
});

document.getElementById("app").addEventListener("contextmenu", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) return;
  event.preventDefault();
  ui.menu = { x: event.clientX, y: event.clientY, id: tab.dataset.tab };
  render();
});

document.getElementById("app").addEventListener("dragstart", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab) return;
  ui.dragId = tab.dataset.tab;
  event.dataTransfer.effectAllowed = "move";
});

document.getElementById("app").addEventListener("dragover", (event) => {
  const tab = event.target.closest("[data-tab]");
  if (!tab || !ui.dragId || tab.dataset.tab === ui.dragId) return;
  event.preventDefault();
  const list = db.settings.functions;
  const from = list.findIndex((item) => item.id === ui.dragId);
  const to = list.findIndex((item) => item.id === tab.dataset.tab);
  if (from < 0 || to < 0) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  const node = document.querySelector(`[data-tab="${ui.dragId}"]`);
  if (node) (from < to ? tab.after(node) : tab.before(node));
});

document.getElementById("app").addEventListener("dragend", () => {
  ui.dragId = null;
  save();
});

render();
