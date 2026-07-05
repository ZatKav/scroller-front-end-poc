'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EMPTY_FILTERS, type SearchFilters } from '@/lib/search-filters';

// Bump the version suffix if the persisted shape changes incompatibly so stale
// payloads are ignored rather than mis-parsed.
const STORAGE_KEY = 'zelli.preferences.v1';

interface PersistedPreferences {
  filters: SearchFilters;
  onboardingComplete: boolean;
}

interface PreferencesContextType {
  filters: SearchFilters;
  onboardingComplete: boolean;
  /** False until localStorage has been read on the client; guards SSR/first paint. */
  hydrated: boolean;
  updateFilters: (patch: Partial<SearchFilters>) => void;
  /** Merge any final answers, then mark onboarding done. */
  completeOnboarding: (finalFilters?: Partial<SearchFilters>) => void;
  resetOnboarding: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

function readPersisted(): PersistedPreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedPreferences>;
    return {
      // Spread over defaults so a payload written by an older build that is
      // missing a newer field still yields a complete SearchFilters object.
      filters: { ...EMPTY_FILTERS, ...(parsed.filters ?? {}) },
      onboardingComplete: Boolean(parsed.onboardingComplete),
    };
  } catch {
    return null;
  }
}

interface PreferencesProviderProps {
  children: ReactNode;
}

export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read persisted state once on mount. Until this runs, writes are suppressed
  // (see the guard below) so we never overwrite stored values with defaults.
  useEffect(() => {
    const persisted = readPersisted();
    if (persisted) {
      setFilters(persisted.filters);
      setOnboardingComplete(persisted.onboardingComplete);
    }
    setHydrated(true);
  }, []);

  // Mirror to localStorage on every change, but only after hydration so the
  // initial default render cannot clobber a returning visitor's saved answers.
  const hydratedRef = useRef(false);
  useEffect(() => {
    hydratedRef.current = hydrated;
  }, [hydrated]);

  useEffect(() => {
    if (!hydratedRef.current || typeof window === 'undefined') {
      return;
    }

    try {
      const payload: PersistedPreferences = { filters, onboardingComplete };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage can be unavailable (private mode / quota); preferences simply
      // stay in-memory for the session rather than crashing the app.
    }
  }, [filters, onboardingComplete]);

  const updateFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const completeOnboarding = useCallback((finalFilters?: Partial<SearchFilters>) => {
    if (finalFilters) {
      setFilters((current) => ({ ...current, ...finalFilters }));
    }
    setOnboardingComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setOnboardingComplete(false);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        filters,
        onboardingComplete,
        hydrated,
        updateFilters,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
