# Lead API

The lead API stores real PostgreSQL records. It requires a valid Supabase session cookie and derives the active workspace and role from the server-side membership record. Requests cannot select another workspace by sending a workspace ID.

## Permissions

| Role | Read | Create | Update | Archive |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Member | Yes | Yes | Yes | No |
| Viewer | Yes | No | No | No |

Archiving is a soft delete. It preserves the lead and activity history with an `ARCHIVED` status.

## List leads

`GET /api/leads`

Optional query parameters:

- `page` defaults to `1`.
- `pageSize` defaults to `20` and has a maximum of `100`.
- `search` matches name, email, company name, or company domain.
- `status` and `source` accept their schema enum values.
- `minScore` accepts an integer from `0` to `100`.
- `sort` accepts `createdAt`, `updatedAt`, `score`, or `lastActivityAt`.
- `order` accepts `asc` or `desc`.

Archived leads are excluded unless `status=ARCHIVED` is supplied.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  },
  "summary": {
    "total": 0,
    "qualified": 0,
    "converted": 0,
    "byStatus": {},
    "bySource": {}
  }
}
```

`pagination.total` describes the filtered result. `summary` always describes all active leads in the authorized workspace, so dashboard totals remain accurate while a filtered page is displayed.

## Create a lead

`POST /api/leads`

Email is required. Status defaults to `NEW`, source to `MANUAL`, and score to `0`.

```json
{
  "email": "maya@example.com",
  "firstName": "Maya",
  "lastName": "Chen",
  "companyName": "Northstar Labs",
  "source": "WEBSITE",
  "score": 72,
  "consentAt": "2026-07-29T12:00:00.000Z",
  "consentSource": "Website demo form",
  "customFields": {
    "teamSize": "11-50"
  }
}
```

A successful create returns `201` with `{ "data": lead }`. A duplicate email in the same workspace returns `409`.

## Read, update, or archive one lead

- `GET /api/leads/:leadId?page=1&pageSize=15` returns the lead, attributed activities, and activity pagination metadata.
- `PATCH /api/leads/:leadId` accepts one or more create fields; unknown fields and empty payloads are rejected.
- `DELETE /api/leads/:leadId` archives the lead and returns the archived record.
- `POST /api/leads/:leadId/notes` accepts `{ "note": "..." }` and creates an attributed `NOTE_ADDED` activity. Owners, admins, and members may add notes; viewers are read-only.

Updates automatically add an `UPDATED` activity. Status and score changes also add specific activity records. The lead write and activities are committed in one database transaction.

## Errors

Errors have a stable shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "path": "email",
        "message": "Enter a valid email address."
      }
    ]
  }
}
```

Common statuses are `400` for invalid JSON or validation, `401` for no authenticated session, `403` for a missing workspace or insufficient role, `404` for a lead outside the active workspace or an unknown ID, `409` for duplicate email, and `500` for an unexpected server error.

## Capture forms

- `GET /api/capture-forms` lists forms in the authenticated workspace.
- `POST /api/capture-forms` creates a form for an owner or admin.
- `PATCH /api/capture-forms/:formId` updates or pauses a workspace form.
- `DELETE /api/capture-forms/:formId` archives a workspace form.
- `GET /api/public/forms/:publicId` returns safe public form configuration.
- `POST /api/public/forms/:publicId` accepts a public prospect submission.

Public submission never accepts a workspace ID. The server resolves the workspace from the opaque form ID, validates consent, rate-limits repeated clients, upserts the email within that workspace, and creates submission and activity records transactionally.

## CSV import

`POST /api/leads/import` accepts up to 1,000 parsed CSV rows, a mapping from LeadFlow fields to CSV headers, and a duplicate strategy of `SKIP` or `UPDATE`. It requires an authenticated owner, admin, or member and derives the workspace from that session.

The response reports total, created, updated, skipped, and failed counts plus row-numbered validation errors. Valid rows and their activity records are committed together; one invalid row does not discard other valid rows.

## Local verification

