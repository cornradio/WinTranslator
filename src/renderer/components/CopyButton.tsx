import { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      className="no-drag"
      onClick={handleCopy}
      style={{
        background: 'none',
        border: 'none',
        padding: '2px 6px',
        fontSize: '11px',
        color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        transition: 'color 0.15s',
      }}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}
