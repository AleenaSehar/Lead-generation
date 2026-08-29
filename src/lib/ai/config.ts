import { ApiError } from "@/lib/api/errors";
import { GroqLeadInsightProvider } from "@/lib/ai/groq-provider";
import { MockLeadInsightProvider } from "@/lib/ai/mock-provider";
import type { LeadInsightProvider } from "@/lib/ai/provider";

export function getLeadInsightProvider(): LeadInsightProvider {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  if (provider === "mock") return new MockLeadInsightProvider();
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new ApiError(503, "AI_PROVIDER_DISABLED", "Groq requires GROQ_API_KEY to be set.");
    return new GroqLeadInsightProvider(apiKey);
  }
  throw new ApiError(503, "AI_PROVIDER_DISABLED", `AI provider “${provider}” is not enabled.`);
}
