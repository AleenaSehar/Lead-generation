import { describe, expect, it, vi } from "vitest";
import { GroqLeadInsightProvider, GroqProviderError } from "@/lib/ai/groq-provider";

const input = { firstName: "Jordan", lastName: null, jobTitle: "VP Sales", companyName: "Acme", companyDomain: "acme.test", source: "API", status: "NEW", ruleScore: 60, hasConsent: true };

function chatCompletion(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { "Content-Type": "application/json" } });
}

describe("Groq lead insight provider", () => {
  it("parses and validates a well-formed model response", async () => {
    const body = JSON.stringify({ fitScore: 82, summary: "Strong fit based on seniority and consent.", reasons: ["VP-level job title", "Consent on file"], nextAction: "Schedule a discovery call." });
    const fetcher = vi.fn(async () => chatCompletion(body));
    const provider = new GroqLeadInsightProvider("key", fetcher as typeof fetch);
    await expect(provider.generate(input)).resolves.toEqual({ fitScore: 82, summary: "Strong fit based on seniority and consent.", reasons: ["VP-level job title", "Consent on file"], nextAction: "Schedule a discovery call." });
    const [, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request?.body))).toMatchObject({ response_format: { type: "json_object" } });
  });

  it("classifies authentication and rate-limit failures", async () => {
    const unauthorized = new GroqLeadInsightProvider("bad", vi.fn(async () => new Response("", { status: 401 })) as unknown as typeof fetch);
    await expect(unauthorized.generate(input)).rejects.toMatchObject({ status: 401, retryable: false } satisfies Partial<GroqProviderError>);

    const limited = new GroqLeadInsightProvider("key", vi.fn(async () => new Response("", { status: 429 })) as unknown as typeof fetch);
    await expect(limited.generate(input)).rejects.toMatchObject({ status: 429, retryable: true } satisfies Partial<GroqProviderError>);
  });

  it("rejects a response that is not valid JSON", async () => {
    const fetcher = vi.fn(async () => chatCompletion("not json"));
    const provider = new GroqLeadInsightProvider("key", fetcher as typeof fetch);
    await expect(provider.generate(input)).rejects.toMatchObject({ status: 502, retryable: true });
  });

  it("rejects a JSON response that does not match the insight schema", async () => {
    const fetcher = vi.fn(async () => chatCompletion(JSON.stringify({ fitScore: 250, summary: "" })));
    const provider = new GroqLeadInsightProvider("key", fetcher as typeof fetch);
    await expect(provider.generate(input)).rejects.toMatchObject({ status: 502, retryable: true });
  });

  it("rejects an empty choices array", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    const provider = new GroqLeadInsightProvider("key", fetcher as typeof fetch);
    await expect(provider.generate(input)).rejects.toMatchObject({ status: 502, retryable: true });
  });
});
