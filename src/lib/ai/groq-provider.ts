import { leadInsightResultSchema } from "@/lib/ai/validation";
import type { LeadInsightInput, LeadInsightProvider, LeadInsightResult } from "@/lib/ai/provider";

type Fetcher = typeof fetch;

export class GroqProviderError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryable: boolean) {
    super(message);
    this.name = "GroqProviderError";
  }
}

const SYSTEM_PROMPT = `You are a B2B sales qualification assistant. Given a lead's available profile fields,
return ONLY a JSON object with this exact shape:
{"fitScore": <integer 0-100>, "summary": "<one sentence>", "reasons": ["<short reason>", ...up to 5], "nextAction": "<one short sentence>"}

Rules:
- fitScore reflects how likely this lead is to convert, based only on the fields given. Do not invent facts not present in the input.
- Missing fields are meaningful signal (e.g. no job title, no consent) — reflect that in the score and reasons.
- reasons must be 1 to 5 short, concrete bullet points grounded in the given fields.
- Return raw JSON only. No markdown, no commentary, no code fences.`;

export class GroqLeadInsightProvider implements LeadInsightProvider {
  readonly name = "groq";
  private readonly baseUrl = "https://api.groq.com/openai/v1/chat/completions";
  private readonly model = "openai/gpt-oss-20b";

  constructor(private readonly apiKey: string, private readonly fetcher: Fetcher = fetch) {}

  async generate(input: LeadInsightInput): Promise<LeadInsightResult> {
    const response = await this.fetcher(this.baseUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new GroqProviderError(retryable ? `Groq is temporarily unavailable (${response.status}). Retry later.` : `Groq rejected the request (${response.status}). Check GROQ_API_KEY.`, response.status, retryable);
    }

    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new GroqProviderError("Groq returned an empty response.", 502, true);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      throw new GroqProviderError("Groq returned a response that was not valid JSON.", 502, true);
    }

    const result = leadInsightResultSchema.safeParse(parsedJson);
    if (!result.success) throw new GroqProviderError("Groq returned a response that did not match the expected insight schema.", 502, true);
    return result.data;
  }
}
