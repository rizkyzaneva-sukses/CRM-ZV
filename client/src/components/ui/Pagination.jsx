import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination Component
 * @param {number} page - halaman saat ini (1-indexed)
 * @param {number} totalPages - total halaman
 * @param {function} onPageChange - callback (newPage) => void
 * @param {number} total - total records (opsional, untuk info)
 * @param {number} pageSize - jumlah per halaman (opsional)
 */
export default function Pagination({ page, totalPages, onPageChange, total, pageSize }) {
  if (totalPages <= 1) return null;

  const getPageRange = () => {
    const delta = 2;
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    const range = [];
    for (let i = left; i <= right; i++) range.push(i);

    const result = [];
    if (left > 1) { result.push(1); if (left > 2) result.push('...'); }
    result.push(...range);
    if (right < totalPages) { if (right < totalPages - 1) result.push('...'); result.push(totalPages); }
    return result;
  };

  const from = (total != null && pageSize != null) ? (page - 1) * pageSize + 1 : null;
  const to   = (total != null && pageSize != null) ? Math.min(page * pageSize, total) : null;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-border">
      <div className="text-sm text-muted-foreground">
        {from != null ? (
          <span>
            Menampilkan <span className="font-medium text-foreground">{from}–{to}</span> dari{' '}
            <span className="font-medium text-foreground">{total.toLocaleString('id-ID')}</span> data
          </span>
        ) : (
          <span>Halaman <span className="font-medium text-foreground">{page}</span> dari <span className="font-medium text-foreground">{totalPages}</span></span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {getPageRange().map((p, idx) =>
          p === '...' ? (
            <span key={`e${idx}`} className="px-2 text-muted-foreground text-sm">…</span>
          ) : (
            <Button
              key={p} variant="ghost" size="sm"
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 p-0 text-sm ${
                p === page
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="ghost" size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
