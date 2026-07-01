export type PaymentStatus = "pending" | "paid" | "failed";

export type Booking = {
  id: string;
  launchId: string;
  customerId: string;
  seats: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  createdAt: string;
};

/**
 * Payload for `POST /api/bookings`. The customer is identified by email and
 * resolved-or-created server-side (ADR 5); `name`/`phone` are used only when a
 * new customer must be created.
 */
export type CreateBookingDto = Pick<Booking, "launchId" | "seats"> & {
  customerEmail: string;
  name: string;
  phone: string;
};
