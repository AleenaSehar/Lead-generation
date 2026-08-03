import { createHash } from "node:crypto";
import type { CrmProvider } from "@/lib/crm/provider";

export class MockCrmProvider implements CrmProvider {
  readonly name = "mock";
  async testConnection() { return { ok: true as const, provider: this.name }; }
  async upsertContact(input: { payload: Record<string, string | number | null>; existingExternalId?: string; idempotencyKey: string }) {
    const externalId = input.existingExternalId ?? `mock_contact_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 16)}`;
    return { externalId, operation: input.existingExternalId ? "updated" as const : "created" as const, acceptedAt: new Date(), provider: this.name };
  }
}
