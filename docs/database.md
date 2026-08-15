# Database development

LeadFlow uses PostgreSQL 17 and Prisma ORM 7. The database foundation is workspace-aware so future authentication and APIs can enforce tenant isolation from their first release.

## Local setup

Create your local environment file before installing packages because Prisma Client generation reads `DATABASE_URL`:

```bash
cp .env.example .env
npm install
```

Start the isolated PostgreSQL service and prepare it:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run db:seed
```

The container maps PostgreSQL to `localhost:55432`. Database files live in the named Docker volume `leadflow_postgres_data`.

Stop the service without deleting its data:

```bash
docker compose stop postgres
```

Removing the named volume permanently deletes the local database and is intentionally not part of the normal workflow.

## Initial model

- `User`, `Workspace`, and `WorkspaceMember` establish multi-tenant ownership and roles. `User.supabaseUserId` links a verified Supabase identity without treating mutable email as the identity key.
- `Lead` stores contact, company, source, score, consent, owner, campaign, and custom-field data.
- `LeadActivity` provides an append-oriented prospect timeline and audit context.
- `Campaign` groups acquisition or outreach work.
- `Workflow` and `WorkflowRun` represent automation definitions and executions.
- `EmailSequence` stores draft/archive state, while ordered `EmailStep` records store subjects, plain-text bodies, and delays. `EmailEvent` tracks delivery; provider event IDs are unique so webhook retries are idempotent.
- `SequenceEnrollment` snapshots an enrolled sequence and tracks its lifecycle. `SequenceStepRun` stores immutable email content, schedule, lease, attempts, and a unique email idempotency key.
- `SuppressionEntry` blocks contact after unsubscribe, bounce, complaint, manual, or legal events. Creating an entry also cancels unfinished sequence enrollment steps for the matching workspace lead.
- `BookingPage` stores workspace availability and public scheduling rules; `Meeting` stores conflict-protected UTC reservations linked to leads.
- `CrmConnection` stores provider-neutral configuration and mapping; `CrmContactLink` maintains one external identity per lead; `CrmSyncAttempt` records idempotent request, response, failure, and initiator history.
- `Notification` stores deduplicated workspace events linked to leads; `NotificationRead` stores independent per-user read timestamps.
- `CaptureForm` stores workspace-owned public form configuration.
- `CaptureSubmission` records each accepted submission, its resulting lead, and a one-way rate-limit fingerprint.

Workspace identifiers are included in business-level unique constraints and indexes. Server code must still scope every protected query to a workspace authorized by the signed-in user.

## Migration workflow

After changing `prisma/schema.prisma`:

```bash
npm run db:validate
npm run db:migrate -- --name short_descriptive_name
npm run db:generate
```

Review the generated SQL for:

- destructive drops or irreversible conversions;
- missing indexes on common workspace queries;
- correct foreign-key deletion behavior;
- safe defaults for existing rows;
- cross-workspace uniqueness mistakes.

Commit both the schema and migration. Never rewrite a migration already applied to a shared environment.

Production and preview environments apply committed migrations with:

```bash
npm run db:migrate:deploy
```

## Seed safety

`npm run db:seed` is explicit and idempotent. It creates only fictional development records under `.local` and `.example` domains. Seeded workflows remain drafts and no email provider is connected.

Never copy production credentials, customer contacts, exported leads, or provider tokens into the seed or repository.

## Generated client

Prisma Client is generated into `src/generated/prisma` and ignored by Git. `postinstall` regenerates it after dependency installation, while `npm run db:generate` handles schema changes during development.

Use `getDatabase()` from `src/lib/database.ts` in future server-only code. It reuses the connection during local hot reload and fails clearly when `DATABASE_URL` is missing.

## Lead write behavior

Lead creation, updates, and archival are handled by the lead service. Each write and its corresponding `LeadActivity` records run in one transaction, so the audit history cannot be separated from a successful change.

`DELETE /api/leads/:leadId` is intentionally a soft delete: it changes the status to `ARCHIVED`. Default list queries exclude archived leads, while an explicit `status=ARCHIVED` filter retrieves them. Email uniqueness is scoped per workspace and duplicate writes return an API conflict instead of creating a second record.

Integration tests create isolated workspaces and users, exercise the real PostgreSQL constraints, and clean up only their uniquely named test records.
