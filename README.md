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

Open [http://localhost:3000](http://localhost:3000).

Before signing in, create a Supabase development project and replace the placeholder Auth values in `.env`. See [Authentication setup](#authentication-setup).

Authentication, workspaces, leads, pipeline actions, and dashboard lead metrics are persisted in PostgreSQL. Automation and campaign reporting remain demonstration-only until their respective phases.

## Authentication setup

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Open the project’s **Connect** or **API Keys** settings.
3. Copy the project URL and publishable key into `.env`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. In Supabase Auth URL configuration, set the development site URL to `http://localhost:3000`.
5. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
6. Keep email/password authentication and email confirmation enabled.

Start PostgreSQL and apply migrations before creating your first account:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run dev
```

Visit [http://localhost:3000/sign-up](http://localhost:3000/sign-up), confirm the email Supabase sends, and create your first LeadFlow workspace.

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
- Visible logout control and accessible password visibility toggles
- Protected dashboard routes and persistent workspace onboarding
- Authenticated, workspace-scoped lead CRUD API
- Role-based lead permissions, validation, filtering, pagination, and activity history
- Database-backed dashboard totals, source metrics, and recent leads
- Hosted and embeddable public lead-capture forms
- Consent-aware submissions with duplicate handling and basic abuse controls
- CSV lead imports with column mapping, preview, validation, and duplicate policies
- Explainable workspace scoring rules with automatic and bulk recalculation

Lead records shown in the dashboard are real workspace data. Charts, campaigns, and automations still use clearly scoped demonstration content while those product phases are under development.

## Lead API

Authenticated users can access `/api/leads` and `/api/leads/:leadId`. Owner and admin roles can create, update, and archive leads; members can create and update; viewers have read-only access. All operations derive the workspace from the signed-in session rather than trusting a client-supplied workspace ID.

See [docs/api.md](docs/api.md) for payloads, filters, response shapes, errors, and manual testing guidance.

Capture forms are managed at `/forms`. Each active form has a public `/f/:publicId` URL and copyable iframe embed code. See [docs/capture-forms.md](docs/capture-forms.md).

CSV imports start at `/leads/import`. Files are parsed and previewed locally before mapped rows are sent to the workspace API. See [docs/csv-import.md](docs/csv-import.md).

Owners and admins configure transparent lead-scoring rules at `/settings`. See [docs/lead-scoring.md](docs/lead-scoring.md).

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
│   ├── capture-forms.md
│   ├── csv-import.md
│   ├── database.md
│   └── roadmap.md
├── compose.yaml
├── prisma.config.ts
├── CONTRIBUTING.md
├── package.json
└── README.md
```
