export const IPC = {
  // Renderer -> Main (invoke/handle)
  CONFIG_GET_ALL: 'config:get-all',
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_EXPORT_FUNCTIONS: 'config:export-functions',
  CONFIG_IMPORT_FUNCTIONS: 'config:import-functions',
  POPUP_RESIZE: 'popup:resize',
  POPUP_HIDE: 'popup:hide',
  POPUP_START_DRAG: 'popup:start-drag',
  SETTINGS_CLOSE: 'settings:close',
  HISTORY_GET: 'history:get',
  HISTORY_ADD: 'history:add',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR: 'history:clear',
  CLIPBOARD_CAPTURE: 'clipboard:capture',

  // Main -> Renderer (send/on)
  POPUP_SHOW_TEXT: 'popup:show-text',
  POPUP_DISMISS_TIMER: 'popup:dismiss-timer',
  SETTINGS_UPDATED: 'settings:updated',
  HISTORY_UPDATED: 'history:updated',
} as const;
