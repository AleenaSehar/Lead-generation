export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
}

export interface EmailSendResult {
  provider: string;
  messageId: string;
  acceptedAt: Date;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
