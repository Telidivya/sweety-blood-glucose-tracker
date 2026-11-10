import { MIN_VALUE, MAX_VALUE } from './constants';

// Mirrors the server rules so mistakes are caught before a network round trip.
// The server remains the source of truth (it also checks duplicates and the
// 4-per-day limit, which need the database).
export function validateReading({ date, slot, value }, today) {
  if (!date) return { error: { field: 'date', message: 'Please select a date.' } };
  if (date > today) return { error: { field: 'date', message: 'Date cannot be in the future.' } };
  if (!slot) return { error: { field: 'slot', message: 'Please choose a time slot.' } };

  const text = String(value ?? '').trim();
  if (text === '') {
    return { error: { field: 'value', message: 'Please enter a glucose value.' } };
  }
  const num = Number(text);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      error: {
        field: 'value',
        message: `Value must be a whole number between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
      },
    };
  }
  if (num < MIN_VALUE || num > MAX_VALUE) {
    return {
      error: {
        field: 'value',
        message: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
      },
    };
  }
  return { values: { date, slot, value: num } };
}
