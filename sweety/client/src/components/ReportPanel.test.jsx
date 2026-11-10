import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ReportPanel from './ReportPanel';

vi.mock('../api', () => ({ api: { report: vi.fn(), updateReading: vi.fn(), deleteReading: vi.fn() } }));
import { api } from '../api';

const report = {
  range: { from: '2026-10-15', to: '2026-10-15' },
  count: 2,
  highest: 160,
  lowest: 100,
  average: 130,
  readings: [
    { id: 1, date: '2026-10-15', slot: 'morning', slotLabel: 'Morning', value: 100 },
    { id: 2, date: '2026-10-15', slot: 'after_lunch', slotLabel: 'After lunch', value: 160 },
  ],
};

beforeEach(() => {
  api.report.mockReset();
  api.report.mockResolvedValue(report);
});

describe('ReportPanel', () => {
  test('patients can edit and delete their readings', async () => {
    render(<ReportPanel date="2026-10-15" refreshKey={0} onChanged={() => {}} />);
    expect(await screen.findByText('After lunch')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
    expect(api.report).toHaveBeenCalledWith('daily', '2026-10-15', undefined);
  });

  test('doctors see the same report but cannot edit or delete', async () => {
    render(<ReportPanel date="2026-10-15" refreshKey={0} patientId={7} readOnly />);
    expect(await screen.findByText('After lunch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    // the report is requested for the selected patient
    expect(api.report).toHaveBeenCalledWith('daily', '2026-10-15', 7);
  });

  test('shows the summary numbers', async () => {
    render(<ReportPanel date="2026-10-15" refreshKey={0} onChanged={() => {}} />);
    expect(await screen.findByText('Highest')).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
  });

  test('shows a friendly empty state', async () => {
    api.report.mockResolvedValue({
      range: report.range, count: 0, highest: null, lowest: null, average: null, readings: [],
    });
    render(<ReportPanel date="2026-10-15" refreshKey={0} onChanged={() => {}} />);
    expect(await screen.findByText(/No readings for this period yet/)).toBeInTheDocument();
  });
});