Start PostgreSQL and the app, sign in through the browser, and use the dashboard session to make requests:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run dev
```

The dashboard uses these endpoints for list, search, filtering, creation, status updates, and archival. Automated coverage is available with `npm test`.
## Scoring rules

Authenticated workspaces use `GET/POST /api/scoring-rules`, `PATCH/DELETE /api/scoring-rules/:ruleId`, and `POST /api/scoring-rules/recalculate`. Owners and admins may mutate rules and run recalculation; all workspace roles may list rules.

## Email delivery foundation

- `POST /api/emails/send` accepts `leadId`, `subject`, `text`, and optional `html`. Owners, admins, and members may create an attempt. The lead must belong to the workspace, have an email and recorded consent, and not be suppressed.
- `POST /api/webhooks/email/:provider` ingests provider events. It requires `x-leadflow-signature`, an HMAC-SHA256 signature of the exact raw body using `EMAIL_WEBHOOK_SECRET`.

### Email safety

- `GET /api/suppressions` lists workspace suppression entries for an authenticated member.
- `POST /api/suppressions` creates or updates a suppression. Owners and admins only.
- `DELETE /api/suppressions/:suppressionId` removes an entry. It does not restore consent or cancelled workflows.
- `POST /api/public/unsubscribe/:token` applies a signed recipient preference without authentication and is safe to retry.

Verified bounce, complaint, and unsubscribe webhooks automatically suppress the recipient and stop unfinished sequence work.

### Calendar booking

- `GET /api/booking-page` returns the authenticated workspace booking configuration.
- `PUT /api/booking-page` creates or updates it for owners and admins.
- `GET /api/meetings` lists upcoming booked meetings for the workspace.
- `GET /api/public/bookings/:publicId` returns an active public page; add `?date=YYYY-MM-DD` to return available UTC slot timestamps.
- `POST /api/public/bookings/:publicId` reserves a validated slot with attendee name, email, time zone, and optional notes.

The public booking operation recalculates availability and uses a serializable transaction plus a unique page/start constraint to prevent double booking.

### CRM synchronization

- `GET /api/crm/connection` returns the workspace CRM configuration.
- `PUT /api/crm/connection` creates or updates a `MOCK` or `HUBSPOT` connection and field mapping for owners/admins.
- `POST /api/crm/connection/test` tests the configured provider for owners/admins.
- `GET /api/crm/syncs` lists the latest 100 workspace attempts.
- `POST /api/crm/leads/:leadId/sync` idempotently creates or updates a provider contact. Owners, admins, and members may invoke it.

The mock provider stays local. The HubSpot provider uses the server-only `HUBSPOT_ACCESS_TOKEN` and upserts contacts by email before retaining their remote contact ID. Unchanged lead snapshots reuse completed attempts, while modified leads create a new attempt linked to the same external contact.

Webhook payloads contain `eventId`, `messageId`, `type`, `occurredAt`, and optional `metadata`. `eventId` is globally unique, so repeated provider delivery is acknowledged without duplicating the event.

## Email sequence drafts

- `GET /api/email-sequences` lists active drafts with their ordered steps.
- `POST /api/email-sequences` creates a draft.
- `PATCH /api/email-sequences/:sequenceId` updates metadata and atomically replaces/reorders steps.
- `DELETE /api/email-sequences/:sequenceId` archives the draft.

Owners and admins may mutate sequences; members and viewers may list them. Each sequence supports up to 20 steps. Step positions are assigned by the server from array order, delay is `0–43,200` minutes, and these endpoints never activate or execute a sequence.

## Sequence enrollment and manual processing

- `POST /api/sequence-enrollments` snapshots a sequence into a lead enrollment. It accepts `leadId`, `emailSequenceId`, and an optional client idempotency key.
- `GET /api/sequence-enrollments?leadId=:leadId` lists the latest 20 enrollments for a workspace lead.
- `POST /api/sequence-enrollments/:enrollmentId/process` claims and processes one due step.
- `DELETE /api/sequence-enrollments/:enrollmentId` cancels pending work.

Owners and admins manage execution; all workspace roles may view a lead's history. Processing rechecks email, consent, suppression, and archive status. Concurrent claims use a database lease, and each step uses a stable email idempotency key across retries.
