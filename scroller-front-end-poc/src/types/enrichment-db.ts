// Minimal, deliberately loose shape for an enrichment-db listing detail.
// FE-2 only proxies the payload through; FE-3 / EDB-6 will firm this up once
// the ordered, fully-renderable detail contract (EDB-2) lands.
export interface ListingDetail {
  id: number;
  [key: string]: unknown;
}
