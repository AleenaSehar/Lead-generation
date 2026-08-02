import type { EmailMessage, EmailProvider, EmailSendResult } from "@/lib/email/provider";

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  async send(message: EmailMessage): Promise<EmailSendResult> {
    void message;
    return { provider: this.name, messageId: `mock_${message.idempotencyKey}`, acceptedAt: new Date() };
  }
}
