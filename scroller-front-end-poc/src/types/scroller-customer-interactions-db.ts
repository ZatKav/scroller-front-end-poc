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

export interface StackRankImage {
  id: number;
  image_data: string | null;
  image_summary: string | null;
}
