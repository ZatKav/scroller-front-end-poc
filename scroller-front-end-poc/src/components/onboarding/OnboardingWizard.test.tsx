import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import type { SearchFilters } from '@/lib/search-filters';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockCompleteOnboarding = jest.fn();
const mockDeleteListingInteractions =
  scrollerCustomerInteractionsDbApiClient.deleteCustomerListingInteractions as jest.Mock;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    deleteCustomerListingInteractions: jest.fn(),
  },
}));

async function advanceToFinalStep() {
  const user = userEvent.setup();

  await act(async () => {
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  });
  await act(async () => {
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  });
  await act(async () => {
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  });

  expect(screen.getByRole('heading', { name: 'What matters most?' })).toBeTruthy();
  return user;
}

beforeEach(() => {
  mockPush.mockClear();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 42 }, loading: false });
  mockCompleteOnboarding.mockReset();
  mockDeleteListingInteractions.mockReset();
  mockDeleteListingInteractions.mockResolvedValue({ deleted: 7 });
});

describe('OnboardingWizard', () => {
  it('clears listing interactions before completing onboarding and opening the feed', async () => {
    render(<OnboardingWizard />);
    const user = await advanceToFinalStep();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Build my feed' }));
    });

    await waitFor(() => expect(mockDeleteListingInteractions).toHaveBeenCalledWith(42));
    expect(mockCompleteOnboarding).toHaveBeenCalledWith({
      locations: [],
      flexibleLocation: false,
      minBudget: null,
      maxBudget: null,
      bedrooms: null,
      propertyType: null,
      mustHaves: [],
    } satisfies SearchFilters);
    expect(mockPush).toHaveBeenCalledWith('/listings');
    expect(
      mockDeleteListingInteractions.mock.invocationCallOrder[0],
    ).toBeLessThan(mockCompleteOnboarding.mock.invocationCallOrder[0]);
  });

  it('keeps the buyer on onboarding when listing interaction reset fails', async () => {
    mockDeleteListingInteractions.mockRejectedValueOnce(new Error('upstream unavailable'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(<OnboardingWizard />);
      const user = await advanceToFinalStep();

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Build my feed' }));
      });

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('Could not build your feed. Please try again.');
      expect(mockCompleteOnboarding).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
