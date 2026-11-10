import { useState } from 'react';
import { SLOTS } from '../constants';
import { todayString } from '../dateUtils';
import { validateReading } from '../validation';

// Used both for adding a new reading and for editing an existing one.
// `onSubmit` receives clean values and may throw; its message is shown to the user.
export default function ReadingForm({
  initial,
  defaultDate,
  onSubmit,
  onCancel,
  submitLabel = 'Save reading',
  today = todayString(),
}) {
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today);
  const [slot, setSlot] = useState(initial?.slot ?? '');
  const [value, setValue] = useState(initial ? String(initial.value) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validateReading({ date, slot, value }, today);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onSubmit(result.values);
      if (!initial) {
        setValue('');
        setSlot('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="reading-form" onSubmit={handleSubmit} noValidate>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        Time slot
        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option value="">Choose a slot</option>
          {SLOTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Glucose (mg/dl)
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="link" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
