# Customer Booking Flow Specification

- **Reference**: [PRD](../PRD.md) FR13 (builds on FR6, FR7, FR8; depends on FR12 catalog entry point and FR9 app shell).
- **Issue**: _to be created_
- **Status**: Released
- **Plan**: [feat-customer-booking-flow](../plans/feat-customer-booking-flow.plan.md)

## Problem Description

Customers can browse the launch catalog and open a launch detail (FR12), but there is no way for them to actually book seats from the frontend. The booking capability exists only in the backend (`/api/customers`, `/api/bookings` with mock billing), leaving the customer journey unfinished: after finding a launch worth booking, a customer cannot identify themselves, reserve seats, or see whether the payment succeeded. Without a booking flow the catalog is read-only and the product's core value — reserving seats on a launch — is unreachable for end users.

### User Stories

- As a customer, I want to **enter my details (email, name, phone) and choose how many seats to book on a launch** so that I can reserve my place.
- As a customer, I want to **see a clear confirmation with the total charged and a booking reference when my payment succeeds** so that I know my seats are reserved.
- As a customer, I want to **be told when booking fails (not enough seats, payment declined, or invalid input)** so that I can correct my request or try another launch.

## Solution Overview

### User/App interface

- A booking action on the launch detail view (`/customer/launches/:id`) that opens a booking form (inline section or dedicated route, e.g. `/customer/launches/:id/book`).
- The booking form captures: customer email, name, phone, and number of seats.
- The form is disabled or hidden when the launch is sold out (`seatsAvailable` equals zero).
- Seat count selection is bounded by the launch's remaining `seatsAvailable`.
- Before submitting, the form shows the unit price and the computed total (seats × price per seat).
- On success, a confirmation state shows: mission, seats booked, total charged, payment reference, and the customer email.
- On failure, the form surfaces field-level validation feedback and API errors (insufficient seats → conflict; declined payment; not-found launch) via the shared error primitives.
- Reuse shared shell primitives: `use-async`, `LoadingState`, `EmptyState`, `ErrorState`, and the typed `api-client`; reuse `launch-format` for price/total formatting.

### Model and logic

- Frontend types mirror backend booking/customer DTOs; the API remains the single source of truth for validation, billing, and availability.
- Booking submission posts to `POST /api/bookings` with `{ launchId, customerEmail, name, phone, seats }`; the backend resolves-or-creates the customer by email (ADR 5) and bills via the mock gateway (ADR 4).
- The frontend does not recompute availability or price rules; it only mirrors `seatsAvailable` from the launch read (FR12) to bound input and shows the returned `totalPrice`, `paymentReference`, and `paymentStatus`.
- Client-side validation (mirroring backend rules) blocks obviously invalid submissions: non-empty email, name, phone; seats an integer ≥ 1 and ≤ remaining `seatsAvailable`.
- Mapped API outcomes: `201` → confirmation; `402` declined payment → payment-failed message (no seats reserved); `409` insufficient seats → availability message; `404` launch → not-found message; `400`/validation → field feedback.
- The `POST /api/bookings` contract is aligned to the ADD Data Flow / ADR 5 (email-based resolve-or-create): it now accepts `{ launchId, customerEmail, name, phone, seats }` and resolves-or-creates the customer by email server-side. (Supersedes the earlier "no backend changes required" note: the implementation had diverged from the ADD and required this small, contained change.)

### Persistence

- No new persistence. Customers and bookings continue to live in the existing in-memory `Map` repositories. The flow uses the existing `POST /api/bookings` (which resolves-or-creates the customer and records the paid booking) and reads the launch via the existing `GET /api/launches/:id`. No new endpoints are introduced.

## Acceptance Criteria

- [x] WHEN a customer opens a launch that has remaining seats THE Booking Flow SHALL present a booking form capturing email, name, phone, and number of seats.
- [x] WHERE a launch has zero remaining seats THE Booking Flow SHALL prevent booking and SHALL NOT submit a booking request.
- [x] IF the customer submits seats that are not an integer between 1 and the launch's remaining seats, or leaves email, name, or phone empty, THEN THE Booking Flow SHALL show field-level validation feedback and SHALL NOT submit the request.
- [x] WHEN the seat count changes THE Booking Flow SHALL display the total price equal to seats multiplied by the launch price per seat.
- [x] WHEN the customer submits a valid booking THE Booking Flow SHALL send `POST /api/bookings` with the launch id, customer email, name, phone, and seats.
- [x] WHILE the booking request is in progress THE Booking Flow SHALL show the shared loading state and SHALL disable resubmission.
- [x] WHEN the booking request succeeds THE Booking Flow SHALL show a confirmation displaying the mission, seats booked, total charged, and payment reference.
- [x] IF the booking request fails because payment was declined (402) or seats are insufficient (409) THEN THE Booking Flow SHALL show the corresponding error message and SHALL NOT show a confirmation.
- [x] IF the booking request targets a non-existent launch (404) THEN THE Booking Flow SHALL show the shared error state.
