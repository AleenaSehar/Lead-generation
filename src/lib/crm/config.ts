import { CrmProviderType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { CrmProvider } from "@/lib/crm/provider";
import { MockCrmProvider } from "@/lib/crm/mock-provider";
import { HubSpotCrmProvider } from "@/lib/crm/hubspot-provider";
export function getCrmProvider(type: CrmProviderType): CrmProvider {
  if (type === CrmProviderType.MOCK) return new MockCrmProvider();
  if (type === CrmProviderType.HUBSPOT) { const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim(); if (!token) throw new ApiError(503, "HUBSPOT_NOT_CONFIGURED", "Add HUBSPOT_ACCESS_TOKEN to the server environment before enabling HubSpot."); return new HubSpotCrmProvider(token); }
  throw new ApiError(503, "CRM_PROVIDER_DISABLED", "This CRM provider is not configured yet.");
}
