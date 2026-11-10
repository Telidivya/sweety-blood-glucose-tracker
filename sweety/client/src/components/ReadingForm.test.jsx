import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReadingForm from './ReadingForm';

const TODAY = '2026-10-15';

function setup(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<ReadingForm today={TODAY} defaultDate={TODAY} onSubmit={onSubmit} {...props} />);
  return { user, onSubmit };
}

const fill = async (user, { slot, value }) => {
  if (slot) await user.selectOptions(screen.getByLabelText('Time slot'), slot);
  if (value !== undefined) await user.type(screen.getByLabelText('Glucose (mg/dl)'), String(value));
};
const save = (user) => user.click(screen.getByRole('button', { name: 'Save reading' }));

describe('ReadingForm', () => {
  test('submits clean values when the input is valid', async () => {
    const { user, onSubmit } = setup();
    await fill(user, { slot: 'after_lunch', value: 132 });
    await save(user);

    expect(onSubmit).toHaveBeenCalledWith({ date: TODAY, slot: 'after_lunch', value: 132 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('clears the value field after a successful save', async () => {
    const { user } = setup();
    await fill(user, { slot: 'morning', value: 99 });
    await save(user);
    await waitFor(() => expect(screen.getByLabelText('Glucose (mg/dl)')).toHaveValue(''));
  });

  test('shows an error when the value is missing', async () => {
    const { user, onSubmit } = setup();
    await fill(user, { slot: 'morning' });
    await save(user);

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a glucose value.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each(['39', '601'])('shows a range error for %s', async (value) => {
    const { user, onSubmit } = setup();
    await fill(user, { slot: 'morning', value });
    await save(user);

    expect(screen.getByRole('alert')).toHaveTextContent('Value must be between 40 and 600 mg/dl.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows an error for a decimal value', async () => {
    const { user } = setup();
    await fill(user, { slot: 'morning', value: '100.5' });
    await save(user);
    expect(screen.getByRole('alert')).toHaveTextContent(/whole number/i);
  });

  test('shows an error when the date is in the future', async () => {
    const { user, onSubmit } = setup({ defaultDate: '2026-10-16' });
    await fill(user, { slot: 'morning', value: 100 });
    await save(user);

    expect(screen.getByRole('alert')).toHaveTextContent('Date cannot be in the future.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows the server message when saving fails (e.g. duplicate slot)', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('You already have an After lunch reading for this date.'));
    const { user } = setup({ onSubmit });
    await fill(user, { slot: 'after_lunch', value: 120 });
    await save(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You already have an After lunch reading for this date.'
    );
  });

  test('pre-fills the form when editing', () => {
    render(
      <ReadingForm
        today={TODAY}
        initial={{ date: '2026-10-10', slot: 'after_dinner', value: 140 }}
        submitLabel="Save changes"
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-10');
    expect(screen.getByLabelText('Time slot')).toHaveValue('after_dinner');
    expect(screen.getByLabelText('Glucose (mg/dl)')).toHaveValue('140');
  });
});
