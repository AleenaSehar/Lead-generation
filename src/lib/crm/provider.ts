export type CrmContactPayload = Record<string, string | number | null>;
export type CrmUpsertResult = { externalId: string; operation: "created" | "updated" | "upserted"; acceptedAt: Date; provider: string };
export interface CrmProvider { readonly name: string; testConnection(): Promise<{ ok: true; provider: string }>; upsertContact(input: { payload: CrmContactPayload; existingExternalId?: string; idempotencyKey: string }): Promise<CrmUpsertResult>; }
