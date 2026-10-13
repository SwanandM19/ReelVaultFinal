# ReelVault admin dashboard (`/admin`)

A private dashboard for ReelVault's Supabase database: users, subscriptions, payments, support requests, an activity
log, and a raw browser for the remaining tables. Saved reels and background jobs are deliberately **not** shown anywhere
(including the raw browser); see `HIDDEN_TABLES` in `lib/admin/data.ts` to change that.

Everything is read-only **except the account actions**: an admin can suspend, reinstate or permanently delete a user. It lives at `/admin` of this site. **Nothing on the public site links to it.**

## One-time setup

1. **Pick the admins.** Each admin signs in with the email and password of a normal, *confirmed* account in the
   ReelVault Supabase project (sign up in the app, or Supabase dashboard → Authentication → Users → *Add user* with
   "Auto confirm" ticked).
2. **Set the environment** (`.env.local` for local runs; your host's environment settings in production, e.g. Vercel →
   Settings → Environment Variables). A local `.env.local` was created for you with everything except the list of admins.

   | Variable | What it is |
   |---|---|
   | `SUPABASE_URL` | the Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | **full database access.** Server-only; never prefix it with `NEXT_PUBLIC_` |
   | `SUPABASE_ANON_KEY` | the public key; only used to check an admin's password |
   | `ADMIN_SESSION_SECRET` | random string, 32+ characters, signs the session cookie (changing it signs everyone out) |
   | `ADMIN_EMAILS` | comma-separated admin emails, e.g. `me@example.com,partner@example.com` |
| `BACKEND_URL` | the backend's address (only for account actions) |
| `ADMIN_API_KEY` | secret shared with the backend, 24+ characters (only for account actions) |

   Until `ADMIN_EMAILS` has at least one address, **nobody can sign in** (the dashboard fails closed).
3. Run `npm run dev` (or deploy) and open `/admin`.

### Turning on account actions (suspend / reinstate / delete)

These are carried out by the backend, not by this site, so they need three things:

1. Run `backend2/supabase/account_actions.sql` once in the Supabase SQL editor (the audit log and deletion notices).
2. Pick a secret of 24+ random characters and set it as **`ADMIN_API_KEY` on both sides**: here (`.env.local` already has
   one) and in the backend's environment (Railway), then redeploy the backend with the version that has `/api/admin`.
3. Set **`BACKEND_URL`** here to the backend's address.

Until all three are done the buttons are replaced by a note, and any request fails safely without touching anything.

## How access is protected

- Sign-in checks the password with **Supabase Auth**, then requires the (confirmed) email to be on `ADMIN_EMAILS`.
  A wrong password, an unknown user and a non-admin all get the same generic message and take the same time.
- A successful sign-in sets a **signed, HttpOnly, SameSite=Strict, `Secure`** cookie scoped to `/admin`, valid for 4 hours.
- **Every database read goes through `lib/admin/data.ts`, and every function in it starts with `requireAdmin()`.**
  Pages, layouts and future routes cannot reach the data without a valid session, whatever the URL. Layouts are not
  relied on for security (Next.js renders them independently of pages).
- The service-role key is only used in server code; no file shipped to browsers contains it.
- Removing someone from `ADMIN_EMAILS` ends their session on their next request. Rotating `ADMIN_SESSION_SECRET` ends all.
- Login attempts are rate limited (per address and per email); login/logout accept only same-site form posts.
- Admin pages are `no-store`, `noindex`, un-frameable and send no referrer. `/admin` is not in `robots.txt` or any
  sitemap, so it is not advertised anywhere.
- **Account actions are guarded in layers.** Same-site request only, a valid admin session, a real target account, the
  target must not be an admin account (`ADMIN_EMAILS`) or yourself, and a delete needs the person's email typed back.
  The backend re-checks the shared key and refuses to delete if it can't cancel a live Razorpay subscription. Every
  action is written to the activity log with who did it, to whom and when. Nothing else on the dashboard changes data.
- Payment card/UPI details are never stored in the database and push tokens are shown masked.

## What the person sees

- **Suspended:** they can't sign in. Supabase itself refuses the sign-in, and the app shows *Account suspended*. If they
  were signed in, they are signed out within about a minute. Nothing is deleted, and **Reinstate** reverses it.
- **Deleted:** their account and data are erased (see the privacy policy) and, when they try to sign in, the app says
  *Account deleted*. Only a keyed hash of the email is kept for that message, never the address itself.
- Links to user-supplied addresses are only rendered for `http(s)`.

## Limits to know about

- Sessions are stateless: **Sign out** clears the browser's cookie, but a copied cookie stays valid until it expires
  (4 h) unless the admin is removed from `ADMIN_EMAILS` or the secret is rotated.
- The login rate limit is in memory (per server instance, reset on restart). Supabase also rate-limits password sign-ins.
- The deletion message works by checking, after a failed sign-in, whether a keyed hash of that email is in the
  deleted-accounts list. That means anyone can ask whether a given email's account was deleted (a one-word answer,
  rate limited per address); it never says whether an account exists.
- No second factor. Use strong, unique passwords for admin accounts (Supabase MFA is not wired into this sign-in).
- The page shows personal data (emails, names, support messages). Only list people who should see all of it.
- Overview totals read up to 10,000 rows per table. The raw table browser paginates and has no limit.
- This repository's source is visible to anyone who can read it; the route's existence is not a secret, the
  authentication is what protects it.

## Adding to it

New tables appear automatically under **Database** (the list is read from Supabase). To give one a dedicated page, add a
query to `lib/admin/data.ts` (start it with `await requireAdmin()`) and a page under `app/admin/`.

## Tests

`npm test` runs the security-critical logic tests (session signing, allowlist, rate limiting, URL/search safety, and the rules for account actions).
