import { CrmProviderType } from "@/generated/prisma/enums";
import { ApiError } from "@/lib/api/errors";
import type { CrmProvider } from "@/lib/crm/provider";
import { MockCrmProvider } from "@/lib/crm/mock-provider";
export function getCrmProvider(type: CrmProviderType): CrmProvider { if (type === CrmProviderType.MOCK) return new MockCrmProvider(); throw new ApiError(503, "CRM_PROVIDER_DISABLED", "This CRM provider is not configured yet."); }
