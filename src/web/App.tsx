import { useEffect, useState } from 'react';
import SettingsApp from '../renderer/settings/App';
import { setSettingsCloseHandler } from './shim';
import Workspace from './Workspace';

export default function WebApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setSettingsCloseHandler(() => setSettingsOpen(false));
  }, []);

  return (
    <>
      <Workspace onOpenSettings={() => setSettingsOpen(true)} />
      {settingsOpen && (
        <div className="settings-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="settings-modal-x" aria-label="关闭" onClick={() => setSettingsOpen(false)}>×</button>
            <SettingsApp />
          </div>
        </div>
      )}
    </>
  );
}
