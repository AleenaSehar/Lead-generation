import type { LeadInsight, LeadInsightContext, LeadInsightProvider } from "@/lib/ai/provider";
import { leadInsightSchema } from "@/lib/ai/validation";

type Fetcher = typeof fetch;

export class GroqProviderError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean) {
    super(message);
    this.name = "GroqProviderError";
  }
}

function buildPrompt(context: LeadInsightContext) {
  const name = [context.firstName, context.lastName].filter(Boolean).join(" ") || context.email || "Unknown";
  const lines = [
    `Name: ${name}`,
    `Email: ${context.email ?? "unknown"}`,
    `Job title: ${context.jobTitle ?? "unknown"}`,
    `Company: ${context.companyName ?? "unknown"}`,
    `Company domain: ${context.companyDomain ?? "unknown"}`,
    `Status: ${context.status}`,
    `Source: ${context.source}`,
    `Rule-based score: ${context.score}`,
    `Score details: ${JSON.stringify(context.scoreDetails ?? null)}`,
    `Consent recorded: ${context.consentAt ? context.consentAt.toISOString() : "no"}`,
    `Last activity: ${context.lastActivityAt ? context.lastActivityAt.toISOString() : "none"}`,
  ];
  return lines.join("\n");
}

export class GroqLeadInsightProvider implements LeadInsightProvider {
  readonly name = "groq";
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";

  constructor(private readonly apiKey: string, private readonly fetcher: Fetcher = fetch) {}

  async generateInsight(context: LeadInsightContext): Promise<LeadInsight> {
    const response = await this.fetcher(this.baseUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a B2B sales analyst. Given a lead's profile, respond with strict JSON only: {\"fitScore\": integer 0-100, \"summary\": string, \"reasons\": array of 1 to 5 strings grounded in the given data, \"nextAction\": string}.",
          },
          { role: "user", content: buildPrompt(context) },
        ],
      }),
    });

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new GroqProviderError(
        retryable
          ? `Groq is temporarily unavailable (${response.status}). Retry later.`
          : `Groq rejected the request (${response.status}). Check the API key and model access.`,
        response.status,
        retryable,
      );
    }

    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new GroqProviderError("Groq returned an unexpected response shape.", 502, true);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new GroqProviderError("Groq returned malformed JSON.", 502, true);
    }

    const result = leadInsightSchema.safeParse(parsed);
    if (!result.success) {
      throw new GroqProviderError("Groq's response failed schema validation.", 502, true);
    }

    return result.data;
  }
}
