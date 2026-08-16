# Lead routing and ownership

Lead ownership answers a practical question: **who is responsible for following up with this prospect?** Every active lead card shows its current owner, and the pipeline can be filtered by teammate or unassigned leads.

## Routing modes

- **Creator owns lead** (`MANUAL`) assigns a newly created lead to the authenticated teammate who created it.
- **Round robin** distributes new leads across owners, admins, and members in stable membership order. Viewers are excluded because they cannot update leads.

Owners and admins select the mode from the lead-pipeline toolbar. The round-robin cursor is locked and advanced in the same transaction that creates the lead, preventing simultaneous requests from consuming the same turn.

## Routing rules

Owners and admins can route a lead to a specific teammate when its source matches a selected channel or its score reaches a configured minimum. Active rules run in their displayed order before the default routing mode; the first match wins. If no rule matches, creator ownership or round robin handles the lead.

## Reassignment

Open **View details** on a lead and use **Lead owner** to assign another eligible teammate or leave the lead unassigned. Owners, admins, and members may reassign; viewers can only see the current owner.

Every changed assignment creates an `ASSIGNED` activity containing the previous and next owner. When a different teammate receives a lead, LeadFlow creates a recipient-only notification linking directly to that lead.

## Manual verification

1. Open `/leads` and confirm each card displays an owner.
2. Filter by **All owners**, a teammate, and **Unassigned**.
3. Open a card, change its owner, and confirm the card and activity timeline update.
4. Add a source or minimum-score rule and create a matching lead.
5. As an owner or admin, choose **Round robin** and add several non-matching leads.
6. Confirm ownership rotates among non-viewer workspace members.
7. Sign in as an assigned teammate and confirm the private assignment notification appears.
