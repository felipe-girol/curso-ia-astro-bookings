# Launches Endpoint Specification
- **Type**: feat
- **Status**: Planned

## Implementation Issues

| # | Issue | Step |
|---|-------|------|
| 1 | [#4 - Define types and DTOs](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/4) | Types |
| 2 | [#5 - Create in-memory repository](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/5) | Repository |
| 3 | [#6 - Add validation logic](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/6) | Validation |
| 4 | [#7 - Create router with CRUD endpoints](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/7) | Router |
| 5 | [#8 - Register router and update docs](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/8) | Integration |
| 6 | [#9 - Add Playwright API tests](https://github.com/felipe-girol/curso-ia-astro-bookings/issues/9) | Tests |

## Problem Description

The platform needs to manage scheduled rocket launches. Each launch is tied to a specific rocket, has pricing for passengers, and defines a minimum number of passengers required for the launch to proceed. Launch creation must validate that the requested number of seats does not exceed the rocket's capacity.

### User Stories

- As an **agency owner**, I want to **schedule launches for my rockets with pricing and passenger thresholds** so that I can plan and commercialize space trips.
- As an **agency owner**, I want to **manage my scheduled launches** so that I can update pricing or cancel launches that are no longer viable.
- As a **customer**, I want to **view available launches with their details** so that I can choose a trip that fits my budget and schedule.

## Solution Overview

### User/App interface

RESTful CRUD endpoints under `/api/launches`:
- `GET /api/launches` - List all launches.
- `GET /api/launches/:id` - Get launch by ID.
- `POST /api/launches` - Create a new launch.
- `PUT /api/launches/:id` - Update an existing launch.
- `DELETE /api/launches/:id` - Delete a launch.

### Model and logic

A launch contains:
- `id`: unique identifier (UUID).
- `rocketId`: reference to an existing rocket.
- `date`: scheduled launch date (ISO 8601 string, must be in the future).
- `mission`: mission name (non-empty string).
- `pricePerSeat`: cost per passenger seat (positive number).
- `minPassengers`: minimum passengers required for launch to proceed (integer >= 1).
- `seats`: number of seats offered for sale (integer >= 1).

Validation rules:
- `rocketId` must reference an existing rocket.
- `seats` must not exceed the referenced rocket's `capacity`.
- `minPassengers` must not exceed `seats`.
- `date` must be a valid future date.
- `mission` must be a non-empty string.
- `pricePerSeat` must be a positive number.

### Persistence

In-memory Map storage, consistent with the existing rockets repository pattern.

## Acceptance Criteria

- [ ] WHEN a client sends a valid POST request with rocketId, date, mission, pricePerSeat, minPassengers, and seats, THE API SHALL create a new launch and return it with a unique identifier and status 201.
- [ ] WHEN a client sends a POST request with a rocketId that does not exist, THE API SHALL reject the request with a 400 validation error.
- [ ] WHEN a client sends a POST request with seats exceeding the referenced rocket's capacity, THE API SHALL reject the request with a 400 validation error indicating the capacity constraint.
- [ ] WHEN a client sends a POST request with minPassengers greater than seats, THE API SHALL reject the request with a 400 validation error.
- [ ] WHEN a client sends a GET request to the launches endpoint, THE API SHALL return a list of all registered launches.
- [ ] WHEN a client sends a GET request with a specific launch identifier, THE API SHALL return the details of that launch.
- [ ] WHEN a client sends a GET request with a non-existent launch identifier, THE API SHALL respond with a 404 not-found error.
- [ ] WHEN a client sends a PUT request with valid updated data for an existing launch, THE API SHALL update the launch and return the modified resource.
- [ ] WHEN a client sends a DELETE request with an existing launch identifier, THE API SHALL remove the launch and respond with status 204.
