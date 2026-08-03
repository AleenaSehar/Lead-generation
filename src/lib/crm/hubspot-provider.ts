import type { CrmContactPayload, CrmProvider, CrmUpsertResult } from "@/lib/crm/provider";

type Fetcher = typeof fetch;
type HubSpotRecord = { id?: unknown };
type HubSpotBatchResponse = { results?: HubSpotRecord[] };

export class HubSpotProviderError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean, public readonly retryAfterMs: number | null) { super(message); this.name = "HubSpotProviderError"; }
}

export class HubSpotCrmProvider implements CrmProvider {
  readonly name = "hubspot";
  private readonly baseUrl = "https://api.hubapi.com/crm/objects/2026-03/contacts";
  constructor(private readonly accessToken: string, private readonly fetcher: Fetcher = fetch) {}

  private async request(path: string, init: RequestInit) {
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json", ...init.headers } });
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : null;
      const retryable = response.status === 429 || response.status >= 500;
      throw new HubSpotProviderError(retryable ? `HubSpot is temporarily unavailable (${response.status}). Retry later.` : `HubSpot rejected the request (${response.status}). Check the access token, scopes, and field mappings.`, response.status, retryable, retryAfterMs);
    }
    return response.status === 204 ? null : response.json();
  }

  async testConnection() { await this.request("?limit=1&properties=email", { method: "GET" }); return { ok: true as const, provider: this.name }; }

  async upsertContact(input: { payload: CrmContactPayload; existingExternalId?: string; idempotencyKey: string }): Promise<CrmUpsertResult> {
    const properties = Object.fromEntries(Object.entries(input.payload).filter(([, value]) => value !== null).map(([key, value]) => [key, String(value)]));
    if (input.existingExternalId) {
      const result = await this.request(`/${encodeURIComponent(input.existingExternalId)}`, { method: "PATCH", body: JSON.stringify({ properties }) }) as HubSpotRecord;
      if (typeof result?.id !== "string") throw new HubSpotProviderError("HubSpot returned an invalid contact response.", 502, true, null);
      return { externalId: result.id, operation: "updated", acceptedAt: new Date(), provider: this.name };
    }
    const emailEntry = Object.entries(properties).find(([key]) => key === "email");
    if (!emailEntry?.[1]) throw new HubSpotProviderError("The HubSpot mapping must include the email property.", 400, false, null);
    const result = await this.request("/batch/upsert", { method: "POST", body: JSON.stringify({ inputs: [{ idProperty: "email", id: emailEntry[1], properties }] }) }) as HubSpotBatchResponse;
    const externalId = result?.results?.[0]?.id;
    if (typeof externalId !== "string") throw new HubSpotProviderError("HubSpot returned an invalid upsert response.", 502, true, null);
    return { externalId, operation: "upserted", acceptedAt: new Date(), provider: this.name };
  }
}
