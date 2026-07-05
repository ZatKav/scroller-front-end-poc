// Search preferences captured by the onboarding flow. For now these live only in
// the app layer (see PreferencesContext, mirrored to localStorage); later they
// can be persisted to a preferences service without changing this shape.

export type BedroomValue = 'studio' | '1' | '2' | '3' | '4';
export type PropertyTypeValue = 'house' | 'flat' | 'bungalow' | 'maisonette' | 'any';

export interface SearchFilters {
  /** Free-text areas, towns or postcodes the buyer wants to see homes from. */
  locations: string[];
  /** Set when the buyer taps "I'm flexible" instead of naming areas. */
  flexibleLocation: boolean;
  /** Minimum budget in GBP, or null if not set / skipped. */
  minBudget: number | null;
  /** Maximum budget in GBP, or null if not set / skipped. */
  maxBudget: number | null;
  /** Minimum bedrooms, or null if skipped. */
  bedrooms: BedroomValue | null;
  /** Preferred property type, or null if skipped. */
  propertyType: PropertyTypeValue | null;
  /** "Must have" feature ids the buyer cares about (see MUST_HAVE_OPTIONS). */
  mustHaves: string[];
}

export const EMPTY_FILTERS: SearchFilters = {
  locations: [],
  flexibleLocation: false,
  minBudget: null,
  maxBudget: null,
  bedrooms: null,
  propertyType: null,
  mustHaves: [],
};

export const BEDROOM_OPTIONS: ReadonlyArray<{ value: BedroomValue; label: string }> = [
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];

export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{ value: PropertyTypeValue; label: string }> = [
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'maisonette', label: 'Maisonette' },
  { value: 'any', label: 'Anything' },
];

// Ids are stable keys; labels are what the buyer sees. Kept as ids so the set a
// buyer picks survives copy changes and can be matched by a future service.
export const MUST_HAVE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'garden', label: 'Garden' },
  { id: 'parking', label: 'Parking' },
  { id: 'near-station', label: 'Near station' },
  { id: 'good-schools', label: 'Good schools' },
  { id: 'no-chain', label: 'No chain' },
  { id: 'modern-interior', label: 'Modern interior' },
  { id: 'period-features', label: 'Period features' },
  { id: 'project-potential', label: 'Project potential' },
  { id: 'home-office', label: 'Home office' },
  { id: 'quiet-road', label: 'Quiet road' },
  { id: 'pet-friendly', label: 'Pet friendly' },
];
