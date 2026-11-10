import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AuthPage from './AuthPage';

const { register } = vi.hoisted(() => ({ register: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ login: vi.fn(), register }) }));

describe('AuthPage sign up', () => {
  test('registers as a patient by default', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(screen.getByRole('button', { name: 'I need an account' }));
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText(/Password/), 'longenough1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenLastCalledWith({
      name: 'Asha', email: 'asha@example.com', password: 'longenough1', role: 'patient',
    });
  });

  test('can register as a doctor', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await user.click(screen.getByRole('button', { name: 'I need an account' }));
    await user.click(screen.getByLabelText('Doctor'));
    await user.type(screen.getByLabelText('Name'), 'Dr Rao');
    await user.type(screen.getByLabelText('Email'), 'rao@example.com');
    await user.type(screen.getByLabelText(/Password/), 'longenough1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'doctor' }));
  });
});
