import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: ReactNode;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: ReactNode;
  loading?: boolean;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  loading,
}: TableProps<T>) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={col.headerClassName}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!loading && data.length > 0 && (
            data.map((item, idx) => (
              <tr key={keyExtractor(item, idx)}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={col.className}>
                    {col.render(item, idx)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {loading && (
        <div className="empty-state">
          <div className="spinner spinner--md" />
        </div>
      )}
      {!loading && data.length === 0 && (
        <EmptyState title={typeof emptyMessage === 'string' ? emptyMessage : 'No results'} />
      )}
    </div>
  );
}
