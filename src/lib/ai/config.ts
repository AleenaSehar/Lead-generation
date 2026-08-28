import { ApiError } from "@/lib/api/errors";
import type { LeadInsightProvider } from "@/lib/ai/provider";
import { MockLeadInsightProvider } from "@/lib/ai/mock-provider";
import { GroqLeadInsightProvider } from "@/lib/ai/groq-provider";

export function getLeadInsightProvider(): LeadInsightProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockLeadInsightProvider();
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new ApiError(503, "AI_PROVIDER_NOT_CONFIGURED", "Add GROQ_API_KEY to the server environment before enabling the groq AI provider.");
    return new GroqLeadInsightProvider(apiKey);
  }
  throw new ApiError(503, "AI_PROVIDER_DISABLED", `AI provider "${provider}" is not enabled.`);
}
