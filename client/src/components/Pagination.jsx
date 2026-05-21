import './Pagination.css';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function buildPages(current, total) {
  if (total <= 7) return range(1, total);

  const pages = new Set([1, total]);
  for (const p of range(Math.max(1, current - 1), Math.min(total, current + 1))) pages.add(p);
  if (current <= 3) for (const p of range(1, 4)) pages.add(p);
  if (current >= total - 2) for (const p of range(total - 3, total)) pages.add(p);

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) out.push('…');
  }
  return out;
}

export default function Pagination({ page = 1, pages = 1, onChange }) {
  if (pages <= 1) return null;

  const items = buildPages(page, pages);

  return (
    <div className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange?.(page - 1)}
        disabled={page <= 1}
      >
        ←
      </button>

      {items.map((it, idx) =>
        it === '…' ? (
          <span key={`e-${idx}`} className="pagination__ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            className={it === page ? 'pagination__btn pagination__btn--active' : 'pagination__btn'}
            onClick={() => onChange?.(it)}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        className="pagination__btn"
        onClick={() => onChange?.(page + 1)}
        disabled={page >= pages}
      >
        →
      </button>
    </div>
  );
}
