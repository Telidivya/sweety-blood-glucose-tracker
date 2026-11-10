import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildChartData } from '../chartData';
import { SLOTS, SLOT_COLORS } from '../constants';
import { formatRange, formatShortDate } from '../dateUtils';
import { useReport } from '../useReport';

export default function TrendChart({ date, refreshKey, patientId }) {
  const { report, error } = useReport('month-to-date', date, refreshKey, patientId);
  const data = report ? buildChartData(report.readings) : [];

  return (
    <section className="panel" aria-labelledby="trend-title">
      <h2 id="trend-title">This month</h2>
      {report && <p className="range">{formatRange(report.range)}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {report && data.length === 0 ? (
        <p className="empty">Your chart appears once you log a reading this month.</p>
      ) : (
        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#dde3df" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tickMargin={8} />
              <YAxis domain={['dataMin - 20', 'dataMax + 20']} unit="" width={44} />
              <Tooltip labelFormatter={formatShortDate} formatter={(v) => `${v} mg/dl`} />
              <Legend />
              {SLOTS.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={SLOT_COLORS[s.key]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
