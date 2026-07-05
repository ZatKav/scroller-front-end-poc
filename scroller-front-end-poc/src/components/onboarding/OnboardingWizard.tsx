'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferences } from '@/contexts/PreferencesContext';
import {
  BEDROOM_OPTIONS,
  MUST_HAVE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  type BedroomValue,
  type PropertyTypeValue,
  type SearchFilters,
} from '@/lib/search-filters';
import OnboardingChrome, { ONBOARDING_TOTAL_STEPS } from './OnboardingChrome';
import { ChoiceChip, FieldLabel, TextField } from './ui';

/** Where onboarding hands off once the buyer's feed is built. */
const FEED_ROUTE = '/listings';

/** Keep only digits so "£250,000" and "250000" both parse; empty -> null. */
function parseBudget(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : null;
}

function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** £-prefixed numeric field used for the budget step. */
function CurrencyField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mt-2">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-zelli-ink">
        £
      </span>
      <TextField
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className="pl-8"
        placeholder={placeholder}
        value={value ? formatThousands(value) : ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </div>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const { completeOnboarding } = usePreferences();

  const [step, setStep] = useState(1);

  // Draft answers — written to the preferences store only when onboarding
  // completes, so a mid-flow refresh simply restarts rather than persisting a
  // half-filled profile.
  const [locationInput, setLocationInput] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [flexibleLocation, setFlexibleLocation] = useState(false);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [bedrooms, setBedrooms] = useState<BedroomValue | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyTypeValue | null>(null);
  const [mustHaves, setMustHaves] = useState<string[]>([]);

  const goNext = () => setStep((current) => Math.min(current + 1, ONBOARDING_TOTAL_STEPS));

  const addLocation = (raw: string) => {
    const value = raw.trim();
    if (!value) {
      return;
    }
    setLocations((current) =>
      current.some((entry) => entry.toLowerCase() === value.toLowerCase())
        ? current
        : [...current, value],
    );
    setLocationInput('');
    setFlexibleLocation(false);
  };

  const removeLocation = (value: string) => {
    setLocations((current) => current.filter((entry) => entry !== value));
  };

  const toggleMustHave = (id: string) => {
    setMustHaves((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  const finish = () => {
    const finalFilters: SearchFilters = {
      locations: flexibleLocation ? [] : locations,
      flexibleLocation,
      minBudget: parseBudget(minBudget),
      maxBudget: parseBudget(maxBudget),
      bedrooms,
      propertyType,
      mustHaves,
    };
    completeOnboarding(finalFilters);
    router.push(FEED_ROUTE);
  };

  switch (step) {
    case 1:
      return (
        <OnboardingChrome
          step={1}
          title="Where are you looking?"
          subtitle="Add the areas, towns or postcodes you'd like to see homes from."
          primaryLabel="Continue"
          onPrimary={() => {
            addLocation(locationInput);
            goNext();
          }}
          secondaryLabel="I'm flexible"
          onSecondary={() => {
            setFlexibleLocation(true);
            setLocations([]);
            goNext();
          }}
        >
          <FieldLabel htmlFor="location">Area or postcode</FieldLabel>
          <TextField
            id="location"
            className="mt-2"
            autoComplete="off"
            placeholder="Try Redhill, Merstham, or RH1"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLocation(locationInput);
              }
            }}
          />
          {locations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => removeLocation(loc)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-zelli-accent bg-zelli-accent-soft px-4 text-sm font-bold text-zelli-accent focus:outline-none focus:ring-2 focus:ring-zelli-accent focus:ring-offset-2 focus:ring-offset-zelli-bg"
                  aria-label={`Remove ${loc}`}
                >
                  {loc}
                  <span aria-hidden className="text-base leading-none">
                    &times;
                  </span>
                </button>
              ))}
            </div>
          )}
        </OnboardingChrome>
      );

    case 2:
      return (
        <OnboardingChrome
          step={2}
          title="What's your budget?"
          subtitle="We'll use this to shape your feed. You can change it any time."
          primaryLabel="Continue"
          onPrimary={goNext}
          secondaryLabel="Skip for now"
          onSecondary={() => {
            setMinBudget('');
            setMaxBudget('');
            goNext();
          }}
        >
          <div className="space-y-5">
            <div>
              <FieldLabel htmlFor="minBudget">Minimum budget</FieldLabel>
              <CurrencyField
                id="minBudget"
                value={minBudget}
                onChange={setMinBudget}
                placeholder="250,000"
              />
            </div>
            <div>
              <FieldLabel htmlFor="maxBudget">Maximum budget</FieldLabel>
              <CurrencyField
                id="maxBudget"
                value={maxBudget}
                onChange={setMaxBudget}
                placeholder="425,000"
              />
            </div>
          </div>
        </OnboardingChrome>
      );

    case 3:
      return (
        <OnboardingChrome
          step={3}
          title="What kind of home are you after?"
          subtitle="Choose the basics so we can start with homes that make sense."
          primaryLabel="Continue"
          onPrimary={goNext}
          secondaryLabel="Skip for now"
          onSecondary={goNext}
        >
          <div className="space-y-8">
            <div>
              <FieldLabel>Bedrooms</FieldLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    selected={bedrooms === option.value}
                    onClick={() =>
                      setBedrooms((current) => (current === option.value ? null : option.value))
                    }
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Property type</FieldLabel>
              <div className="mt-3 flex flex-wrap gap-2">
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    selected={propertyType === option.value}
                    onClick={() =>
                      setPropertyType((current) =>
                        current === option.value ? null : option.value,
                      )
                    }
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          </div>
        </OnboardingChrome>
      );

    case 4:
    default:
      return (
        <OnboardingChrome
          step={4}
          title="What matters most?"
          subtitle="Pick a few things Zelli should look out for."
          primaryLabel="Build my feed"
          onPrimary={finish}
          secondaryLabel="Skip for now"
          onSecondary={finish}
        >
          <FieldLabel>Must haves</FieldLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {MUST_HAVE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.id}
                selected={mustHaves.includes(option.id)}
                onClick={() => toggleMustHave(option.id)}
              >
                {option.label}
              </ChoiceChip>
            ))}
          </div>
        </OnboardingChrome>
      );
  }
}
