import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export default function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <div style={{
      fontSize: '13px',
      lineHeight: '1.6',
      wordBreak: 'break-word',
      color: 'var(--text-primary)',
    }}>
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {isStreaming && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '14px',
          background: 'var(--accent-blue)',
          animation: 'pulse 0.8s infinite',
          verticalAlign: 'text-bottom',
          marginLeft: '2px',
        }} />
      )}
    </div>
  );
}
