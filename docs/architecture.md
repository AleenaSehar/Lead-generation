# LeadFlow architecture

## Current state

LeadFlow is a Next.js and TypeScript browser prototype. It uses static demonstration metrics and stores newly added leads in browser `localStorage`.

This architecture is useful for validating the interface, but it is not a production data system. It has no authentication, database, server-side authorization, email delivery, enrichment, or background workflow execution.

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

Next.js with TypeScript provides the user interface and will later provide the server API. Input and API payloads will be validated at runtime when the API layer is introduced.

### Identity and tenancy

Every user belongs to one or more workspaces. All business records carry a workspace identifier, and authorization is enforced on the server rather than trusting client-supplied identifiers.

### Data

PostgreSQL is the system of record. Prisma will initially provide schema management, migrations, and typed data access.

The first domain models are expected to include:

- User and Workspace
- WorkspaceMember
- Lead and LeadActivity
- LeadSource
- Campaign
- Workflow and WorkflowRun
- EmailSequence and EmailEvent
- SuppressionEntry

The model list is directional and will be finalized in the database-foundation PR.

### Asynchronous work

Email sequences, scoring updates, provider synchronization, and webhook processing run as background jobs. Jobs must be idempotent, retryable, observable, and safe to resume.

### Integrations

Email, enrichment, calendar, CRM, and analytics providers sit behind internal service interfaces so individual vendors can be replaced without rewriting product logic.

## Architecture principles

1. **Server-enforced isolation:** Every protected query is scoped to an authorized workspace.
2. **Explainable automation:** Scores and workflow decisions expose the rules that produced them.
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

GitHub Actions validates every pull request into `dev` and `main`, and every push to those branches. The CI quality gate has three independent jobs:

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
6. Implement lead APIs and connect the dashboard to real data.
7. Add capture, scoring, email, and integration capabilities through separate PRs.
