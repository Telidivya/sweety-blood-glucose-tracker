import { useEffect, useState } from 'react';
import { api } from './api';

// Loads a report whenever the kind, date, refreshKey or patient changes.
export function useReport(kind, date, refreshKey, patientId) {
  const [state, setState] = useState({ report: null, error: '', loading: true });

  useEffect(() => {
    let cancelled = false; // ignore responses from outdated requests
    setState((s) => ({ ...s, loading: true, error: '' }));
    api
      .report(kind, date, patientId)
      .then((report) => !cancelled && setState({ report, error: '', loading: false }))
      .catch((err) => !cancelled && setState({ report: null, error: err.message, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [kind, date, refreshKey, patientId]);

  return state;
}
