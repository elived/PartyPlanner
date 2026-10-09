# Party Planner

Create a customisable invitation page for an event, share one link, and collect
RSVPs — with email notifications, live statistics and Excel/CSV export.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Prisma ·
PostgreSQL · Auth.js (NextAuth v5) · Resend/Nodemailer · SheetJS**.

---

## Quick start

```bash
cp .env.example .env          # then set AUTH_SECRET (DATABASE_URL already works)
npm install
npm run db:local              # Postgres, no Docker — leave this running
```

Then, in a second terminal:

```bash
npm run db:migrate            # creates the schema
npm run db:seed               # optional demo organiser + event + RSVPs
npm run dev
```

Generate a secret with:

```bash
openssl rand -base64 32
```

The seed prints its demo sign-in credentials. Open <http://localhost:3000>.

### Choosing a database for development

Three options, all equivalent as far as the app is concerned — pick one:

| | Command | When |
| --- | --- | --- |
| **No Docker** | `npm run db:local` | Nothing to install. `embedded-postgres` unpacks a real PostgreSQL binary into `node_modules` and runs it against `.pgdata/` in the project. |
| **Docker** | `docker compose up -d` | You already have Docker and prefer it. |
| **Hosted** | — | [Neon](https://neon.tech), [Supabase](https://supabase.com) and Vercel Postgres all have a free tier; paste the connection string into `DATABASE_URL`. |

The first two bind the same port and use the same credentials as the
`DATABASE_URL` in `.env.example`, so don't run both. Start the local one over
with `npm run db:local -- --reset`.

`embedded-postgres` is a **devDependency** — it is never installed in production,
where you point `DATABASE_URL` at a managed database.

---

## What it does

**Organisers** sign in, create an event, fill in the details, style the
invitation with a live preview, publish it, and watch responses arrive. They can
search, filter and sort RSVPs and export the guest list.

**Guests** open a link like `/event/john-birthday-2027`, read the invitation, and
submit an RSVP — attending, maybe or not attending — with a party size, dietary
needs and a message. They get a confirmation email; the organiser gets a
notification.

---

## Project structure

```
Dockerfile                   Production image (standalone output, non-root)
docker-compose.yml           Dev database only
docker-compose.prod.yml      Self-hosted stack: app + database + volumes
prisma/
  schema.prisma              Data model (see "Database" below)
  migrations/                Generated SQL migrations — commit these
  seed.ts                    Idempotent demo data
src/
  auth.ts                    Auth.js: providers + Prisma adapter (Node runtime)
  auth.config.ts             Edge-safe half, shared with the middleware
  middleware.ts              Route protection for /dashboard
  app/
    (auth)/login             Sign in
    (auth)/register          Sign up (can be closed off by env)
    dashboard/               Admin — event list
      events/new             Create
      events/[id]/           Details · appearance · RSVPs (tabbed layout)
    event/[slug]/            Public invitation page
    event/[slug]/calendar.ics  Downloadable calendar file
    api/                     Route handlers (see "API" below)
    api/health               Liveness + readiness probe (checks the database)
    robots.ts, sitemap.ts    Keeps invitations out of search indexes
  components/
    ui/                      Design-system primitives (Button, Field, Card…)
    auth/                    Sign-in and sign-up forms
    dashboard/               Admin-only components
    invitation/              Shared by the public page AND the live preview
  instrumentation.ts         Boot-time config validation (fails fast in production)
  lib/                       Pure, framework-agnostic helpers
    urls.ts                  Request-time origin resolution (see "Going live")
    validations/             Zod schemas shared by client and server
    mail/                    Mail port + HTML/text templates
  server/services/           All database access lives here
```

### Layering

```
Route handler / Server Component     ← HTTP and rendering concerns only
        ↓
src/server/services/*                ← Business rules + every Prisma query
        ↓
Prisma Client
```

Route handlers parse and authenticate; services decide. Nothing outside
`src/server/services` runs a query against events or RSVPs.

The practical payoff is the ownership check. `getEventForOwner(eventId, ownerId)`
throws `404` for an event that does not exist and `403` for one belonging to
someone else, and every write path goes through it — so it is not possible to add
an endpoint that forgets to check. Server Components call the same functions as
the API routes, so the dashboard and the API can never disagree about what an
organiser is allowed to see.

---

## Architectural decisions

### Theming through CSS custom properties, not generated classes

An organiser's palette is user data, so there is no finite set of Tailwind
classes to compile. `themeStyle()` (`src/lib/theme.ts`) turns a saved theme into
a style object of `--pp-*` custom properties, set once on a wrapper element.

Three things follow:

* The **live preview renders the real `InvitationView`**, not a mock-up — the
  editor just passes different values for the same variables. A preview that
  renders different components from production is a preview that lies.
* Re-theming is instant and needs no re-render of the tree below.
* No user-supplied string ever reaches a `style` attribute unvalidated: colours
  are validated hex, and fonts are *keys* into a registry
  (`src/lib/fonts.ts`) rather than raw font stacks.

### Fonts are self-hosted and keyed

`next/font` downloads the faces at build time and serves them from our origin —
no runtime request to Google, no layout shift, no third-party cookie. The
database stores `"playfair"`, not a font-family string.

### Times: UTC instants plus the organiser's zone

Every timestamp is stored as a UTC instant, with the event's IANA zone alongside
it. Display always goes through that zone, so a guest in Tokyo opening an
invitation for a party in Oslo sees the Oslo wall-clock time — and server and
client render identical markup, which `toLocaleString()` would not.

The admin form edits wall-clock strings; conversion happens at exactly two
points, `localInputToUtc` and `utcToLocalInput` (`src/lib/dates.ts`).

### Content and presentation are separate tables

`Event` holds what the party *is*; `EventTheme` holds what it *looks like*. The
appearance editor saves without touching event content, and the split leaves room
for reusable theme presets later. Theme values are real columns rather than a
JSON blob — the set is small, stable and known, and columns give type-safety and
validation for free.

### RSVP de-duplication is a service rule, not a DB constraint

"One response per email" is an admin toggle, so a hard `UNIQUE (eventId, email)`
would make the permissive mode impossible. The rule lives in
`src/server/services/rsvps.ts`, with a composite index to keep the lookup fast.
With `allowRsvpUpdates` on, a repeat submission from the same address updates
the existing response — which is also how a guest changes their mind, with no
accounts and no magic links.

### The RSVP endpoint is the only unauthenticated write, and is treated that way

* Per-IP rate limit.
* A honeypot field that answers *success* when tripped, so a bot learns nothing.
* Every rule re-checked server-side against the event: deadline, capacity,
  per-response cap, and which fields are even collected. A field the organiser
  turned off is discarded even if the request contains it.
* Capacity is counted in the database at write time, so two simultaneous
  submissions cannot both take the last seat.

### Exports guard against formula injection

Excel treats a leading `=`, `+`, `-` or `@` as a formula. A guest who names
themselves `=HYPERLINK(...)` would otherwise get code running in the organiser's
spreadsheet. `neutralise()` in `src/lib/export.ts` prefixes such values so both
Excel and Sheets treat them as literal text. The `.xlsx` and `.csv` exports are
built from one row-shaping function, so they cannot disagree about columns.

### Email is a port with three adapters

`sendMail()` is the only mail API the app knows. `EMAIL_PROVIDER` selects
Resend, SMTP (Nodemailer) or `console` — the last prints the message to stdout,
so local development needs no mail credentials. Provider SDKs are imported lazily
inside their adapter, so an SMTP deployment never loads the Resend client.

Notifications are **awaited** before the response is returned. A serverless
function is frozen the instant it responds, so a fire-and-forget send would be
killed mid-flight. Delivery failures are logged and swallowed: a bounced
notification must never turn a successfully recorded RSVP into an error for the
guest.

### Uploads are a port too

`STORAGE_DRIVER=local` writes to `public/uploads` (fine for `next dev` and any
long-lived Node host); `vercel-blob` uses Vercel Blob, which is **required on
Vercel** — its filesystem is read-only and per-invocation. Organisers can also
simply paste an image URL, so an instance with neither configured still works.

SVG uploads are rejected: they can carry `<script>`, and with the local driver
uploads are served from our own origin, which would turn a logo upload into
stored XSS.

### Query state lives in the URL

The RSVP table keeps search, filter, sort and page in the query string. A
filtered view is shareable, survives a refresh, and works with the back button —
and the server component re-runs the query, so the client never owns a second
copy of the data.

---

## Database

| Model | Purpose |
| --- | --- |
| `User` | Organiser. `passwordHash` is null for OAuth-only accounts. |
| `Account` / `Session` / `VerificationToken` | Auth.js adapter tables. |
| `Event` | Content, schedule, location, contact, RSVP rules, notification settings. |
| `EventTheme` | Colours, fonts, button style/shape. 1-1 with `Event`. |
| `Rsvp` | One guest response. Cascades on event delete. |

Indexes on `Rsvp` cover the three access patterns: de-duplication lookup
(`eventId, email`), the default table order (`eventId, createdAt`) and the status
filter (`eventId, status`).

Migrations:

```bash
npm run db:migrate      # dev — creates and applies a migration
npm run db:deploy       # production — applies committed migrations
npm run db:studio       # browse the data
```

---

## API

All admin routes require a session; ownership is enforced in the service layer.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/register` | Create an account (rate-limited, can be disabled). |
| `GET/POST` | `/api/auth/[...nextauth]` | Auth.js sign-in, callback, session, sign-out. |
| `GET` | `/api/events` | The signed-in organiser's events with statistics. |
| `POST` | `/api/events` | Create an event. |
| `GET` | `/api/events/[id]` | One event with its theme. |
| `PATCH` | `/api/events/[id]` | Update `details`, `appearance` or `slug`. |
| `DELETE` | `/api/events/[id]` | Delete the event and all its RSVPs. |
| `GET` | `/api/events/[id]/rsvps` | Paged, searchable, sortable RSVP list + stats. |
| `DELETE` | `/api/events/[id]/rsvps/[rsvpId]` | Remove one response. |
| `GET` | `/api/events/[id]/export?format=xlsx\|csv` | Download the guest list. |
| `POST` | `/api/uploads` | Image upload (authenticated, 5 MB, raster only). |
| `POST` | `/api/public/events/[slug]/rsvp` | **Public** RSVP submission. |
| `GET` | `/event/[slug]/calendar.ics` | **Public** calendar file. |

`PATCH /api/events/[id]` takes a discriminated union on `section` rather than
three separate endpoints, so each payload shape is independently validated while
the auth and ownership plumbing exists once.

Every response uses one envelope:

```jsonc
{ "data": { } }                                        // success
{ "error": "…", "fields": { "email": "…" } }           // failure
```

---

## Accessibility

Not an afterthought — the invitation page is opened by people who never chose
this software.

* Form primitives (`src/components/ui/field.tsx`) wire up `<label for>`,
  `aria-describedby` and `aria-invalid` by construction, so they cannot be
  forgotten.
* Validation messages use `role="alert"`; the RSVP table header carries
  `aria-sort`; busy buttons carry `aria-busy`.
* A visible focus ring is restored globally — Tailwind's reset removes the UA
  outline, and an app people tab through is unusable without one.
* The countdown does not announce every second; a single summary is exposed to
  screen readers instead.
* `prefers-reduced-motion` is respected.
* A skip link, and a mobile-first layout that reflows to one column.

Contrast is the organiser's responsibility for their own palette; the admin UI
uses a fixed, accessible palette that their choices cannot affect.

---

## Going live

Everything below is configuration; no code changes are needed to move between
hosts.

### The one thing to understand first: two URL variables

| | Read at | Used for | Change it by |
| --- | --- | --- | --- |
| `APP_URL` | **runtime** | Invitation links in emails, the URL inside `.ics` files, the "copy link" button, `robots.txt` | Restarting |
| `NEXT_PUBLIC_APP_URL` | **build** | `<meta>` tags only (`metadataBase`, Open Graph) | Rebuilding |

Set both to your public origin. They exist separately because `NEXT_PUBLIC_*` is
inlined into the JavaScript bundle during the build — which is fine for a meta
tag and wrong for a link you email to a guest three weeks later.

If you leave `APP_URL` unset, the app derives its origin from the request's
`X-Forwarded-Host` / `Host` headers — but **only** when `AUTH_TRUST_HOST=1`,
because those headers are attacker-controlled otherwise. Building an email link
out of an unvalidated `Host` is how host-header injection works. With neither
set, the server warns loudly at boot and falls back to the build-time value.

---

### Vercel

1. **Push the repository** and import it at [vercel.com/new](https://vercel.com/new).
   Framework detection handles the build.

2. **Add Postgres** — Vercel Postgres, [Neon](https://neon.tech) or
   [Supabase](https://supabase.com). Set `DATABASE_URL` to the *pooled* string
   and `DIRECT_URL` to the *direct* one. Both are already wired into
   `schema.prisma`; migrations use the direct connection because transaction-mode
   poolers cannot run the DDL and advisory locks they need.

3. **Add Blob storage** (Storage → Create → Blob) and set
   `STORAGE_DRIVER=vercel-blob`. Vercel's filesystem is read-only and
   per-invocation, so `local` cannot work — the app refuses to boot in that
   combination rather than silently 404-ing every uploaded image.

4. **Set the environment variables** for Production *and* Preview:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Pooled Postgres connection string |
   | `DIRECT_URL` | Direct (non-pooled) connection string |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `APP_URL` | `https://your-domain.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
   | `EMAIL_PROVIDER` | `resend` |
   | `EMAIL_FROM` | `Party Planner <noreply@your-domain.com>` |
   | `RESEND_API_KEY` | From [resend.com](https://resend.com) |
   | `STORAGE_DRIVER` | `vercel-blob` |
   | `BLOB_READ_WRITE_TOKEN` | Added automatically with Blob storage |
   | `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Recommended — see *Rate limiting* below |

5. **Run migrations on deploy.** Project Settings → Build Command:

   ```
   prisma migrate deploy && next build
   ```

6. **Verify your sending domain** in Resend and point `EMAIL_FROM` at it, or
   your notification mail lands in spam.

Auth.js detects Vercel and trusts the deployment host automatically, so
`AUTH_TRUST_HOST` is not needed there.

---

### Docker (Fly.io, Railway, Render, Cloud Run, a VPS)

A multi-stage `Dockerfile` is included. It builds Next's `standalone` output, so
the runtime image carries the compiled server and the traced `node_modules` only
— roughly 200 MB — and runs as a non-root user with a `HEALTHCHECK` wired to
`/api/health`.

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com -t party-planner .

docker run -p 3000:3000 \
  -e APP_URL=https://your-domain.com \
  -e AUTH_TRUST_HOST=1 \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL=postgresql://... \
  -e DIRECT_URL=postgresql://... \
  -e EMAIL_PROVIDER=resend -e RESEND_API_KEY=... \
  -e EMAIL_FROM="Party Planner <noreply@your-domain.com>" \
  -v party-planner-uploads:/app/public/uploads \
  party-planner
```

Or the whole stack — app, database, volumes — with:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

Three things matter here:

* **`AUTH_TRUST_HOST=1` is required.** Without it Auth.js refuses to build
  callback URLs from the `Host` header and sign-in fails with *"There was a
  problem with the server configuration"*. Only set it when something you control
  (nginx, Caddy, Traefik, Cloudflare) overwrites `Host` and `X-Forwarded-*`.
* **Mount a volume at `/app/public/uploads`** when `STORAGE_DRIVER=local`, or
  every banner and logo disappears on the next deploy.
* **Terminate TLS in front of the container.** It serves plain HTTP on 3000, and
  `docker-compose.prod.yml` binds it to `127.0.0.1` for exactly that reason.

---

### Rate limiting across instances

Rate limits are counted in-process by default. That is correct for one
long-lived server and wrong the moment you scale: on serverless or across
several containers the real budget becomes `limit × instances`.

Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` and the counters move
to a single shared Redis. Nothing else changes; if Redis is unreachable the app
falls back to the in-memory counter for that request rather than rejecting it.

Behind Cloudflare, also set `TRUSTED_PROXY_HEADER=cf-connecting-ip` so the limit
keys on an IP that cannot be forged end-to-end.

---

### Security headers

`next.config.ts` sends a CSP, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, and HSTS (production only — sending it
from a local http server would pin `localhost` to https in your browser).
Uploaded files get their own `default-src 'none'; sandbox` policy, since they are
user-supplied bytes served from our own origin.

**Hardening further.** `script-src` allows `'unsafe-inline'` because Next emits
inline bootstrap and hydration scripts. Removing it means generating a
per-request nonce in middleware and threading it through — which also opts every
page out of static rendering. That is a deliberate trade-off, not an oversight;
the header as it stands still blocks third-party script, framing, cross-origin
form submission and `<base>` injection.

---

### Search engines

Invitation pages are `noindex` by default and excluded in `robots.txt`. The URL
is the secret, and the page carries a venue address, the host's phone number and
a live head count — "anyone with the link" should not quietly become "anyone who
searches for the venue". Only the marketing page opts back in.

For events that *should* be findable (a public conference), remove `/event/` from
`src/app/robots.ts` and set `robots: { index: true }` in
`src/app/event/[slug]/page.tsx`.

---

### Pre-flight checklist

`src/instrumentation.ts` runs at boot and **refuses to start** on a broken
production config — Blob storage selected with no token, `local` storage on
Vercel, a mail provider with no credentials. It warns (but starts) when
`EMAIL_PROVIDER=console`, or when no runtime origin is configured.

Before pointing a domain at it:

- [ ] `AUTH_SECRET` is a fresh 32-byte random value, not the example
- [ ] `APP_URL` and `NEXT_PUBLIC_APP_URL` are your real origin
- [ ] `DIRECT_URL` points at the non-pooled connection
- [ ] `npx prisma migrate deploy` has run against the production database
- [ ] `EMAIL_PROVIDER` is not `console`, and the sending domain is verified
- [ ] `STORAGE_DRIVER` matches the host (`vercel-blob` on Vercel; `local` + a volume elsewhere)
- [ ] `ALLOW_PUBLIC_REGISTRATION=false` unless you want anyone to sign up
- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Google OAuth (if used) has `https://your-domain.com/api/auth/callback/google` as an authorised redirect URI

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run db:local` | Local Postgres without Docker (`-- --reset` to start clean) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create and apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Demo data |
| `npm run db:studio` | Prisma Studio |

Container builds set `BUILD_STANDALONE=1`, which switches `next.config.ts` to
Next's standalone output. It is opt-in because standalone is incompatible with
`next start`, which is what `npm start` runs.

---

## Known limitations

Worth knowing before this goes in front of real guests:

* **Rate limiting needs Redis once you scale.** In-process counters are the
  default and are correct for a single server; set the Upstash variables for a
  shared counter across instances. See *Rate limiting across instances*.
* **The CSP allows inline scripts.** A deliberate trade-off — see *Security
  headers* for what it costs to remove.
* **Uploaded files are never garbage-collected** when an event is deleted.
* **No email verification on sign-up.** Organisers are trusted once they hold the
  password. Add an Auth.js email provider if that matters for your deployment.
* **`xlsx` is pinned to 0.18.5**, the last version published to npm by SheetJS.
  Newer releases are distributed from `https://cdn.sheetjs.com`; switch the
  dependency to their CDN tarball if you need the latest.
* **Single-organiser events.** There is no concept of co-hosts or shared access.
* **No automated tests yet.** The service layer is pure and dependency-injectable
  enough to test directly — that is where to start.
