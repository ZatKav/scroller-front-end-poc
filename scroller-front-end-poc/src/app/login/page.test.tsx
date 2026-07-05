import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockUseAuth = jest.fn();
const mockUsePreferences = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => mockUsePreferences(),
}));

jest.mock('@/components/ZelliWordmark', () => function MockZelliWordmark() {
  return <div>Zelli</div>;
});

beforeEach(() => {
  mockReplace.mockClear();
  mockLogin.mockReset();
  mockLogin.mockResolvedValue(true);
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ login: mockLogin, user: null, loading: false });
  mockUsePreferences.mockReset();
  mockUsePreferences.mockReturnValue({ onboardingComplete: true, hydrated: true });
});

describe('LoginPage', () => {
  it('waits for preferences hydration before showing the sign-in form', () => {
    mockUsePreferences.mockReturnValue({ onboardingComplete: true, hydrated: false });

    render(<LoginPage />);

    expect(screen.getByText(/checking session/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('routes completed-onboarding users to listings after sign-in', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await act(async () => {
      await user.type(screen.getByLabelText('Username'), 'jack');
      await user.type(screen.getByLabelText('Password'), 'secret');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
    });

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('jack', 'secret'));
    expect(mockReplace).toHaveBeenCalledWith('/listings');
    expect(mockReplace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('does not redirect an authenticated user until preferences have hydrated', () => {
    mockUseAuth.mockReturnValue({ login: mockLogin, user: { id: 42 }, loading: false });
    mockUsePreferences.mockReturnValue({ onboardingComplete: false, hydrated: false });

    const { rerender } = render(<LoginPage />);

    expect(mockReplace).not.toHaveBeenCalled();

    mockUsePreferences.mockReturnValue({ onboardingComplete: true, hydrated: true });
    rerender(<LoginPage />);

    expect(mockReplace).toHaveBeenCalledWith('/listings');
    expect(mockReplace).not.toHaveBeenCalledWith('/onboarding');
  });
});
