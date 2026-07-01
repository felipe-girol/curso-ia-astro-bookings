import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * E2E coverage for FR13 - Customer booking flow.
 * Spec: IA/specs/feat-customer-booking-flow.spec.md
 * Plan: IA/plans/feat-customer-booking-flow.plan.md
 *
 * Runs against the Vite dev server (5173), which proxies `/api` to the backend
 * (3000). Both servers are started by playwright.config.ts. The launch/rocket
 * reads and the `POST /api/bookings` write are mocked at the network boundary
 * with a small stateful store so the launch detail booking flow renders
 * deterministic data (including the API-derived `seatsAvailable` field and the
 * billed booking outcome), independent of backend state.
 *
 * Acceptance criteria -> tests:
 *  AC1 remaining seats -> booking form with email/name/phone/seats ............ "presents a booking form..."
 *  AC2 zero remaining seats -> no form, no request ............................ "prevents booking when sold out..."
 *  AC3 invalid seats / empty fields -> field feedback, no submit .............. "blocks submit with field-level..."
 *  AC4 seat count change -> total = seats x price per seat .................... "updates the total when the seat..."
 *  AC5 valid submit -> POST /api/bookings with id/email/name/phone/seats ...... "sends POST /api/bookings with..."
 *  AC6 in-flight request -> loading state + disabled resubmission ............. "shows a busy state and disables..."
 *  AC7 success -> confirmation (mission/seats/total/reference) ................ "shows a confirmation with mission..."
 *  AC8 declined (402) / insufficient (409) -> error, no confirmation .......... "shows the payment declined..." / "shows the insufficient seats..."
 *  AC9 booking targets a missing launch (404) -> shared error state ........... "shows the shared error state when..."
 */

const APP_URL = "http://localhost:5173";

const ROCKETS_COLLECTION = "**/api/rockets";
const LAUNCHES_ITEM = "**/api/launches/*";
const BOOKINGS_COLLECTION = "**/api/bookings";

type Rocket = { id: string; name: string; range: string; capacity: number };
type LaunchView = {
  id: string;
  rocketId: string;
  mission: string;
  date: string;
  pricePerSeat: number;
  minPassengers: number;
  seatsOffered: number;
  seatsAvailable: number;
};

/** Shape of the booking request body the frontend is expected to send. */
type BookingBody = {
  launchId: string;
  customerEmail: string;
  name: string;
  phone: string;
  seats: number;
};

/** How the mocked `POST /api/bookings` should respond. */
type BookingOutcome = "success" | "declined" | "conflict" | "notfound";

function json(status: number, data: unknown) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

/** ISO date a given number of days in the future, for seeding launches. */
function futureIso(daysAhead = 30): string {
  return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
}

const FALCON: Rocket = { id: "r1", name: "Falcon 9", range: "orbital", capacity: 10 };

/** A launch with seats available, tuned for booking assertions. */
function seededLaunch(overrides: Partial<LaunchView> = {}): LaunchView {
  return {
    id: "l1",
    rocketId: "r1",
    mission: "Mars Hop",
    date: futureIso(45),
    pricePerSeat: 2500,
    minPassengers: 1,
    seatsOffered: 6,
    seatsAvailable: 4,
    ...overrides,
  };
}

type MockOptions = {
  launch: LaunchView;
  rockets?: Rocket[];
  /** How `POST /api/bookings` responds (defaults to success). */
  bookingOutcome?: BookingOutcome;
  /** Delay applied to `POST /api/bookings`, in ms (for the busy-state test). */
  postDelayMs?: number;
};

/**
 * Installs a stateful mock of the launch/rocket reads plus the booking write so
 * the detail view's booking flow can be driven end to end. Returns the captured
 * booking request bodies for asserting the outgoing contract.
 */
