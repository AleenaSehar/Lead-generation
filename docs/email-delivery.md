# Email delivery foundation

This phase is intentionally mock-first. `EMAIL_PROVIDER=mock` records realistic delivery attempts and events but never contacts an external email service or recipient.

## Configuration

```env
EMAIL_PROVIDER=mock
EMAIL_FROM=LeadFlow Dev <no-reply@leadflow.local>
EMAIL_WEBHOOK_SECRET=replace-with-at-least-32-random-characters
```

Any provider other than `mock` fails closed. The webhook secret must contain at least 32 characters; otherwise every webhook is rejected.

## Safety gates

An authenticated owner, admin, or member may simulate a send only when the lead has an email, recorded consent, and no workspace suppression entry. Viewers cannot create attempts. A `QUEUED` event is stored before calling the provider, followed by `SENT` or `FAILED`.

Open a lead's **View details** drawer to use the development composer and review its latest provider events. The response and interface explicitly state that mock messages were not externally delivered.

## Signed and idempotent webhooks

Provider callbacks post to `/api/webhooks/email/mock`. The `x-leadflow-signature` value is `sha256=` followed by the hexadecimal HMAC-SHA256 of the exact raw request body. Events resolve their workspace and lead through the signed provider message ID rather than trusting IDs in the payload.

Every callback must have a unique provider `eventId`. Repeated delivery of the same event returns the existing record and does not create a duplicate. `REPLIED` events also stop the sequence enrollment that produced the original message and record one lead activity; see [email-replies.md](email-replies.md).

## Current boundary

Every generated message now includes a signed public unsubscribe URL. Bounce, complaint, and unsubscribe webhooks add workspace suppressions and stop unfinished sequence work. Reply webhooks stop only the matching sequence enrollment. See [email-safety.md](email-safety.md). A production provider and automatic background scheduler are still intentionally unavailable.
