import type { FunctionGroup } from '../../shared/types';
import HistoryList from '../components/HistoryList';

interface HistoryTabProps {
  functions: FunctionGroup[];
}

export default function HistoryTab({ functions }: HistoryTabProps) {
  return (
    <div style={{ height: '100%' }}>
      <HistoryList functions={functions} />
    </div>
  );
}