async function installBookingApi(page: Page, options: MockOptions) {
  const { launch } = options;
  const rockets = options.rockets ?? [FALCON];
  const outcome = options.bookingOutcome ?? "success";
  const bookingRequests: BookingBody[] = [];

  await page.route(ROCKETS_COLLECTION, (route: Route) =>
    route.fulfill(json(200, rockets)),
  );

  // Launch detail read — always returns the seeded launch (200).
  await page.route(LAUNCHES_ITEM, (route: Route) => {
    if (route.request().method() === "GET") {
      return route.fulfill(json(200, launch));
    }
    return route.fallback();
  });

  // Booking write — records the body and replies per the configured outcome.
  await page.route(BOOKINGS_COLLECTION, async (route: Route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();

    const body = req.postDataJSON() as BookingBody;
    bookingRequests.push(body);

    if (options.postDelayMs) {
      await new Promise((r) => setTimeout(r, options.postDelayMs));
    }

    if (outcome === "declined") {
      return route.fulfill(json(402, { error: "Payment was declined" }));
    }
    if (outcome === "conflict") {
      return route.fulfill(json(409, { error: "Not enough available seats" }));
    }
    if (outcome === "notfound") {
      return route.fulfill(json(404, { error: "Launch not found" }));
    }
    // success: bill the booking and echo the paid receipt.
    return route.fulfill(
      json(201, {
        id: "b1",
        launchId: body.launchId,
        customerId: "c1",
        seats: body.seats,
        totalPrice: body.seats * launch.pricePerSeat,
        paymentStatus: "paid",
        paymentReference: "PAY-REF-001",
        createdAt: new Date().toISOString(),
      }),
    );
  });

  return { bookingRequests };
}

