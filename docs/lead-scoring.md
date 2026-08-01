# Explainable lead scoring

Workspace owners and admins configure scoring rules under `/settings`. Each active rule checks one lead field and adds or subtracts points. Scores are clamped to `0–100`.

Supported conditions are `equals`, `contains`, `exists`, and `not exists`. Supported fields include source, status, job title, company, domain, email, phone, and consent.

Use **Recalculate all leads** after changing rules. Bulk recalculation covers active pipeline leads and excludes archived records. Normal lead creation and edits automatically apply active rules. Each stored `scoreDetails` value contains the raw total and matched rule names/points; hover the score on a pipeline card to view the explanation.

When a workspace has no active rules, existing manual and CSV score behavior is preserved.
