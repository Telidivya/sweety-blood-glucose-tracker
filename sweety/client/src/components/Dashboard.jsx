import { useState } from 'react';
import { api } from '../api';
import { todayString } from '../dateUtils';
import DoctorsPanel from './DoctorsPanel';
import History from './History';
import ReadingForm from './ReadingForm';
import ReportPanel from './ReportPanel';
import TopBar from './TopBar';
import TrendChart from './TrendChart';

export default function Dashboard() {
  const today = todayString();
  const [date, setDate] = useState(today);
  // Bumped whenever a reading changes so reports, chart and history reload.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <>
      <TopBar />

      <main className="layout">
        <section className="panel" aria-labelledby="add-title">
          <h2 id="add-title">Add a reading</h2>
          <ReadingForm
            key={date}
            defaultDate={date}
            today={today}
            submitLabel="Save reading"
            onSubmit={async (values) => {
              await api.addReading(values);
              // Show the report for the date the user just logged.
              setDate(values.date);
              refresh();
            }}
          />
        </section>

        <div className="stack">
          <section className="panel date-picker">
            <label>
              Report date
              <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
          </section>
          <ReportPanel date={date} refreshKey={refreshKey} onChanged={refresh} />
        </div>

        <div className="wide">
          <TrendChart date={date} refreshKey={refreshKey} />
        </div>
        <div className="wide">
          <History refreshKey={refreshKey} />
        </div>
        <div className="wide">
          <DoctorsPanel />
        </div>
      </main>
    </>
  );
}
