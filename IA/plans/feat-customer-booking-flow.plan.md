# Implementation Plan for feat-customer-booking-flow

Implements FR13 (Customer booking flow) per
[spec](../specs/feat-customer-booking-flow.spec.md) and the [ADD](../ADD.md).
Adds a customer-facing booking capability on the launch detail view: a form that
captures the customer (email, name, phone) and seat count, shows the live total,
submits a booking, and renders a confirmation (mission, seats, total charged,
payment reference) on success or a mapped error (declined payment, insufficient
seats, not-found, validation) on failure. Builds on FR6/FR7/FR8 (backend
customers, bookings, mock billing) and FR12 (catalog entry + derived
`seatsAvailable`), reusing the FR9 shell primitives.

No new persisted entities or attributes are introduced — `Customer` and
`Booking` are already modeled — so **`IA/ERM.md` is unchanged**.

## ⚠ Blocker / decision required — booking API contract mismatch

The spec (Solution Overview) states the frontend posts
`POST /api/bookings { launchId, customerEmail, name, phone, seats }` and that the
**backend resolves-or-creates the customer by email (ADR 5)** with **"no backend
changes required."** The current backend does **not** match that contract:

- `CreateBookingDto = { launchId, customerId, seats }`;
  `bookings.validation.ts` requires a non-empty `customerId`.
- `bookings.service.createBooking` does `customersRepository.findById(customerId)`
  → `404 Customer not found`; it never accepts an email nor creates a customer.
- `POST /api/customers` returns `409 Email already exists` on a duplicate email
  (create-only, not resolve-or-create), and there is no `GET /api/customers?email=`.

