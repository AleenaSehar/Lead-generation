import { describe, expect, it, vi } from "vitest";
import { GroqLeadInsightProvider, GroqProviderError } from "@/lib/ai/groq-provider";
import type { LeadInsightContext } from "@/lib/ai/provider";

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

const context: LeadInsightContext = {
  firstName: "Maya",
  lastName: "Chen",
  email: "maya@example.com",
  jobTitle: "VP Sales",
  companyName: "Acme",
  companyDomain: "acme.com",
  status: "QUALIFIED",
  source: "WEBSITE",
  score: 64,
  scoreDetails: null,
  consentAt: null,
  lastActivityAt: null,
};

const validInsight = {
  fitScore: 72,
  summary: "Strong fit based on job title and company size.",
  reasons: ["Matches ideal customer profile."],
  nextAction: "Schedule a discovery call.",
};

describe("Groq lead insight provider", () => {
  it("generates a validated insight from the model's JSON content", async () => {
    const fetcher = vi.fn(async () => json({ choices: [{ message: { content: JSON.stringify(validInsight) } }] }));
    const provider = new GroqLeadInsightProvider("server-secret", fetcher as unknown as typeof fetch);
    await expect(provider.generateInsight(context)).resolves.toEqual(validInsight);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer server-secret" }),
      }),
    );
    const [, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(request?.body));
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("classifies authentication and rate-limit failures safely", async () => {
    const unauthorized = new GroqLeadInsightProvider("bad", vi.fn(async () => json({}, 401)) as unknown as typeof fetch);
    await expect(unauthorized.generateInsight(context)).rejects.toMatchObject({ status: 401, retryable: false } satisfies Partial<GroqProviderError>);

    const limited = new GroqLeadInsightProvider("token", vi.fn(async () => json({}, 429)) as unknown as typeof fetch);
    await expect(limited.generateInsight(context)).rejects.toMatchObject({ status: 429, retryable: true } satisfies Partial<GroqProviderError>);
  });

  it("rejects a non-JSON model response", async () => {
    const fetcher = vi.fn(async () => json({ choices: [{ message: { content: "not json" } }] }));
    const provider = new GroqLeadInsightProvider("token", fetcher as unknown as typeof fetch);
    await expect(provider.generateInsight(context)).rejects.toMatchObject({ status: 502, retryable: true });
  });

  it("rejects model output that fails schema validation", async () => {
    const fetcher = vi.fn(async () => json({ choices: [{ message: { content: JSON.stringify({ fitScore: 150, summary: "x", reasons: [], nextAction: "y" }) } }] }));
    const provider = new GroqLeadInsightProvider("token", fetcher as unknown as typeof fetch);
    await expect(provider.generateInsight(context)).rejects.toMatchObject({ status: 502, retryable: true });
  });
});
