import { useEffect, useState } from 'react';
import { api } from '../api';
import { todayString } from '../dateUtils';
import ReportPanel from './ReportPanel';
import TopBar from './TopBar';
import TrendChart from './TrendChart';

// Doctor view: pick a patient who shared their reports and read them (read-only).
export default function DoctorDashboard() {
  const today = todayString();
  const [patients, setPatients] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listPatients()
      .then(({ data }) => {
        setPatients(data);
        if (data.length > 0) setPatientId(data[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  const patient = patients?.find((p) => p.id === patientId);

  return (
    <>
      <TopBar />
      <main className="layout">
        <section className="panel" aria-labelledby="patients-title">
          <h2 id="patients-title">My patients</h2>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {patients && patients.length === 0 && (
            <p className="empty">
              No patients have shared their reports with you yet. Ask a patient to add your email under
              “My doctors”.
            </p>
          )}
          {patients && patients.length > 0 && (
            <ul className="patient-list">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    className={p.id === patientId ? 'patient active' : 'patient'}
                    aria-pressed={p.id === patientId}
                    onClick={() => setPatientId(p.id)}
                  >
                    <strong>{p.name}</strong>
                    <small>{p.email}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {patient ? (
          <div className="stack">
            <section className="panel date-picker">
              <label>
                Report date for {patient.name}
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                />
              </label>
            </section>
            <ReportPanel date={date} refreshKey={0} patientId={patient.id} readOnly />
          </div>
        ) : (
          <div />
        )}

        {patient && (
          <div className="wide">
            <TrendChart date={date} refreshKey={0} patientId={patient.id} />
          </div>
        )}
      </main>
    </>
  );
}
