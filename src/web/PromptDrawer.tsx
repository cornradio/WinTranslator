import type { FunctionGroup, PromptTemplate } from '../shared/types';

interface PromptDrawerProps {
  group: FunctionGroup;
  onChange: (group: FunctionGroup) => void;
  onClose: () => void;
  onDelete: () => void;
}

export default function PromptDrawer({ group, onChange, onClose, onDelete }: PromptDrawerProps) {
  const updatePrompt = (promptId: string, updates: Partial<PromptTemplate>) => {
    onChange({
      ...group,
      prompts: group.prompts.map((prompt) => (prompt.id === promptId ? { ...prompt, ...updates } : prompt)),
    });
  };

  const addPrompt = () => {
    const prompt: PromptTemplate = {
      id: crypto.randomUUID(),
      name: `Prompt ${group.prompts.length + 1}`,
      prompt: '',
    };
    onChange({ ...group, prompts: [...group.prompts, prompt] });
  };

  const removePrompt = (promptId: string) => {
    if (group.prompts.length <= 1) return;
    onChange({ ...group, prompts: group.prompts.filter((prompt) => prompt.id !== promptId) });
  };

  return (
    <div className="editor-layer" onClick={onClose}>
      <div className="editor" onClick={(event) => event.stopPropagation()}>
        <div className="editor-top">
          <input
            className="editor-icon"
            value={group.icon}
            onChange={(event) => onChange({ ...group, icon: event.target.value })}
            aria-label="图标"
          />
          <input
            className="editor-title"
            value={group.name}
            onChange={(event) => onChange({ ...group, name: event.target.value })}
            aria-label="模板名称"
            placeholder="模板名称"
          />
          <button type="button" className="primary" onClick={onClose}>完成</button>
        </div>
        <p className="editor-note">这个模板里的提示词会一起发给模型。输入文字会自动接在提示词后面。</p>

        {group.prompts.map((prompt, index) => (
          <section key={prompt.id} className="editor-block">
            <div className="editor-block-head">
              <input
                value={prompt.name}
                onChange={(event) => updatePrompt(prompt.id, { name: event.target.value })}
                aria-label={`提示词 ${index + 1} 名称`}
                placeholder="提示词名称"
              />
              {group.prompts.length > 1 && (
                <button type="button" className="textish" onClick={() => removePrompt(prompt.id)}>移除</button>
              )}
            </div>
            <textarea
              value={prompt.prompt}
              placeholder="写下这条提示词"
              onChange={(event) => updatePrompt(prompt.id, { prompt: event.target.value })}
            />
          </section>
        ))}

        <div className="editor-foot">
          <button type="button" onClick={addPrompt}>添加提示词</button>
          <button
            type="button"
            className="textish danger-text"
            onClick={() => {
              if (window.confirm(`删除模板「${group.name}」？`)) onDelete();
            }}
          >
            删除模板
          </button>
        </div>
      </div>
    </div>
  );
}
