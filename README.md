# formCraftAI

An AI-powered form builder. Describe the form you want in plain English, and
Gemini generates it; then customize fields, theming, validation, and logic,
share a public link, and collect + analyze responses in real time.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works (end-to-end flow)](#how-it-works-end-to-end-flow)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Key modules explained](#key-modules-explained)
- [Security model](#security-model)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Conventions & gotchas](#conventions--gotchas)

---

## Features

**Form creation & editing**
- Generate a full form from a natural-language description (Gemini).
- 10 field types: text, long text, email, number, phone, date, dropdown,
  radio, checkbox (multi-select), star rating, file upload.
- Drag / up-down reorder, add fields, add page breaks (multi-step forms).
- Per-field **validation rules**: min/max length, numeric range, and an
  “Accepted format” picker (letters only, numbers only, email, custom regex)
  with a custom error message.
- **Conditional logic** — show a field only when another field’s answer matches.
- **Phone fields** get an international dialing-code picker (123 countries) with
  per-country length validation.
- **Theming**: daisyUI theme presets + gradient backgrounds + inline drag color
  pickers (react-colorful) with live preview. Form appearance is decoupled from
  the editor’s light/dark mode.

**Publishing & collecting**
- Unguessable **UUID URLs** (`/aiform/<uuid>`) so forms can’t be enumerated.
- Form settings: close form, max responses, one-response-per-user, custom
  thank-you message/description, redirect URL, Google Sheet link.
- Social-auth gating (require sign-in before submit).
- Spam protection: honeypot + in-memory rate limiting; payload/file-size guards;
  server-side validation of every rule.

**Responses & analytics**
- Live responses table (polls every 5s), search, column sort, pagination.
- Row selection + bulk delete, delete-all.
- CSV and Excel export.
- Summary tab: color-coded distribution bars + submissions-over-time chart.
- Optional Google Sheets sync (append on submit, delete row on delete).
- Owner + respondent email notifications (Resend).

**Billing**
- Free plan limited to 3 forms; Pro (“Hero”) plan unlocks unlimited via Razorpay
  (legacy PhonePe code retained).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Auth | Clerk (`@clerk/nextjs`) |
| DB | Neon Postgres via Drizzle ORM (`drizzle-orm/neon-http`) |
| AI | Google Gemini (`gemini-2.5-flash`) |
| Styling | Tailwind CSS + daisyUI (form themes) + shadcn/ui (app UI) |
| Payments | Razorpay (client checkout + HMAC verify); PhonePe (legacy) |
| Email | Resend (REST) |
| Sheets | Google Sheets REST API (service-account JWT, no SDK) |
| Misc | react-colorful, qrcode.react, next-themes, xlsx, sonner, moment |
| Tests | Vitest |

Server logic runs almost entirely through **React Server Actions** (`"use server"`
files in `app/_actions/`), so secrets never reach the browser.

---

## How it works (end-to-end flow)

### 1. Create
`app/_components/CreateForm.jsx` → `createForm(description)` in
[`app/_actions/forms.js`](app/_actions/forms.js):
1. Auth check + free-plan limit (3 forms unless paid).
2. Sends `description + PROMPT` to Gemini; expects strict JSON
   (`formTitle`, `formSubheading`, `formFields[]`).
3. Inserts a `jsonForms` row and returns `{ id, uuid }`.
4. Client routes to `/edit-style/<uuid>`.

### 2. Edit & style
`app/edit-style/[formId]/page.jsx` loads the form by uuid (`getForm`), then renders:
- **`Controller`** — theme/background/style pickers + social-auth toggle.
- **`FormSettings`** — close/limits/thank-you/redirect/Google Sheet.
- **`AddFieldDialog` / `FieldEdit` → `FieldForm`** — add/edit a field
  (type, label, options, required, validation rules, conditional logic).
- **`FormUi`** — the live, editable form preview.

Every change persists via `updateFormJson` / `updateFormColumn` /
`updateFormSettings`. All field reads/writes go through the canonical accessors
in [`app/_data/fieldUtils.js`](app/_data/fieldUtils.js) (see below).

### 3. Publish & submit
Public form at `app/aiform/[formid]/page.jsx` (`getPublicForm` by uuid) renders
`FormUi` in non-editable mode. On submit → `submitResponse(formId, data, meta)`
in [`app/_actions/responses.js`](app/_actions/responses.js):
1. Honeypot check → silent success for bots.
2. IP+form rate limit; payload & per-file size guards.
3. Load form; enforce `closed` / `maxResponses` / `limitOneResponse` / sign-in.
4. Server-side validation: field rules (length/range/format), phone length,
   allowed file types.
5. Insert `userResponses` row.
6. Fire-and-forget: owner email, respondent confirmation (if sign-in gated),
   Google Sheet append.
7. Show thank-you screen or redirect.

### 4. Analyze
`app/dashboard/responses/page.jsx` → `FormListItemResponse.jsx`:
`getResponses` (owner-checked) feeds a live table with search/sort/pagination,
bulk/all delete, CSV/Excel export, and a color-coded Summary tab.

### 5. Billing
`app/dashboard/upgrade/page.jsx` → `app/_actions/razorpay.js`
(`createRazorpayOrder`, `verifyRazorpayPayment` with HMAC-SHA256). On success the
user’s `paymentSuccess` flips true, lifting the 3-form cap.

---

## Project structure

```
app/
  _actions/            Server Actions ("use server") — all privileged logic
    forms.js             createForm (AI), getForm/getPublicForm, update*, rename/duplicate/delete
    responses.js         submitResponse, getResponses, delete/deleteAll, validation, notify, sheet sync
    razorpay.js          order creation + signature verification
    payments.js          legacy PhonePe
    user.js              getPaymentStatus
  _components/         Landing/shared: CreateForm, Header, Hero, ShareDialog, ThemeProvider, ModeToggle
  _data/               Client data + helpers
    fieldUtils.js        Canonical field accessors & builders (the heart of the app)
    dialCodes.js         123 country dialing codes + phone length validator (shared client/server)
    Themes.jsx / GradientBg.jsx / Style.jsx   theme/background/style presets
  _lib/                Server utilities
    rateLimit.js         in-memory sliding-window limiter
    email.js             Resend REST wrapper
    googleSheets.js      service-account JWT auth + append/delete/clear rows
  aiform/[formid]/     Public form (by uuid)
  api/
    file/[id]/[field]/  Streams an uploaded file stored as a data URL
    status/[id]/        Public payment callback (must stay unauthenticated)
  dashboard/           Auth-gated: form list, responses, upgrade, SideNav
  edit-style/          Form editor
    [formId]/page.jsx    Editor page (loads by uuid)
    _components/         Controller, FormUi, FieldForm, FieldEdit, AddFieldDialog, FormSettings, FormHeaderEdit
  (auth)/              Clerk sign-in / sign-up
  layout.js            Root layout (Clerk + ThemeProvider)
components/ui/         shadcn/ui primitives (button, dialog, select, table, popover, …)
configs/
  index.js             Drizzle db client (Neon)
  schema.js            Drizzle table definitions
  AiModal.js           Gemini chat session config
middleware.js          Clerk middleware (protects /dashboard; /api/status public)
__tests__/             Vitest: fieldUtils, rateLimit
```

---

## Data model

Drizzle schema in [`configs/schema.js`](configs/schema.js):

- **`users`** — `id`, `email`, `paymentSuccess` (Pro flag).
- **`jsonForms`** — `id` (int PK), **`uuid`** (public URL id, unguessable),
  `jsonform` (the AI/edited JSON as text), `theme`/`background`/`style`,
  `createdBy` (email), `createdAt`, `enabledSignIn`, and settings columns:
  `closed`, `maxResponses`, `limitOneResponse`, `thankYouMessage`,
  `thankYouDescription`, `redirectUrl`, `googleSheetId`.
- **`userResponses`** — `id`, `jsonResponse` (text), `createdBy` (email or
  `anonymous`), `createdAt`, `formReference` → `jsonForms.id`.
- **`payments`** — `transactionId`, `email`, `status`, `createdAt` (payment audit).

Forms are addressed **publicly by `uuid`** and **internally (owner ops) by the
integer `id`**.

---

## Key modules explained

### `app/_data/fieldUtils.js` — the normalization layer
Gemini emits inconsistent key names across generations (`fieldName` vs
`formFieldName`, `label` vs `formLabel`, `options` vs `items`, …). **Every**
consumer reads through these accessors instead of touching raw keys:

- `getFieldName / getFieldLabel / getFieldPlaceholder / getFieldRequired / getFieldOptions`
- `getEffectiveType` — infers email/phone intent from a text field’s label/name
- `getFieldRules` — normalized validation (`minLength/maxLength/min/max/pattern/message`)
- `getFieldCondition` — conditional-logic rule
- `getFileTypes`, `isPageBreak`, `isPhoneField`, `splitIntoPages`
- `makeField` / `applyFieldPatch` — write canonical keys (used by the editor)

### `app/edit-style/_components/FormUi.jsx` — the renderer
Renders both the editor preview and the public form. Handles every field type,
debounced inline validation, required-gating, multi-page navigation, phone
code+number composition, file-to-dataURL upload, submit loader, thank-you/closed
screens, and theme-consistent styling (text color derived from theme, not the
app’s dark mode).

### `app/_data/dialCodes.js`
Single source of truth for phone country codes and accepted number lengths,
imported by both the client renderer and the server validator via
`phoneLengthError()` so they can never drift.

### `app/_lib/googleSheets.js`
No SDK: signs a service-account JWT (RS256) with Node `crypto`, exchanges it for
an access token, and calls the Sheets REST API to append / delete / clear rows.

---

## Security model

- **All privileged logic is server-only** (Server Actions). Secrets are never
  meant to be `NEXT_PUBLIC_*`; the browser bundle should contain no DB/API keys.
- **Ownership checks** on every owner action (`createdBy === current user email`).
- **UUID URLs** prevent form enumeration; integer ids are never exposed publicly.
- **Server-side enforcement** of all form settings and validation rules — the
  client checks are only hints and can’t be bypassed.
- **Spam/abuse**: honeypot field, per-IP+form rate limiting, payload/file caps.
- `middleware.js` protects `/dashboard` and keeps `/api/status` public for the
  cross-site payment callback.

> ⚠️ Known issue tracked in project memory: some secrets are currently exposed
> to the browser via `NEXT_PUBLIC_` prefixes — audit before production.

---

## Local setup

```bash
# 1. Install
npm install

# 2. Configure env (see below), then push the schema to Neon
npm run db:push        # if it hangs on the interactive prompt, apply schema via direct SQL

# 3. Run
npm run dev            # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run lint`,
`npm run db:studio`, `npm test`, `npm run test:watch`.

> Do **not** run `npm run build` against a live `next dev` server — it corrupts
> the dev server’s `.next` output.

---

## Environment variables

Create `.env.local`:

```bash
# Database (server-only)
DATABASE_URL=postgres://...neon...

# AI
GEMINI_API_KEY=...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Email (Resend) — sandbox only delivers to the account owner's email
RESEND_API_KEY=...
RESEND_FROM=onboarding@resend.dev

# Google Sheets (service account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000/
```

---

## Testing

```bash
npm test          # run once
npm run test:watch
```

Vitest covers the pure logic that most needs guarding:
- `__tests__/fieldUtils.test.js` — type normalization, accessors, `makeField`/
  `applyFieldPatch`, validation-rule persistence.
- `__tests__/rateLimit.test.js` — sliding-window limiter.

### Testing the payment flow (Razorpay test mode)

With **test** keys (`RAZORPAY_KEY_ID=rzp_test_…`), no real money moves. To reach
the pay screen you must be **signed in** and treated as **free**
(`users.paymentSuccess = false`); paid users don’t see it. Then open
**Dashboard → Upgrade → Pay** and use one of the following.

**UPI (recommended — avoids the “international cards not allowed” error):**
- `success@razorpay` → simulates a **successful** payment
- `failure@razorpay` → simulates a **failed** payment

**Test card:**
- Number: `4111 1111 1111 1111`
- Expiry: any future date (e.g. `12/34`)
- CVV: any 3 digits (e.g. `123`)
- Name: anything; on the 3-D Secure page click **Success**.
- If this is rejected as international, use the UPI method above or a domestic
  test card from Razorpay’s official list:
  <https://razorpay.com/docs/payments/payments/test-card-details/>

**Netbanking / wallet:** pick any option → Razorpay shows a Success/Failure page.

**Contact/prefill:** any 10-digit number (e.g. `9999999999`) and any email.

> On success the server verifies the HMAC signature and flips
> `paymentSuccess = true`, lifting the 3-form free cap. Do **not** create a
> `NEXT_PUBLIC_RAZORPAY_*` variable — the client receives the key id from the
> server order response, and prefixing it would leak the key.

---

## Conventions & gotchas

- **Read fields through `fieldUtils` accessors**, never raw JSON keys — the AI
  output shape is inconsistent.
- **Neon uses the serverless HTTP driver** — no `LISTEN/NOTIFY`, so live
  responses use **5s polling**, not websockets.
- **Google→app sync is one-way** (Google has no push); deleting a sheet row
  won’t reflect back in the app.
- **Files are stored inline as base64 data URLs** (max ~2MB) and served via
  `/api/file/[id]/[field]`.
- **`/api/status` must remain public** (payment callbacks are cross-site POSTs
  without the Clerk cookie).
- **Resend sandbox** only delivers to the account owner’s address — “no email”
  in testing is usually this, not a bug.
