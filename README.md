# MfgPlan — Manufacturing Line Planning Platform

MfgPlan helps engineers plan new-product manufacturing lines: capture a
component's CAD reference and derived parameters, describe the intended
process in plain language, get rule-based machine recommendations scored
against a seeded equipment catalog, visualize the process flow, trace the
full "digital thread" from component to report, watch a simulated "digital
twin" telemetry dashboard, and compare planning iterations to arrive at a
recommended line configuration.

This is a demo-grade internal engineering tool: Next.js 14 (App Router) +
TypeScript + Tailwind CSS, with Supabase for persistence/auth/storage. **No
CAD geometry is parsed** — files are stored as references only, and
dimensions/tolerances are entered manually.

---

## Architecture overview

```
app/                         Next.js App Router pages + server actions
  actions.ts                 All server actions (form mutations)
  login/                      Email/password sign-in + sign-up
  dashboard/                 Projects list
  projects/new/               New project form
  projects/[projectId]/
    page.tsx                  Project overview (components + iterations)
    components/new/            Component input (CAD upload + params)
    components/[componentId]/process/   NL process definition + stage editor
    iterations/                Iteration history + compare selector
    iterations/compare/        Side-by-side iteration comparison
    iterations/[iterationId]/
      page.tsx                  Digital thread (lineage) view
      recommendations/           Per-stage scored machine cards
      flow/                      React Flow process diagram
      twin/                      Simulated digital twin dashboard
      report/                    Printable report + jsPDF export
    recommended/                Recommended flow summary (best iteration)

components/                  Shared UI (Sidebar, SignOutButton, forms, cards, diagrams)

lib/
  types.ts                   Core domain types + process taxonomy
  processParser.ts           Rule-based NL -> process stage parser
  scoring.ts                 Deterministic machine applicability scoring
  estimate.ts                Simple cycle-time / cost estimation heuristics
  auth.ts                    getCurrentUserId(): real session or mock user
  supabaseClient.ts          isSupabaseConfigured / CAD_BUCKET helpers
  supabase/
    server.ts                 Cookie-aware Supabase client (Server Components/Actions)
    client.ts                 Browser Supabase client (Client Components, e.g. /login)
  data/
    index.ts                 Unified data-access layer (Supabase <-> mock)
    mockStore.ts              In-memory mock repository (demo fallback)
    machineCatalog.ts          Seeded machine catalog (40 machines, 15 process types)

middleware.ts                 Session refresh + route protection (/dashboard, /projects/*)

supabase/
  migrations/0001_init.sql    Table definitions
  migrations/0002_rls.sql     Row Level Security policies

scripts/seed.ts               Seeds `machines` table in a real Supabase project
```

### Data layer / mock fallback

Every data operation lives behind `lib/data/index.ts`. Each exported
function checks `isSupabaseConfigured` (true only when
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set) and
either calls the real Supabase client or the in-memory mock store
(`lib/data/mockStore.ts`). This means:

- `npm run dev` works immediately with **zero configuration** — a demo
  project, component, and process definition are pre-seeded in memory.
- Swapping to a real Supabase backend requires no UI/component changes —
  only environment variables.

### Process parsing (`lib/processParser.ts`)

Rule-based, deterministic, **not an LLM call**. The input text is split
into clauses (on commas, "then", "after that", "followed by", periods,
etc.), and each clause is matched against a taxonomy of 15 process types
(cutting, turning, milling, drilling, grinding, forming/stamping,
welding/joining, casting, injection molding, additive/3D printing, heat
treatment, surface finishing/coating, inspection/QA, assembly, packaging)
using keyword/regex lists. The longest keyword match wins ties. Clauses
with no match are flagged with an empty `matched_keywords` array so the UI
can visually surface a low-confidence badge — the operator can then edit,
retype, reorder, add, or remove any stage before recommendations are
generated.

### Machine scoring (`lib/scoring.ts`)

Deterministic, weighted, and fully documented in code comments. For a
process stage, only machines whose `process_type` matches are considered
(a hard gate). Each candidate is then scored 0-100% across five weighted
factors that re-normalize to 100 once the gate is applied:

| Factor | Weight | Logic |
|---|---|---|
| Material hardness fit | 25% | Component HB vs. machine's rated hardness range, partial credit by distance outside range |
| Material tensile fit | 18.75% | Same idea for tensile strength (MPa) |
| Tolerance capability | 25% | Machine tolerance ≤ required tolerance = full credit; looser capability is penalized proportionally |
| Work envelope / weight fit | 18.75% | Component bounding box + weight vs. machine envelope + max part weight |
| Surface finish capability | 12.5% | Machine Ra capability vs. required Ra |

Missing machine specs default to a moderate score (50-70%) rather than
zero, so incomplete catalog data doesn't unfairly tank a score. The full
breakdown (per-factor score + explanation) is stored per recommendation
and shown in the UI ("Show scoring breakdown").

### Cost / cycle-time estimates (`lib/estimate.ts`)

Per-stage cycle time comes from the machine's `throughput_parts_per_hour`
spec when available, else a flat per-process-type fallback. Cost = cycle
time (hours) × the machine's hourly rate. Totals are simple sums across
the stage sequence (single serial line, no parallelization) — a
first-order estimate for planning, not a scheduling engine.

### Digital twin (simulated)

