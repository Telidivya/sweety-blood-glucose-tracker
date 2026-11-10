import { useEffect, useState } from 'react';
import { api } from '../api';

// Patient view: choose which doctors can see my reports.
export default function DoctorsPanel() {
  const [doctors, setDoctors] = useState(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listDoctors()
      .then(({ data }) => setDoctors(data))
      .catch((err) => setError(err.message));
  }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const doctor = await api.addDoctor(email);
      setDoctors((list) => [...(list ?? []), doctor]);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doctor) => {
    if (!window.confirm(`Stop sharing your reports with ${doctor.name}?`)) return;
    try {
      await api.removeDoctor(doctor.id);
      setDoctors((list) => list.filter((d) => d.id !== doctor.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="panel" aria-labelledby="doctors-title">
      <h2 id="doctors-title">My doctors</h2>
      <p className="range">Doctors you add can view your reports (read-only). You can remove them at any time.</p>

      {doctors && doctors.length === 0 && <p className="empty">You haven’t shared your reports with anyone.</p>}
      {doctors && doctors.length > 0 && (
        <ul className="reading-list">
          {doctors.map((d) => (
            <li key={d.id}>
              <span className="slot">
                {d.name} <small>{d.email}</small>
              </span>
              <span />
              <span className="row-actions">
                <button className="link danger" onClick={() => remove(d)}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form className="inline-form" onSubmit={add} noValidate>
        <label>
          Doctor’s email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={busy}>
          Share my reports
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
