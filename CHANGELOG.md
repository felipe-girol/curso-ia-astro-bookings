# Changelog

## [1.2.0] - 2026-06-15

### Added
- Customers management module (FR6) with `GET /api/customers`, `GET /api/customers/:id`, and `POST /api/customers`
- Customer model identified by unique `email` (natural key) with `name` and `phone`
- Email-uniqueness enforcement returning `409 Conflict` on duplicate registration
- Validation for non-empty `email`, `name`, and `phone` returning `400` on errors
- `sendConflict` (409) sender added to the shared error handler
- Playwright E2E tests covering all customers acceptance criteria
- Vitest unit tests for the customers repository and validation

### Changed
- Shared validation primitives extracted and reused across customers and rockets

## [1.1.0] - 2026-06-03

### Added
- Rockets CRUD API with RESTful endpoints (GET, POST, PUT, DELETE)
- Rocket model with name, range (suborbital/orbital/moon/mars), and capacity (1-10)
- Input validation for rocket range values and capacity limits
- E2E tests covering all rockets acceptance criteria

## [1.0.0] - Initial release

### Added
- Backend API with health endpoint
- Frontend with Vite + vanilla setup
- Playwright smoke tests for backend and frontend
