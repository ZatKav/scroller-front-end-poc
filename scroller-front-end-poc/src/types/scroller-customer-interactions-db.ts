import type { ListingDetail } from '@/types/enrichment-db';

export interface CustomerImageInteractionCreate {
  customer_id: number;
  image_id: number;
  action: 0 | 1;
  view_duration_ms?: number;
}

export interface CustomerImageInteraction extends Omit<CustomerImageInteractionCreate, 'view_duration_ms'> {
  id: number;
  view_duration_ms: number | null;
  viewed_at: string;
}

// action: 0 = skip, 1 = save/like, 2 = maybe. NOTE: the scroller-customer-
// interactions-db backend must accept 2 as well (Pydantic Field le, the
// `action IN (0, 1)` DB check constraint, and the generated client) before a
// Maybe reaches persistence — otherwise the create call 422s / fails the check.
export interface CustomerListingInteractionCreate {
  customer_id: number;
  listing_id: number;
  action: 0 | 1 | 2;
  view_duration_ms?: number;
}

export interface CustomerListingInteraction extends Omit<CustomerListingInteractionCreate, 'view_duration_ms'> {
  id: number;
  view_duration_ms: number | null;
  viewed_at: string;
}

export interface StackRankImage {
  id: number;
  listing_id?: number | null;
  image_data: string | null;
  image_summary: string | null;
  final_score?: number | null;
  selection_reason?: string | null;
}

export type StackRankProfileWeights = Record<string, number>;

export interface StackRankResponse {
  images: StackRankImage[];
  profile_weights: StackRankProfileWeights;
}

export interface ListingStackRankResponse {
  listings: ListingDetail[];
  profile_weights: StackRankProfileWeights;
}