/** Opens the launch detail view and waits for its content to render. */
async function openDetail(page: Page, launch: LaunchView) {
  await page.goto(`${APP_URL}/customer/launches/${launch.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: launch.mission }),
  ).toBeVisible();
}

/** Fills every booking field with valid values (seats defaults to 2). */
async function fillValidForm(page: Page, seats = 2) {
  await page.getByLabel("Email").fill("commander@astrobookings.com");
  await page.getByLabel("Name").fill("Neil Armstrong");
  await page.getByLabel("Phone").fill("+1-555-0100");
  await page.getByLabel("Seats").fill(String(seats));
}

test.describe("Customer Booking Flow - Acceptance Criteria", () => {
  // AC1: opening a launch with remaining seats presents a booking form capturing
  // email, name, phone, and number of seats.
  test("presents a booking form with email, name, phone and seats when seats remain", async ({
    page,
  }) => {
    const launch = seededLaunch();
    await installBookingApi(page, { launch });

    await openDetail(page, launch);

    await expect(page.getByRole("heading", { name: "Book seats" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByLabel("Seats")).toBeVisible();
    await expect(page.getByRole("button", { name: "Book seats" })).toBeVisible();
  });

  // AC2: a launch with zero remaining seats prevents booking and sends no request.
  test("prevents booking and sends no request when the launch is sold out", async ({
    page,
  }) => {
    const launch = seededLaunch({ seatsAvailable: 0 });
    const api = await installBookingApi(page, { launch });

    await openDetail(page, launch);

    // No form is rendered; the sold-out note replaces it.
    await expect(page.getByRole("heading", { name: "Book seats" })).toHaveCount(0);
    await expect(page.getByLabel("Email")).toHaveCount(0);
    await expect(page.getByText(/sold out/i).first()).toBeVisible();

    // No booking request could have been issued.
    expect(api.bookingRequests).toHaveLength(0);
  });

  // AC3: empty required fields block submission with field-level feedback and no request.
  test("blocks submit with field-level feedback when required fields are empty", async ({
    page,
  }) => {
    const launch = seededLaunch();
    const api = await installBookingApi(page, { launch });

    await openDetail(page, launch);

    // Clear the email/name/phone (seats defaults to 1) and submit.
    await page.getByLabel("Email").fill("");
    await page.getByLabel("Name").fill("");
    await page.getByLabel("Phone").fill("");
    await page.getByRole("button", { name: "Book seats" }).click();

    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(page.getByText("Phone is required.")).toBeVisible();

    // No booking request was sent, and no confirmation appeared.
    expect(api.bookingRequests).toHaveLength(0);
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toHaveCount(0);
  });

  // AC3 (seats bound): seats above remaining availability block submission.
  test("blocks submit when seats exceed remaining availability", async ({ page }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    const api = await installBookingApi(page, { launch });

    await openDetail(page, launch);

    await fillValidForm(page, 5); // only 4 remain
    await page.getByRole("button", { name: "Book seats" }).click();

    await expect(page.getByText("Only 4 seat(s) remaining.")).toBeVisible();
    expect(api.bookingRequests).toHaveLength(0);
  });

  // AC4: changing the seat count updates the total to seats x price per seat.
  test("updates the total when the seat count changes", async ({ page }) => {
    const launch = seededLaunch({ pricePerSeat: 2500, seatsAvailable: 4 });
    await installBookingApi(page, { launch });

    await openDetail(page, launch);

    const total = page.locator("dd.total-value");

    // 1 seat (default) -> 2,500.
    await expect(total).toContainText("2,500");

    // 3 seats -> 7,500.
    await page.getByLabel("Seats").fill("3");
    await expect(total).toContainText("7,500");
  });

  // AC5: a valid submit sends POST /api/bookings with the launch id, email, name,
  // phone, and seats.
  test("sends POST /api/bookings with launch id, email, name, phone and seats", async ({
    page,
  }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    const api = await installBookingApi(page, { launch });

    await openDetail(page, launch);

    const bookingRequest = page.waitForRequest(
      (req) => req.url().endsWith("/api/bookings") && req.method() === "POST",
    );
    await fillValidForm(page, 2);
    await page.getByRole("button", { name: "Book seats" }).click();
    await bookingRequest;

    expect(api.bookingRequests).toHaveLength(1);
    expect(api.bookingRequests[0]).toEqual({
      launchId: launch.id,
      customerEmail: "commander@astrobookings.com",
      name: "Neil Armstrong",
      phone: "+1-555-0100",
      seats: 2,
    });
  });

  // AC6: while the booking request is in progress, the flow shows a busy state and
  // disables resubmission (only one request is ever sent).
  test("shows a busy state and disables resubmission while booking is in progress", async ({
    page,
  }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    const api = await installBookingApi(page, { launch, postDelayMs: 1500 });

    await openDetail(page, launch);

    await fillValidForm(page, 2);
    const submit = page.getByRole("button", { name: "Book seats" });
    await submit.click();

    // The submit button reflects the in-flight request and is disabled.
    const busy = page.getByRole("button", { name: "Booking…" });
    await expect(busy).toBeVisible();
    await expect(busy).toBeDisabled();

    // Confirmation eventually appears; still exactly one request was sent.
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible({
      timeout: 5000,
    });
    expect(api.bookingRequests).toHaveLength(1);
  });

  // AC7: a successful booking shows a confirmation displaying the mission, seats
  // booked, total charged, and payment reference (and hides the form).
  test("shows a confirmation with mission, seats, total and payment reference on success", async ({
    page,
  }) => {
    const launch = seededLaunch({ pricePerSeat: 2500, seatsAvailable: 4 });
    await installBookingApi(page, { launch });

    await openDetail(page, launch);

    await fillValidForm(page, 3);
    await page.getByRole("button", { name: "Book seats" }).click();

    const confirmation = page.getByRole("status").filter({ hasText: "Booking confirmed" });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("Mars Hop"); // mission
    await expect(confirmation).toContainText("3"); // seats booked
    await expect(confirmation).toContainText("7,500"); // total charged (3 x 2,500)
    await expect(confirmation).toContainText("PAY-REF-001"); // payment reference
    await expect(confirmation).toContainText("commander@astrobookings.com"); // email

    // The booking form is replaced by the confirmation.
    await expect(page.getByRole("heading", { name: "Book seats" })).toHaveCount(0);
  });

  // AC8: a declined payment (402) shows the payment-declined message and no confirmation.
  test("shows the payment declined message on 402 and no confirmation", async ({ page }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    await installBookingApi(page, { launch, bookingOutcome: "declined" });

    await openDetail(page, launch);

    await fillValidForm(page, 2);
    await page.getByRole("button", { name: "Book seats" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toContainText(/payment was declined/i);
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toHaveCount(0);
    // The form remains available so the customer can retry.
    await expect(page.getByRole("button", { name: "Book seats" })).toBeVisible();
  });

  // AC8: insufficient seats (409) shows the availability message and no confirmation.
  test("shows the insufficient seats message on 409 and no confirmation", async ({ page }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    await installBookingApi(page, { launch, bookingOutcome: "conflict" });

    await openDetail(page, launch);

    await fillValidForm(page, 4);
    await page.getByRole("button", { name: "Book seats" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toContainText(/not enough seats/i);
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toHaveCount(0);
  });

  // AC9: a booking that targets a non-existent launch (404) shows the shared error state.
  test("shows the shared error state when the booking targets a missing launch (404)", async ({
    page,
  }) => {
    const launch = seededLaunch({ seatsAvailable: 4 });
    await installBookingApi(page, { launch, bookingOutcome: "notfound" });

    await openDetail(page, launch);

    await fillValidForm(page, 2);
    await page.getByRole("button", { name: "Book seats" }).click();

    const errorState = page.getByRole("alert");
    await expect(errorState).toContainText(/no longer available/i);
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toHaveCount(0);
  });
});
