import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:3000/api/customers";

function buildCustomer() {
  return {
    email: `customer-${Date.now()}-${Math.random().toString(36).slice(2)}@astrobookings.com`,
    name: "Neil Armstrong",
    phone: "+1-555-0100",
  };
}

test.describe("Customers API - Acceptance Criteria", () => {
  test("POST valid customer returns 201 with id", async ({ request }) => {
    const customer = buildCustomer();
    const response = await request.post(API_URL, { data: customer });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.email).toBe(customer.email);
    expect(body.name).toBe(customer.name);
    expect(body.phone).toBe(customer.phone);
  });

  test("POST duplicate email returns 409", async ({ request }) => {
    const customer = buildCustomer();
    const first = await request.post(API_URL, { data: customer });
    expect(first.status()).toBe(201);

    const duplicate = await request.post(API_URL, {
      data: { ...customer, name: "Buzz Aldrin", phone: "+1-555-0200" },
    });
    expect(duplicate.status()).toBe(409);
    const body = await duplicate.json();
    expect(body.error).toBeDefined();
  });

  test("POST with missing or empty email returns 400", async ({ request }) => {
    const { email, ...withoutEmail } = buildCustomer();
    void email;
    const missing = await request.post(API_URL, { data: withoutEmail });
    expect(missing.status()).toBe(400);

    const empty = await request.post(API_URL, { data: { ...buildCustomer(), email: "   " } });
    expect(empty.status()).toBe(400);
    const body = await empty.json();
    expect(body.errors).toBeDefined();
  });

  test("POST with missing or empty name returns 400", async ({ request }) => {
    const { name, ...withoutName } = buildCustomer();
    void name;
    const missing = await request.post(API_URL, { data: withoutName });
    expect(missing.status()).toBe(400);

    const empty = await request.post(API_URL, { data: { ...buildCustomer(), name: "" } });
    expect(empty.status()).toBe(400);
  });

  test("POST with missing or empty phone returns 400", async ({ request }) => {
    const { phone, ...withoutPhone } = buildCustomer();
    void phone;
    const missing = await request.post(API_URL, { data: withoutPhone });
    expect(missing.status()).toBe(400);

    const empty = await request.post(API_URL, { data: { ...buildCustomer(), phone: "   " } });
    expect(empty.status()).toBe(400);
  });

  test("GET all customers returns list", async ({ request }) => {
    const created = await request.post(API_URL, { data: buildCustomer() });
    expect(created.status()).toBe(201);

    const response = await request.get(API_URL);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET customer by id returns details", async ({ request }) => {
    const customer = buildCustomer();
    const created = await request.post(API_URL, { data: customer });
    const { id } = await created.json();

    const response = await request.get(`${API_URL}/${id}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.id).toBe(id);
    expect(body.email).toBe(customer.email);
  });

  test("GET non-existent customer returns 404", async ({ request }) => {
    const response = await request.get(`${API_URL}/non-existent-id`);
    expect(response.status()).toBe(404);
  });
});
