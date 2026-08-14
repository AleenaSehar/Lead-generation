# Email reply detection

LeadFlow accepts signed `REPLIED` events through the existing provider webhook boundary. The event is matched to a previously recorded provider message ID, so the callback never supplies or chooses a workspace or lead ID.

## What happens when a reply arrives

1. The provider event ID is stored once for webhook idempotency.
2. LeadFlow records an `EMAIL_REPLIED` activity with the provider timestamp and an optional safe text preview.
3. If the original message belongs to a sequence step, that enrollment becomes `REPLIED` and all remaining unsent or failed steps become `CANCELLED`.
4. The lead's latest activity timestamp is updated and the reply appears in both the email event list and activity timeline.

Only the enrollment that produced the replied-to message is stopped. A reply to a direct email still creates lead activity but does not modify unrelated enrollments. Repeated callbacks safely finish the same side effects without creating another reply event or timeline entry.

## Local mock verification

First simulate an email or process a sequence step in the lead drawer, then copy its mock provider message ID from the email events. Create a JSON payload using a unique event ID:

```json
{
  "eventId": "reply-local-001",
  "messageId": "mock-RECORDED_MESSAGE_ID",
  "type": "REPLIED",
  "occurredAt": "2026-08-04T12:00:00.000Z",
  "metadata": {
    "textPreview": "Thanks, I would like to learn more."
  }
}
```

Sign the exact raw JSON body with `EMAIL_WEBHOOK_SECRET` and post it to `POST /api/webhooks/email/mock` using the `x-leadflow-signature` header. The secret must contain at least 32 characters. Changing whitespace after signing invalidates the signature.

This validates inbound processing locally; no email is sent or received externally while `EMAIL_PROVIDER=mock`. A production provider adapter must translate its native inbound payload to LeadFlow's normalized event shape and verify the provider's authentic signature before calling the service.
