import { Button } from '../ui/Button';
import type { Pagination as PaginationData } from '../../lib/api.types';

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination?: PaginationData;
  onPageChange: (page: number) => void;
}) {
  if (!pagination) return null;
  const page = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  return (
    <nav aria-label="Navigasi halaman" className="pagination">
      <span>
        Halaman {page} dari {totalPages} · {pagination.total || 0} data
      </span>
      <div className="actions">
        <Button
          size="small"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>
        <Button
          size="small"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </nav>
  );
}
