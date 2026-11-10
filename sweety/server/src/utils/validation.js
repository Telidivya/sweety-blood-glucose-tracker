const { isValidDateString, isFuture } = require('./dateUtils');

const MIN_VALUE = 40;
const MAX_VALUE = 600;
const MAX_READINGS_PER_DAY = 4;

// key -> label shown to users
const SLOTS = {
  morning: 'Morning',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const SLOT_KEYS = Object.keys(SLOTS);
const ROLES = ['patient', 'doctor'];

const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  valueWhole: `Value must be a whole number between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  dateRequired: 'Please select a date.',
  dateInvalid: 'Please enter a valid date.',
  dateFuture: 'Date cannot be in the future.',
  slotInvalid: 'Please choose a time slot.',
  dailyLimit: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
};

function duplicateSlotMessage(slot) {
  const label = SLOTS[slot];
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

// Accepts numbers or numeric strings (form inputs send strings).
function parseValue(raw) {
  if (raw === undefined || raw === null) return { error: MESSAGES.valueRequired };
  if (typeof raw === 'string' && raw.trim() === '') {
    return { error: MESSAGES.valueRequired };
  }
  const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { error: MESSAGES.valueWhole };
  }
  if (num < MIN_VALUE || num > MAX_VALUE) return { error: MESSAGES.valueRange };
  return { value: num };
}

// Returns { values: { date, slot, value } } or { error: { field, message } }.
// "today" is passed in so the function stays pure and easy to test.
function validateReadingInput(body, today) {
  const { date, slot, value } = body || {};

  if (date === undefined || date === null || date === '') {
    return { error: { field: 'date', message: MESSAGES.dateRequired } };
  }
  if (!isValidDateString(date)) {
    return { error: { field: 'date', message: MESSAGES.dateInvalid } };
  }
  if (isFuture(date, today)) {
    return { error: { field: 'date', message: MESSAGES.dateFuture } };
  }
  if (!SLOT_KEYS.includes(slot)) {
    return { error: { field: 'slot', message: MESSAGES.slotInvalid } };
  }
  const parsed = parseValue(value);
  if (parsed.error) {
    return { error: { field: 'value', message: parsed.error } };
  }
  return { values: { date, slot, value: parsed.value } };
}

function validateRegistration({ name, email, password, role } = {}) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { field: 'name', message: 'Please enter your name.' };
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { field: 'email', message: 'Please enter a valid email address.' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { field: 'password', message: 'Password must be at least 8 characters.' };
  }
  if (password.length > 72) {
    // bcrypt ignores everything after 72 bytes
    return { field: 'password', message: 'Password must be 72 characters or fewer.' };
  }
  if (role !== undefined && !ROLES.includes(role)) {
    return { field: 'role', message: 'Please choose patient or doctor.' };
  }
  return null;
}

module.exports = {
  ROLES,
  MIN_VALUE,
  MAX_VALUE,
  MAX_READINGS_PER_DAY,
  SLOTS,
  SLOT_KEYS,
  MESSAGES,
  duplicateSlotMessage,
  validateReadingInput,
  validateRegistration,
};
