import { useState } from 'react';
import { api } from '../api';
import { formatRange } from '../dateUtils';
import { useReport } from '../useReport';
import ReadingForm from './ReadingForm';

const TABS = [
  { kind: 'daily', label: 'Daily' },
  { kind: 'month-to-date', label: 'Month to date' },
  { kind: 'monthly', label: 'Previous month' },
];

function Stat({ label, value, unit }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>
        {value ?? '–'}
        {value !== null && unit && <small> {unit}</small>}
      </dd>
    </div>
  );
}

function DailyReadings({ readings, onChanged, readOnly }) {
  const [editingId, setEditingId] = useState(null);

  const remove = async (reading) => {
    if (!window.confirm(`Delete the ${reading.slotLabel} reading of ${reading.value} mg/dl?`)) return;
    try {
      await api.deleteReading(reading.id);
      onChanged();
    } catch (err) {
      window.alert(err.message);
    }
  };

  return (
    <ul className="reading-list">
      {readings.map((r) => (
        <li key={r.id}>
          {editingId === r.id ? (
            <ReadingForm
              initial={r}
              submitLabel="Save changes"
              onCancel={() => setEditingId(null)}
              onSubmit={async (values) => {
                await api.updateReading(r.id, values);
                setEditingId(null);
                onChanged();
              }}
            />
          ) : (
            <>
              <span className="slot">{r.slotLabel}</span>
              <span className="value">
                {r.value} <small>mg/dl</small>
              </span>
              {!readOnly && (
                <span className="row-actions">
                  <button className="link" onClick={() => setEditingId(r.id)}>
                    Edit
                  </button>
                  <button className="link danger" onClick={() => remove(r)}>
                    Delete
                  </button>
                </span>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// `patientId` + `readOnly` are used by doctors: they view, but never change, a patient's data.
export default function ReportPanel({ date, refreshKey, onChanged, patientId, readOnly = false }) {
  const [kind, setKind] = useState('daily');
  const { report, error, loading } = useReport(kind, date, refreshKey, patientId);

  return (
    <section className="panel" aria-labelledby="report-title">
      <h2 id="report-title">Reports</h2>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            role="tab"
            aria-selected={kind === tab.kind}
            className={kind === tab.kind ? 'tab active' : 'tab'}
            onClick={() => setKind(tab.kind)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {report && (
        <div className={loading ? 'report stale' : 'report'}>
          <p className="range">{formatRange(report.range)}</p>

          {report.count === 0 ? (
            <p className="empty">
              {readOnly
                ? 'No readings for this period.'
                : 'No readings for this period yet. Add a reading and your report will show up here.'}
            </p>
          ) : (
            <>
              <dl className="stats">
                <Stat label="Highest" value={report.highest} unit="mg/dl" />
                <Stat label="Lowest" value={report.lowest} unit="mg/dl" />
                <Stat label="Average" value={report.average} unit="mg/dl" />
                <Stat label="Readings" value={report.count} />
              </dl>
              {kind === 'daily' && (
                <DailyReadings readings={report.readings} onChanged={onChanged} readOnly={readOnly} />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
