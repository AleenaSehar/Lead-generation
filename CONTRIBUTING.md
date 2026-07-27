# Contributing to LeadFlow

Thank you for helping build LeadFlow. This guide keeps changes focused, reviewable, and safe to release.

## Branch model

- `main` contains production-ready releases.
- `dev` is the integration branch for completed features.
- Create every working branch from the latest `dev`.
- Open feature pull requests against `dev`.
- Merge `dev` into `main` only through a release pull request.
- Do not commit directly to `main` or `dev`.

Update your local branches before starting:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feat/short-description
```

Use one of these prefixes:

| Prefix | Use |
| --- | --- |
| `feat/` | New product behavior |
| `fix/` | Bug fix |
| `chore/` | Tooling, dependencies, or repository maintenance |
| `docs/` | Documentation-only work |
| `refactor/` | Internal change with no intended behavior change |
| `test/` | Test-only work |

Use lowercase kebab-case, for example `feat/lead-management-api`.

## Commits

Write short, imperative commit messages that describe the outcome:

```text
Add duplicate lead validation
Fix campaign status filter
Document local database setup
```

Keep unrelated changes in separate commits and never commit credentials, `.env` files, production lead data, or generated build output.

## Pull requests

Before opening a pull request:

1. Rebase or merge the latest `dev` into the feature branch.
2. Run the required checks locally:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm audit --omit=dev --audit-level=high
   ```

3. Review the diff for secrets and unrelated changes.
4. Complete the pull-request template.
5. Add screenshots for visible interface changes.
6. Explain migrations, environment variables, and rollback concerns.

Feature pull requests should target `dev` and use **squash and merge**. Delete the feature branch after it is merged.

GitHub Actions must report successful **Code quality**, **Production build**, and **Production dependency audit** jobs before a pull request is merged.

## Definition of done

A change is complete when:

- Acceptance criteria are satisfied.
- Relevant automated tests exist and pass.
- Loading, empty, error, and success states are considered.
- Authorization and workspace isolation are enforced for server features.
- Accessibility and responsive behavior are checked for interface changes.
- Documentation and `.env.example` are updated when needed.
- No secrets or personal lead data are included.
- The pull request includes clear manual verification steps.

## Security and responsible outreach

LeadFlow must support relevant, transparent, permission-aware outreach. Features that collect or contact leads must consider consent records, suppression lists, unsubscribe handling, sender identity, rate limits, deletion requests, and regional privacy requirements.

Report security concerns privately to the repository owner rather than opening a public issue containing sensitive details.
