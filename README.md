# LeadFlow

[![CI](https://github.com/AleenaSehar/Lead-generation/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/AleenaSehar/Lead-generation/actions/workflows/ci.yml)

LeadFlow is a working MVP for an automated lead-generation product. It demonstrates the complete front-office loop: capture a prospect, score the lead, organize the pipeline, and trigger follow-up workflows.

## Start today

You need Node.js 20.9 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:5555](http://localhost:5555).

Before signing in, create a Supabase development project and replace the placeholder Auth values in `.env`. See [Authentication setup](#authentication-setup).

Authentication, workspaces, leads, capture forms, scoring, pipeline actions, email events and sequences, suppression controls, bookings, CRM links, and team notifications are persisted. Sequence processing remains manual and campaign reporting remains demonstrative until their later phases.

## Authentication setup

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open the project’s **Connect** or **API Keys** settings.
3. Copy the project URL and publishable key into `.env`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. In Supabase Auth URL configuration, set the development site URL to `http://localhost:5555`.
5. Add `http://localhost:5555/auth/callback` to the allowed redirect URLs.
6. Keep email/password authentication and email confirmation enabled.

Start PostgreSQL and apply migrations before creating your first account:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run dev
```

Visit [http://localhost:5555/sign-up](http://localhost:5555/sign-up), confirm the email Supabase sends, and create your first LeadFlow workspace.

Authentication routes:

- `/sign-in`
- `/sign-up`
- `/forgot-password`
- `/update-password`
- `/onboarding`

See [docs/authentication.md](docs/authentication.md) for session architecture, workspace authorization, and a complete verification checklist.

## Database setup

Docker is the simplest local option:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run db:seed
```

The development database is available on local port `55432`, which avoids common local PostgreSQL ports. The seed creates a fictional `.example` lead and a draft workflow; it never sends email.

Useful database commands:

```bash
npm run db:validate        # Validate the Prisma schema
npm run db:generate        # Regenerate the typed Prisma Client
npm run db:migrate         # Create/apply a development migration
npm run db:migrate:deploy  # Apply committed migrations
npm run db:seed            # Load safe development records
npm run db:studio          # Inspect local data
```

See [docs/database.md](docs/database.md) for the data model, migration workflow, and environment guidance.

## Development workflow

`main` contains production-ready releases and `dev` is the integration branch. Create focused feature branches from `dev` and open pull requests back into `dev`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch conventions, pull-request requirements, and the definition of done. The current and target system design is recorded in [docs/architecture.md](docs/architecture.md), and planned delivery is tracked in [docs/roadmap.md](docs/roadmap.md).

## Quality checks

Run the same core checks used by CI before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

GitHub Actions runs code quality, PostgreSQL-backed automated tests, a production build, and a production dependency audit for pull requests into `dev` or `main`. It also runs after changes land on either protected branch.

The dependency audit is scoped to production packages because development-only tooling does not ship with the deployed application. Tooling advisories are still reviewed during dependency updates.

## What works now

- Responsive Next.js sales dashboard
- Persistent lead capture form
- Searchable and filterable lead pipeline
- Server-backed lead status updates and archival
- Drag-and-drop lead pipeline with stage summaries
- Automation workflow controls
- Performance, source, and pipeline reporting UI
- PostgreSQL and Prisma foundation with workspace-aware models
- Supabase email/password authentication and session refresh
- Password recovery with delivery-error feedback, secure recovery-session sign-out, and sign-in redirection after a successful change
- Visible logout control and accessible password visibility toggles
- Protected dashboard routes and persistent workspace onboarding
- Authenticated, workspace-scoped lead CRUD API
- Role-based lead permissions, validation, filtering, pagination, and activity history
- Database-backed dashboard totals, source metrics, and recent leads
- Hosted and embeddable public lead-capture forms
- Consent-aware submissions with duplicate handling and basic abuse controls
- CSV lead imports with column mapping, preview, validation, and duplicate policies
- Explainable workspace scoring rules with automatic and bulk recalculation
- Lead detail drawer with attributed notes, score explanations, and paginated activity history
- Mock-first email provider foundation with consent gates, signed webhooks, and idempotent delivery events
- Draft-only multi-step email sequence builder with ordered delays and atomic reordering
- Manual mock workflow executor with snapshot enrollments, due-step leases, cancellation, and retry-safe email idempotency
- Encrypted public unsubscribe links, workspace suppression management, bounce/complaint controls, and automatic sequence cancellation
- Signed, idempotent email reply detection with lead timeline visibility and automatic stopping of the matching sequence
- Workspace notification center with personal unread state, deduplicated business events, and direct lead links
- Lead ownership with teammate filtering, manual reassignment, audited changes, targeted alerts, and round-robin routing
- Time-zone-aware public booking pages with conflict-safe scheduling, lead linking, and meeting activity
- Provider-independent CRM synchronization with local mock and real HubSpot contact adapters, field mapping, durable contact links, idempotent retries, and audit history
- LLM-based AI lead insight: a qualitative fit score, reasoning, and next action, generated on demand alongside (not replacing) the rule-based score, with a mock provider for dev/CI and an optional Groq provider validated against a strict output schema

Lead records shown in the dashboard are real workspace data. Charts, campaigns, and automations still use clearly scoped demonstration content while those product phases are under development.

## Lead API

Authenticated users can access `/api/leads` and `/api/leads/:leadId`. Owner and admin roles can create, update, and archive leads; members can create and update; viewers have read-only access. All operations derive the workspace from the signed-in session rather than trusting a client-supplied workspace ID.

See [docs/api.md](docs/api.md) for payloads, filters, response shapes, errors, and manual testing guidance.

## AI lead insight

`POST /api/leads/:leadId/ai-insight` generates a qualitative assessment of a lead — a 0-100 fit score, a short summary, grounded reasons, and a suggested next action — separate from the deterministic, rule-based `score` field. This exists to show the two scoring approaches side by side: the rule engine is auditable and instant but only as good as the rules you write, the AI insight can reason over ambiguous signals (title seniority, missing fields) but must be treated as a probabilistic opinion, not a fact.

Design choices, mirroring the existing email/CRM provider pattern in this codebase:

- **Provider abstraction** (`src/lib/ai/provider.ts`) with a deterministic `MockLeadInsightProvider` (default, no network call — safe for dev and CI) and a `GroqLeadInsightProvider` for real inference, selected via `AI_PROVIDER=mock|groq`.
- **Strict output validation** (`src/lib/ai/validation.ts`): the model is instructed to return JSON only, and the response is parsed with Zod before it ever reaches the database. A malformed or out-of-range response is rejected as a `502 AI_PROVIDER_ERROR`, not silently coerced.
- **No blind trust in the model's own reasoning**: the AI insight is stored and displayed alongside the rule-based score and its matched rules, not merged into it — a hiring manager or teammate can see exactly which parts of a lead's priority are deterministic and which are an LLM's judgment call.

Set `GROQ_API_KEY` (free tier at [console.groq.com](https://console.groq.com)) and `AI_PROVIDER=groq` to enable real generation; without it, the app runs entirely on the mock provider.

Capture forms are managed at `/forms`. Each active form has a public `/f/:publicId` URL and copyable iframe embed code. See [docs/capture-forms.md](docs/capture-forms.md).

CSV imports start at `/leads/import`. Files are parsed and previewed locally before mapped rows are sent to the workspace API. See [docs/csv-import.md](docs/csv-import.md).

Owners and admins configure transparent lead-scoring rules at `/settings`. See [docs/lead-scoring.md](docs/lead-scoring.md).

Open **View details** on any pipeline card to review contact data, scoring reasons, and the complete lead audit timeline. See [docs/lead-activity.md](docs/lead-activity.md).

Email delivery currently runs in safe mock mode: attempts are recorded but nothing is sent externally. See [docs/email-delivery.md](docs/email-delivery.md).

Email sequence drafts are authored at `/automations`. They can only be processed manually through the mock workflow engine; no automatic or real sending is enabled. See [docs/email-sequences.md](docs/email-sequences.md).

Consented leads can be enrolled and manually processed from their detail drawer. Processing remains mock-only and requires an explicit click. See [docs/workflow-execution.md](docs/workflow-execution.md).

Every generated email includes an encrypted, authenticated unsubscribe URL. Owners and admins manage blocked recipients under **Settings → Email safety**. See [docs/email-safety.md](docs/email-safety.md).

Signed reply callbacks are matched through recorded provider message IDs. Replies appear in the lead drawer and stop the matching sequence without affecting unrelated enrollments. See [docs/email-replies.md](docs/email-replies.md).

The top-bar notification center alerts workspace members about qualified and high-score leads, replies, meetings, and CRM failures. Read state is personal to each member. See [docs/team-notifications.md](docs/team-notifications.md).

Lead cards show their responsible owner. Owners and admins can switch new-lead routing between creator ownership and round robin, while editable roles can reassign leads from the detail drawer. See [docs/lead-routing.md](docs/lead-routing.md).

Owners and admins publish workspace availability at `/bookings`. Public bookings create or link leads, appear on the overview, and record timeline activity. See [docs/calendar-booking.md](docs/calendar-booking.md).

CRM synchronization is configured at `/integrations`. Use the local mock provider for safe development or set the server-only `HUBSPOT_ACCESS_TOKEN` to create and update real HubSpot contacts. See [docs/crm-sync.md](docs/crm-sync.md).

## The product idea

LeadFlow helps a small B2B sales team turn anonymous interest into booked conversations:

1. **Capture:** Forms, CSV imports, LinkedIn, or website visitor identification bring prospects in.
2. **Enrich:** Add company, role, size, industry, and verified contact details.
3. **Score:** Rank leads based on ideal-customer fit and buying intent.
4. **Route:** Assign qualified leads to the right sales owner.
5. **Engage:** Send personalized, permission-aware email sequences.
6. **Learn:** Track replies, meetings, conversions, and campaign ROI.

## Recommended build roadmap

### Phase 1 — working MVP

- Replace browser storage with PostgreSQL
- Add authentication and separate workspaces
- Create a public embeddable capture form
- Add API endpoints for leads, scores, and workflows
- Integrate one transactional email provider
- Track email opens, replies, and unsubscribes

### Phase 2 — automation

- Connect a data enrichment provider
- Add rule-based scoring configured by the user
- Schedule multi-step sequences with background jobs
- Add calendar booking and CRM sync
- Introduce campaign analytics and A/B testing

### Phase 3 — intelligence

- Generate personalized opening lines from approved company data
- Recommend next actions based on intent signals
- Detect and merge duplicates
- Optimize scoring from closed-won outcomes

## Suggested production architecture

- **Web app:** Next.js + TypeScript
- **Database:** PostgreSQL with Prisma
- **Authentication:** Supabase Auth
- **Jobs:** Trigger.dev or BullMQ
- **Email:** Resend or Postmark
- **Enrichment:** Apollo, People Data Labs, or Clearbit
- **Analytics:** PostHog
- **Hosting:** Vercel, Railway, or Render

Provider selection should wait until the target customer and acquisition channel are validated.

## Important guardrails

Build consent, suppression lists, unsubscribe handling, sender-domain authentication, rate limits, and regional privacy requirements into the first real outreach release. Lead generation should focus on relevant business prospects and transparent outreach—not scraped bulk spam.

## Repository structure

```text
.
├── public/
│   └── styles.css
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   ├── components/
│   ├── data/
│   ├── lib/
│   └── types/
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── authentication.md
│   ├── calendar-booking.md
│   ├── capture-forms.md
│   ├── csv-import.md
│   ├── crm-sync.md
│   ├── database.md
│   ├── email-delivery.md
│   ├── email-safety.md
│   ├── email-sequences.md
│   ├── lead-activity.md
│   ├── lead-scoring.md
│   ├── workflow-execution.md
│   └── roadmap.md
├── compose.yaml
├── prisma.config.ts
├── CONTRIBUTING.md
├── package.json
└── README.md
```