`lib/data/index.ts#generateTwinSnapshots` creates randomized telemetry
(utilization %, cycle time, status, last maintenance date) per selected
machine. **This is clearly labeled as simulated in the UI** — there is no
live machine connection.

---

## Setup instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Run without Supabase (demo mode)

No configuration needed:

```bash
npm run dev
```

The app falls back to an in-memory mock data layer with a pre-seeded demo
project/component/process definition and the full 40-machine catalog.
State resets whenever the dev server restarts.

### 3. Connect a real Supabase project (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor (or via the Supabase CLI: `supabase db push`), run the
   migrations in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
3. Create a Storage bucket named `cad-files` (private). The storage RLS
   policy snippet is included as a comment at the bottom of
   `0002_rls.sql` — uncomment and run it after creating the bucket.
4. Copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_CAD_BUCKET=cad-files
   ```
5. Seed the machine catalog:
   ```bash
   npm run seed
   ```
6. Set up authentication (see "Setting up authentication" below) before
   using the app against this Supabase project — with real Supabase
   configured, every table is protected by Row Level Security policies
   that require `auth.uid() = user_id`, so the app is unusable until a
   real signed-in session exists.

### 4. Setting up authentication

Auth is real Supabase email/password auth, wired through `@supabase/ssr`
(`lib/supabase/server.ts` for Server Components/Actions, `lib/supabase/
client.ts` for the `/login` page, `middleware.ts` for session refresh +
route protection). This only applies when `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set — in zero-config demo mode there's
nothing to set up, the app keeps using the fixed mock user.

1. **Enable the email/password provider.** In the Supabase dashboard, go to
   **Authentication → Providers → Email** and make sure it's enabled
   (it is by default on new projects).
2. **Decide on email confirmation.** Go to **Authentication → Settings**
   (sometimes labeled **Authentication → Providers → Email** →
   "Confirm email"):
   - **For quick testing/demos:** toggle **Confirm email off**. Sign-up
     then returns a session immediately and `/login` redirects straight to
     `/dashboard` after `supabase.auth.signUp()`.
   - **Left on (recommended before sharing the app):** sign-up sends a
     confirmation email and does *not* return a session. The `/login` page
     detects this (`data.session` is null after `signUp()`) and shows a
     "check your email" message instead of redirecting. The user must click
     the link in that email before they can sign in.
3. **Set Site URL and Redirect URLs.** Go to **Authentication → URL
   Configuration** and set:
   - **Site URL** to your deployed app's URL, e.g.
     `https://mfgplan.vercel.app` (or `http://localhost:3000` for local
     dev).
   - **Redirect URLs** to include every origin you use the app from, e.g.
     both `http://localhost:3000/**` and `https://mfgplan.vercel.app/**`.
   Supabase rejects auth redirects to URLs not on this list, so a
   deployed Vercel app with only `localhost` configured here will fail to
   complete auth flows (most noticeably: email confirmation links).
4. **No new environment variables are required.** Auth reuses the existing
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values.
5. **Known limitations of this build:** no password reset / "forgot
   password" flow, no OAuth providers (email/password only), and no custom
   email-confirmation UI beyond Supabase's default hosted confirmation page
   and the inline "check your email" message on `/login`.

### 5. Build & lint

```bash
npm run lint
npm run build
npm run start
```

---

## Deploying to Vercel

1. Push this repository to GitHub (see below).
2. In Vercel, "Add New Project" → import the GitHub repo.
3. Framework preset: Next.js (auto-detected).
4. Add environment variables in the Vercel dashboard (Project Settings →
   Environment Variables): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_CAD_BUCKET`. Omit them entirely to deploy in demo/mock mode.
5. Deploy. Subsequent pushes to the connected branch auto-deploy.

## Initializing git & pushing to GitHub

```bash
cd mfgplan
git init
git add -A
git commit -m "Initial commit: MfgPlan manufacturing line planning platform"

# Option A: GitHub CLI
gh repo create mfgplan --private --source=. --remote=origin --push

# Option B: manual remote
git remote add origin https://github.com/<your-username>/mfgplan.git
git branch -M main
git push -u origin main
```

---

## Known limitations / stubs

- **Auth**: in demo mode a fixed mock user is used everywhere (no
  `/login` needed). In Supabase mode, real email/password auth via
  `@supabase/ssr` is wired up (`/login`, `middleware.ts` route protection,
  cookie-based sessions) — but there is no password reset flow and no
  OAuth providers, and email confirmation UX is Supabase's default hosted
  page unless "Confirm email" is turned off (see "Setting up
  authentication" above).
- **CAD parsing is explicitly out of scope** — uploads are stored/reference
  only; all dimensions are manually entered.
- **Mock data layer is in-memory** and resets on dev server restart (not
  persisted to disk).
- **Cost/cycle-time estimates** are simple heuristics (serial line, no
  labor shift modeling, no changeover time) — see `lib/estimate.ts`.
- **Resource requirements** (labor headcount, floor space) on the
  "Recommended flow" page are stub heuristics, clearly commented in
  `app/projects/[projectId]/recommended/page.tsx`.
- **Digital twin telemetry is fully simulated/randomized**, clearly labeled
  in the UI — there is no live equipment integration.
- The machine catalog (40 machines) has real-world-plausible specs but is
  illustrative, not sourced from a specific vendor catalog.
