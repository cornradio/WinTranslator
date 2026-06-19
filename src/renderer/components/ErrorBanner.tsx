interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div style={{
      background: 'rgba(255, 69, 58, 0.12)',
      border: '1px solid rgba(255, 69, 58, 0.25)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
    }}>
      <span style={{ color: 'var(--text-error)', fontSize: '12px', flex: 1 }}>
        {message}
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-error)',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: '14px',
        }}
      >
        ×
      </button>
    </div>
  );
}
