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

- `GET /api/leads/:leadId` returns the lead and its latest 50 activities.
- `PATCH /api/leads/:leadId` accepts one or more create fields; unknown fields and empty payloads are rejected.
- `DELETE /api/leads/:leadId` archives the lead and returns the archived record.

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
