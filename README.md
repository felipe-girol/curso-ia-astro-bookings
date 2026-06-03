# AstroBookings 

A **backend API** for offering bookings for rocket launches.

- Rockets have limited seats; launch requests are validated against rocket capacity.

- Launches are scheduled for specific rockets, with pricing and minimum passenger thresholds.

- Launch status lifecycle: scheduled → confirmed → successful, or cancellation/suspension paths.

- A customer is identified by their email address and has a name and phone number.

- One customer can book multiple seats on a launch but cannot exceed the available seats.

- Customers are billed upon booking, and payments are processed through a mock gateway.


- [Repository at GitHub](https://github.com/felipe-girol/curso-ia-astro-bookings)
- Default branch: `main`

- **Author**: Felipe Girol Jiménez