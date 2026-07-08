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
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button
          className="btn btn--ghost"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
