const {
  validateReadingInput,
  validateRegistration,
  duplicateSlotMessage,
  MESSAGES,
} = require('../src/utils/validation');

const TODAY = '2026-10-15';
const valid = { date: '2026-10-15', slot: 'morning', value: 110 };
const errorOf = (body) => validateReadingInput(body, TODAY).error;

describe('validateReadingInput', () => {
  test('accepts a valid reading', () => {
    expect(validateReadingInput(valid, TODAY)).toEqual({ values: valid });
  });

  test('accepts the boundary values 40 and 600', () => {
    expect(validateReadingInput({ ...valid, value: 40 }, TODAY).values.value).toBe(40);
    expect(validateReadingInput({ ...valid, value: 600 }, TODAY).values.value).toBe(600);
  });

  test('accepts a numeric string and converts it to a number', () => {
    expect(validateReadingInput({ ...valid, value: '125' }, TODAY).values.value).toBe(125);
  });

  test.each([undefined, null, '', '   '])('requires a value (%p)', (value) => {
    expect(errorOf({ ...valid, value })).toEqual({
      field: 'value',
      message: 'Please enter a glucose value.',
    });
  });

  test.each([39, 601, 0, -50])('rejects out-of-range value %p', (value) => {
    expect(errorOf({ ...valid, value }).message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test.each([100.5, 'abc', NaN])('rejects a non-whole number %p', (value) => {
    expect(errorOf({ ...valid, value })).toEqual({ field: 'value', message: MESSAGES.valueWhole });
  });

  test('rejects a future date', () => {
    expect(errorOf({ ...valid, date: '2026-10-16' })).toEqual({
      field: 'date',
      message: 'Date cannot be in the future.',
    });
  });

  test('rejects a missing or invalid date', () => {
    expect(errorOf({ ...valid, date: undefined }).field).toBe('date');
    expect(errorOf({ ...valid, date: '2026-02-31' }).message).toBe(MESSAGES.dateInvalid);
  });

  test('rejects an unknown slot', () => {
    expect(errorOf({ ...valid, slot: 'midnight' }).field).toBe('slot');
    expect(errorOf({ ...valid, slot: undefined }).field).toBe('slot');
  });

  test('handles a missing body', () => {
    expect(validateReadingInput(undefined, TODAY).error.field).toBe('date');
  });
});

describe('duplicateSlotMessage', () => {
  test('matches the expected wording', () => {
    expect(duplicateSlotMessage('after_lunch')).toBe(
      'You already have an After lunch reading for this date.'
    );
    expect(duplicateSlotMessage('morning')).toBe('You already have a Morning reading for this date.');
  });
});

describe('validateRegistration', () => {
  const ok = { name: 'Asha', email: 'asha@example.com', password: 'longenough1' };

  test('accepts valid details', () => {
    expect(validateRegistration(ok)).toBeNull();
  });

  test('accepts patient and doctor roles, rejects anything else', () => {
    expect(validateRegistration({ ...ok, role: 'doctor' })).toBeNull();
    expect(validateRegistration({ ...ok, role: 'patient' })).toBeNull();
    expect(validateRegistration({ ...ok, role: 'admin' }).field).toBe('role');
  });

  test('rejects bad name, email and password', () => {
    expect(validateRegistration({ ...ok, name: '  ' }).field).toBe('name');
    expect(validateRegistration({ ...ok, email: 'nope' }).field).toBe('email');
    expect(validateRegistration({ ...ok, password: 'short' }).field).toBe('password');
  });
});
