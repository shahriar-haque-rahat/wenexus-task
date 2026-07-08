import { Button } from './ui/Button';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPage }: Props) {
  return (
    <div className="pagination">
      <span className="pagination__info">
        {total} booking{total === 1 ? '' : 's'} · page {page} of {Math.max(totalPages, 1)}
      </span>
      <div className="pagination__controls">
        <Button variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

