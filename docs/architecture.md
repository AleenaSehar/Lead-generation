# LeadFlow architecture

## Current state

LeadFlow is a Next.js and TypeScript application with Supabase Auth plus PostgreSQL and Prisma. Authentication, cookie-based sessions, users, workspace membership, the authorized lead API, lead dashboard, capture, scoring, audit history, email events, and sequence drafts are persistent. Campaign and chart content remains demonstrative until those phases are implemented.

The database schema, migrations, identity verification, workspace authorization, lead validation, and role enforcement are real, but the application is not yet a complete production data system. It has no team invitations, email delivery, enrichment, or background workflow execution.

## Target architecture

The planned application has five main layers:

```text
Browser
  ↓
Next.js web application and API
  ↓
Authentication and workspace authorization
  ↓
PostgreSQL
  ↙                 ↘
Background jobs     External providers
                    Email, enrichment, calendar, CRM
```

### Web application

Next.js with TypeScript provides the user interface and server API. Zod validates lead payloads and query parameters at runtime. Route handlers authenticate requests, while a service layer enforces role permissions and workspace-scoped database access.

### Identity and tenancy

Supabase Auth manages email/password identities, confirmation, recovery, and cookie-based sessions. LeadFlow synchronizes verified identities to its own `User` model using the stable Supabase user ID rather than email.

Every application user belongs to one or more workspaces. All business records carry a workspace identifier, and server helpers verify membership before rendering protected routes or, later, executing APIs. Client-supplied workspace identifiers are never trusted by themselves.

### Data

PostgreSQL is the planned system of record. Prisma provides schema management, reviewed SQL migrations, typed data access, and safe development seeding.

The initial domain models include:

- User, Workspace, and WorkspaceMember
- Lead and LeadActivity
- LeadSource
- Campaign
- Workflow and WorkflowRun
- EmailSequence and EmailEvent
- SuppressionEntry

All business and operational records are scoped to a workspace. Database-level uniqueness, foreign keys, deletion behavior, and query indexes provide the first layer of consistency; application authorization will add the next layer.

### Asynchronous work

Email sequences, scoring updates, provider synchronization, and webhook processing run as background jobs. Jobs must be idempotent, retryable, observable, and safe to resume.

### Integrations

Email, enrichment, calendar, CRM, and analytics providers sit behind internal service interfaces so individual vendors can be replaced without rewriting product logic.

## Architecture principles

1. **Server-enforced isolation:** Every protected query is scoped to an authorized workspace.
2. **Explainable automation:** Scores and workflow decisions expose the rules that produced them.
3. **Idempotent execution:** enrollment snapshots, database leases, and stable step keys make repeated processing safe.
3. **Provider independence:** Business logic does not depend directly on one external vendor.
4. **Safe retries:** Webhooks and background jobs tolerate duplicate delivery.
5. **Privacy by design:** Collect only required data and support suppression, export, and deletion.
6. **Observable operations:** Important workflow transitions and external calls create structured events.
7. **Incremental delivery:** Each feature is developed and reviewed independently against `dev`.

## Environments

- **Local:** Developer machine with test or local services.
- **Preview:** Per-PR deployment using isolated or non-production data.
- **Production:** Protected release from `main`.

Secrets belong in environment configuration. They must never appear in commits, screenshots, logs, example data, or pull-request descriptions.

## Continuous integration

GitHub Actions validates every pull request into `dev` and `main`, and every push to those branches. The CI quality gate has four independent jobs:

- Vitest unit and PostgreSQL-backed integration tests
- ESLint and strict TypeScript checks
- Optimized Next.js production build
- High-severity production dependency audit

Workflows use the committed npm lockfile, a fixed Node.js major version, cached package downloads, minimal repository permissions, timeouts, and concurrency cancellation for superseded runs.

Production builds do not fetch fonts or other presentation assets from third-party services. This keeps local, CI, and future deployment builds reproducible when external services are unavailable.

## Near-term migration path

1. Establish repository standards.
2. Migrate the interface to Next.js and TypeScript without changing product behavior.
3. Add automated checks.
4. Add PostgreSQL and a migration workflow.
5. Add authentication and workspace authorization.
6. Implement authorized lead APIs.
7. Connect the dashboard to persistent lead data.
8. Add capture, scoring, email, and integration capabilities through separate PRs.
