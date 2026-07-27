# LeadFlow

LeadFlow is a working MVP for an automated lead-generation product. It demonstrates the complete front-office loop: capture a prospect, score the lead, organize the pipeline, and trigger follow-up workflows.

## Start today

You only need Node.js 18 or newer. There are no packages to install.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What works now

- Responsive sales dashboard
- Lead capture form with automatic qualification scoring
- Searchable and filterable lead pipeline
- Persistent browser storage for added leads
- Automation workflow controls
- Performance, source, and pipeline reporting UI

This first version intentionally uses realistic local demo data. It lets us validate the product and user experience before paying for databases, enrichment providers, or email delivery.

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
- **Authentication:** Clerk or Auth.js
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
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server.js
├── package.json
└── README.md
```
