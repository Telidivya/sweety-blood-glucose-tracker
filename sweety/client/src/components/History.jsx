import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatDate } from '../dateUtils';

const PAGE_SIZE = 10;

// All readings, newest first, using the paginated GET /readings endpoint.
export default function History({ refreshKey }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listReadings({ page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        // If the last row on this page was deleted, step back one page.
        if (data.data.length === 0 && page > 1) setPage(page - 1);
        else setResult(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  return (
    <section className="panel" aria-labelledby="history-title">
      <h2 id="history-title">All readings</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && result.total === 0 && (
        <p className="empty">Nothing logged yet. Your first reading will appear here.</p>
      )}
      {result && result.total > 0 && (
        <>
          <table className="history">
            <thead>
              <tr>
                <th>Date</th>
                <th>Slot</th>
                <th className="num">mg/dl</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.slotLabel}</td>
                  <td className="num">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <nav className="pager" aria-label="Pagination">
            <button className="link" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <button
              className="link"
              disabled={page >= result.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
