export interface CustomerImageInteractionRecord {
  id: number;
  customer_id: number;
  image_id: number;
  action: 0 | 1;
  view_duration_ms: number | null;
  viewed_at: string;
}

interface WaitForNewInteractionParams {
  customerId: number;
  expectedAction: 0 | 1;
  knownIds: Set<number>;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

function getInteractionsDbConfig(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL;
  const apiKey = process.env.SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY;

  if (!baseUrl) {
    throw new Error('SCROLLER_CUSTOMER_INTERACTIONS_DB_BASE_URL must be set for Playwright DB verification.');
  }

  if (!apiKey) {
    throw new Error('SCROLLER_CUSTOMER_INTERACTIONS_DB_API_KEY must be set for Playwright DB verification.');
  }

  return { baseUrl, apiKey };
}

export async function getCustomerImageInteractions(
  customerId: number,
): Promise<CustomerImageInteractionRecord[]> {
  const { baseUrl, apiKey } = getInteractionsDbConfig();
  const url = `${baseUrl.replace(/\/$/, '')}/api/customer-image-interactions/${customerId}?skip=0&limit=100`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to fetch customer interactions (${response.status}): ${responseText || response.statusText}`,
    );
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Customer interactions API returned a non-array payload.');
  }

  return data as CustomerImageInteractionRecord[];
}

function isNonNullInteger(value: number | null): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export async function waitForNewInteraction({
  customerId,
  expectedAction,
  knownIds,
  timeoutMs = 15000,
  pollIntervalMs = 300,
}: WaitForNewInteractionParams): Promise<CustomerImageInteractionRecord> {
  const startMs = Date.now();

  while (Date.now() - startMs < timeoutMs) {
    const interactions = await getCustomerImageInteractions(customerId);
    const created = interactions.find(
      (interaction) => !knownIds.has(interaction.id) && interaction.action === expectedAction,
    );

    if (created && isNonNullInteger(created.view_duration_ms)) {
      return created;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for new action=${expectedAction} interaction with non-null integer view_duration_ms for customer ${customerId}.`,
  );
}