So the spec's frontend contract is **not** achievable without a change. Notably,
the **ADD Data Flow** and **ADR 5** already describe the intended design as
email-based resolve-or-create at the bookings endpoint
(`POST /api/bookings { launchId, customerEmail, seats }` → "resolve/create
customer by email"); the current implementation has **diverged** from the ADD.

**Recommended: Approach A (backend alignment)** — bring `POST /api/bookings` back
in line with the ADD/ADR 5/spec by accepting `{ launchId, customerEmail, name,
phone, seats }` and resolving-or-creating the customer by email inside the
booking service. This is a small, contained backend change that makes the spec's
frontend contract correct and restores ADD conformance. It contradicts the
spec's "no backend changes required" note — **that note is incorrect** and should
be updated. This plan is written for Approach A.

**Fallback: Approach B (frontend-only orchestration)** — keep the backend frozen
and have the frontend call `POST /api/customers` then `POST /api/bookings` with
the returned `customerId`, handling `409` by listing `GET /api/customers` and
matching the email client-side. Rejected as the default because it duplicates the
resolve-by-email business rule in the frontend (violates the project rule "no
business rules duplicated in the frontend" and spec §Model-and-logic) and races
on the unfiltered customer list. Documented only as a contingency if the backend
must stay untouched.

> Confirm Approach A before starting Step 2. If Approach B is mandated, Steps 2–3
> are replaced by a frontend `resolveOrCreateCustomer(email,name,phone)` helper
> and the plan's acceptance-criteria mapping shifts accordingly.

## Design decisions

- **API stays the single source of truth**: availability, pricing, billing, and
  customer identity are all decided server-side. The frontend mirrors
  `seatsAvailable` (FR12) only to bound the seat input and echoes the returned
  `totalPrice` / `paymentReference` / `paymentStatus`; it never recomputes rules.
- **Email-based resolve-or-create in the booking service (ADR 5)**: the service
  looks up the customer by email and creates one (name, phone) when absent, then
  proceeds with the existing launch → availability → charge → persist flow. No
  new endpoint; the change is internal to `bookings` + shared types.
- **Reuse the shell primitives (FR9)**: drive async UI through `use-async` and
  `LoadingState` / `ErrorState`; route all HTTP through the typed
  `services/api-client.ts` (`ApiResult<T>`). Reuse `launch-format` for
  price/total formatting. No new shared primitives.
- **Booking on the launch detail view (FR12 entry point)**: add an inline
  "Book seats" section to `LaunchDetailView.vue` gated on `seatsAvailable > 0`,
  keeping the plan minimal (no new route). A dedicated
  `/customer/launches/:id/book` route is a viable alternative but adds routing
  surface for no functional gain; inline is chosen.
- **Client validation mirrors backend rules, does not own them**: a pure
  `validation/booking-form.ts` (like `launch-form.ts`) blocks obviously invalid
  submits — non-empty email/name/phone and integer `seats` in `[1,
  seatsAvailable]` — but the server stays authoritative.
- **Explicit outcome mapping**: `201` → confirmation state; `402` → payment
  declined message (no seats reserved, no confirmation); `409` → insufficient
  seats message; `404` → shared error state; `400`/validation → field feedback.
  The typed client already surfaces HTTP status on `ApiResult` errors.
- **Sold-out is a view concern**: WHEN `seatsAvailable === 0` the form is hidden
  and replaced by the existing sold-out indicator; no request is sent.
- **Styling & quality**: `<script setup lang="ts">` + `<style scoped>` + shared
  CSS variables per `coding-vue-frontend`, `coding-typescript`,
  `.claude/rules/ts.md`; apply `designing-ux` for states, feedback,
  accessibility, and microcopy. CoreUI and Pinia stay deferred.

## Target structure (added/changed by this plan)

```text
backend/src/
├── types/
│   └── bookings.type.ts            # (edit) CreateBookingDto -> { launchId, customerEmail, name, phone, seats }
├── bookings/
│   ├── bookings.validation.ts      # (edit) validate customerEmail/name/phone instead of customerId
│   ├── bookings.service.ts         # (edit) resolve-or-create customer by email; map to Booking
│   ├── bookings.service.test.ts    # (edit/new) cover resolve-or-create + existing outcomes
│   └── bookings.router.ts          # (edit) read new body fields; same status mapping
frontend/src/
├── types/
│   └── booking.type.ts             # (new) mirror Booking + CreateBookingDto (email-based)
├── services/
│   └── bookings-api.ts             # (new) createBooking(dto): ApiResult<Booking>
├── validation/
│   ├── booking-form.ts             # (new) pure validators (email/name/phone/seats<=available)
│   └── booking-form.test.ts        # (new) unit tests for the validators
├── components/
│   └── BookingForm.vue             # (new) fields + live total + submitting + field errors
└── views/
    └── LaunchDetailView.vue        # (edit) inline booking section + confirmation + error mapping
tests/
└── bookings.spec.ts                # (edit) email-based create: 201/402/409/404/validation
frontend E2E (tests/frontend-*.spec.ts)  # (new) booking flow acceptance coverage
```

### Step 1: Confirm the API contract (resolve the blocker)
Lock the booking contract before writing code.
- [ ] Confirm **Approach A** (backend resolve-or-create by email) with the owner; if rejected, switch to the Approach B fallback and adjust Steps 2–3.
- [ ] Note in the spec that the "no backend changes required" statement is superseded (the backend had diverged from the ADD Data Flow / ADR 5).
- [ ] Agree the request body shape `{ launchId, customerEmail, name, phone, seats }` and the outcome map (`201/402/409/404/400`).

### Step 2: Backend — resolve-or-create customer by email on booking
Align `POST /api/bookings` with the ADD Data Flow and ADR 5.
- [ ] Change `CreateBookingDto` in `backend/src/types/bookings.type.ts` to `{ launchId, customerEmail, name, phone, seats }`; keep the `Booking` entity (with `customerId`) unchanged.
- [ ] Update `bookings.validation.ts`: require non-empty `launchId`, `customerEmail`, `name`, `phone` and positive-integer `seats` (reuse shared `nonEmptyString`/`positiveInteger`).
- [ ] Update `bookings.service.createBooking`: load launch (→ `not-found`), resolve customer via `customersRepository.findByEmail(email)` or create one with `{ email, name, phone }`, then run the unchanged availability → `charge` → persist flow (persist stores the resolved `customerId`).
- [ ] Update `bookings.router.ts` to read the new body fields; keep the existing `not-found`/`conflict`/`payment-failed`/`201` mapping intact.

### Step 3: Backend — tests for email-based booking
Prove resolve-or-create and every outcome.
- [ ] Extend `bookings.service.test.ts` (Vitest): creates a new customer when the email is unknown, reuses the existing customer when the email matches, and preserves the `404`/`409`/`402`/`201` outcomes.
- [ ] Update `tests/bookings.spec.ts` (Playwright) to post `{ launchId, customerEmail, name, phone, seats }`: assert `201` + returned `totalPrice`/`paymentReference`, `409` on oversell, `402` on declined payment, `404` on a missing launch, and `400` on validation failures.

### Step 4: Frontend — booking types, API service, and form validation
Mirror the DTOs and add the typed booking call plus pure validators.
- [ ] Add `frontend/src/types/booking.type.ts` mirroring `Booking` and `CreateBookingDto` (`{ launchId, customerEmail, name, phone, seats }`); the API stays authoritative.
- [ ] Add `services/bookings-api.ts` with `createBooking(dto): Promise<ApiResult<Booking>>` (`POST /bookings`, JSON headers) following the `launches-api.ts` pattern.
- [ ] Add `validation/booking-form.ts` (+ `.test.ts`): non-empty `email`/`name`/`phone`, and `seats` an integer in `[1, seatsAvailable]`; expose `validateBookingForm(input, seatsAvailable)` and `isBookingFormValid(errors)` mirroring `launch-form.ts`.

### Step 5: Frontend — BookingForm component
Presentational form with live total and submit/validation feedback.
- [ ] Build `components/BookingForm.vue` (`<script setup lang="ts">`) with inputs for email, name, phone, and seats; props `{ seatsAvailable, pricePerSeat, submitting }`; emit `submit: [CreateBookingDto-without-launchId]` and `cancel`.
- [ ] Show the unit price and a live computed total (`seats × pricePerSeat`) via `launch-format.formatSeatPrice`; bound the seats input to `[1, seatsAvailable]`.
- [ ] Wire per-field errors (blur/submit revalidate like `LaunchForm.vue`), disable the submit button while `submitting`, and keep the component free of any fetching.

### Step 6: Frontend — integrate booking flow into LaunchDetailView
Connect the form to the API, handle in-flight/confirmation/error states, map outcomes.
- [ ] In `LaunchDetailView.vue`, render the `BookingForm` inline when `seatsAvailable > 0`; keep the existing sold-out indicator (and no form) when `seatsAvailable === 0` (never submits).
- [ ] On submit, call `createBooking({ launchId, ...form })` behind a local `submitting` flag (disable resubmission; reuse `LoadingState`/inline busy text) and, on success, refresh the launch read so `seatsAvailable` reflects the new booking.
- [ ] On `ok`, show a confirmation panel: mission, seats booked, total charged (`totalPrice`), payment reference, and customer email; hide the form.
- [ ] On failure, map by `error.status`: `402` → payment-declined message, `409` → insufficient-seats message, `404` → shared `ErrorState`, `400` → field feedback; never show a confirmation on failure. Apply `designing-ux` microcopy/focus.

### Step 7: Verify and finalize
Typecheck, test, and confirm every acceptance criterion end-to-end.
- [ ] `cd backend && npm run test` and `cd frontend && npm run test` green; `cd backend && npm run build` and `cd frontend && npm run build` (`vue-tsc -b && vite build`) pass with no type errors.
- [ ] Add Playwright E2E (e.g. `tests/frontend-bookings.spec.ts`) covering: form shown with remaining seats, hidden when sold out, field validation blocks submit, live total updates with seats, successful booking → confirmation (mission/seats/total/reference), `402`/`409` error messages without confirmation, and `404` error state.
- [ ] Manual check (backend + frontend dev running): book seats from detail, confirmation shows charge + reference, availability drops, declined/oversell/not-found paths surface the right messages.
- [ ] Update PRD FR13 status `NotStarted → InProgress` (add Plan link); set this spec status `Planned → InProgress` while building (Done on completion). `IA/ERM.md` unchanged.

## Acceptance Criteria coverage

| Criterion (spec) | Step |
|---|---|
| Launch with remaining seats presents a form (email, name, phone, seats) | 5, 6 |
| Zero remaining seats prevents booking and sends no request | 6 |
| Invalid seats / empty email-name-phone → field feedback, no submit | 4, 5 |
| Seat count change updates total = seats × price per seat | 5 |
| Valid submit sends `POST /api/bookings` with launch id, email, name, phone, seats | 2, 4, 6 |
| In-progress request shows loading and disables resubmission | 6 |
| Success shows confirmation (mission, seats, total, payment reference) | 6 |
| `402`/`409` failure shows the matching error, no confirmation | 2, 3, 6 |
| `404` launch shows the shared error state | 2, 3, 6 |

## Out of scope / follow-ups

- New endpoints — none beyond the existing `POST /api/bookings` (contract aligned to email-based resolve-or-create).
- Customer self-management UI, booking history/list for a customer — not in FR13.
- CoreUI styling adoption (`styling-coreui`) and Pinia/global store — still deferred.
- `IA/ERM.md` — unchanged; no new persisted entities or attributes.
