# Authentication and workspace access

LeadFlow uses Supabase Auth for identity and session management. PostgreSQL remains the source of truth for application users, workspaces, memberships, roles, and business data.

## Responsibility boundary

Supabase answers:

- Is the session valid?
- Which external user signed in?
- Is the email verified?
- How are password recovery and session refresh handled?

LeadFlow answers:

- Which internal user corresponds to that identity?
- Which workspace can they access?
- What workspace role do they have?
- Which leads, workflows, and campaigns can they read or change?

Supabase user IDs are stored in `User.supabaseUserId`. Email is synchronized for display and communication, but is not used as the permanent external identity key.

Server requests establish identity from Supabase’s cryptographically verified JWT claims. The proxy refreshes expiring sessions and forwards updated cookies; application authorization then uses the verified subject claim to load the internal user and workspace membership. This avoids a second remote user lookup on every API request while continuing to reject unverified cookie data.

## Required configuration

Create a hosted Supabase project for development and add these values to `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key is designed for browser use. Authorization does not rely on the key being secret. Never add a Supabase secret key or database password to browser-prefixed variables.

Configure Supabase Auth:

1. Set **Site URL** to `http://localhost:5555` for local development.
2. Add `http://localhost:5555/auth/callback` as an allowed redirect URL.
3. Enable email/password authentication.
4. Keep email confirmation enabled.
5. Use the default email service only for development; configure production SMTP before launch.

## Request flow

`proxy.ts` refreshes Supabase session cookies. Protected server layouts then:

1. validate the user with Supabase;
2. synchronize the external identity to the Prisma `User`;
3. look up the user’s workspace membership;
4. redirect users without a workspace to `/onboarding`;
5. render the dashboard only after membership is confirmed.

Future route handlers and server actions must call `requireUser()`, `requireWorkspace()`, or `requireWorkspaceRole()` from `src/lib/auth.ts`.

## Local verification

Prepare the database and application:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
npm run dev
```

Then verify:

1. Visiting `/` while signed out redirects to `/sign-in`.
2. `/sign-up` creates a Supabase user and shows confirmation guidance.
3. The confirmation email returns through `/auth/callback`.
4. A confirmed user without membership is redirected to `/onboarding`.
5. Creating a workspace creates one `Workspace` and one `OWNER` membership.
6. The dashboard displays the signed-in name and active workspace.
7. Signing out returns to `/sign-in` and protected routes remain inaccessible.
8. Password recovery returns through the callback to `/update-password`; a successful change signs out the recovery session and redirects to `/sign-in`.

Use Prisma Studio to confirm the internal `User`, `Workspace`, and `WorkspaceMember` records.

## Security notes

- Authentication is checked on the server; hiding interface elements is not authorization.
- Redirect destinations accept only internal paths to prevent open redirects.
- Sign-in errors do not reveal whether an email address exists.
- Password reset responses are deliberately generic.
- Workspace creation validates names and slugs on the server.
- The current application uses Prisma’s server connection, so Supabase Row Level Security does not replace application-level workspace checks.
- If future browser code queries Supabase’s Data API directly, those tables must receive explicit RLS policies first.
