import { describe, expect, it, vi } from "vitest";
import { HubSpotCrmProvider, HubSpotProviderError } from "@/lib/crm/hubspot-provider";

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

describe("HubSpot CRM provider", () => {
  it("tests the connection without exposing the access token", async () => {
    const fetcher = vi.fn(async () => json({ results: [] }));
    const provider = new HubSpotCrmProvider("server-secret", fetcher as typeof fetch);
    await expect(provider.testConnection()).resolves.toEqual({ ok: true, provider: "hubspot" });
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("?limit=1&properties=email"), expect.objectContaining({ method: "GET", headers: expect.objectContaining({ Authorization: "Bearer server-secret" }) }));
  });

  it("upserts a new contact by email and omits null properties", async () => {
    const fetcher = vi.fn(async () => json({ results: [{ id: "123" }] }));
    const provider = new HubSpotCrmProvider("token", fetcher as typeof fetch);
    const result = await provider.upsertContact({ payload: { email: "maya@example.com", firstname: "Maya", score: 20, phone: null }, idempotencyKey: "local-key" });
    expect(result).toMatchObject({ externalId: "123", operation: "upserted", provider: "hubspot" });
    const [, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request?.body))).toEqual({ inputs: [{ idProperty: "email", id: "maya@example.com", properties: { email: "maya@example.com", firstname: "Maya", score: "20" } }] });
  });

  it("updates the already-linked HubSpot contact", async () => {
    const fetcher = vi.fn(async () => json({ id: "456" }));
    const provider = new HubSpotCrmProvider("token", fetcher as typeof fetch);
    await expect(provider.upsertContact({ payload: { email: "maya@example.com" }, existingExternalId: "456", idempotencyKey: "local-key" })).resolves.toMatchObject({ externalId: "456", operation: "updated" });
    expect(fetcher).toHaveBeenCalledWith(expect.stringMatching(/contacts\/456$/), expect.objectContaining({ method: "PATCH" }));
  });

  it("classifies authentication and rate-limit failures safely", async () => {
    const unauthorized = new HubSpotCrmProvider("bad", vi.fn(async () => json({}, 401)) as unknown as typeof fetch);
    await expect(unauthorized.testConnection()).rejects.toMatchObject({ status: 401, retryable: false } satisfies Partial<HubSpotProviderError>);
    const limited = new HubSpotCrmProvider("token", vi.fn(async () => json({}, 429, { "Retry-After": "3" })) as unknown as typeof fetch);
    await expect(limited.testConnection()).rejects.toMatchObject({ status: 429, retryable: true, retryAfterMs: 3000 } satisfies Partial<HubSpotProviderError>);
  });

  it("rejects malformed provider responses", async () => {
    const provider = new HubSpotCrmProvider("token", vi.fn(async () => json({ results: [] })) as unknown as typeof fetch);
    await expect(provider.upsertContact({ payload: { email: "maya@example.com" }, idempotencyKey: "local-key" })).rejects.toMatchObject({ status: 502, retryable: true });
  });
});
