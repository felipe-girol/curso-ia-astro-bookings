<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BookingForm, { type BookingSubmit } from '../components/BookingForm.vue'
import ErrorState from '../components/ErrorState.vue'
import LoadingState from '../components/LoadingState.vue'
import { useAsync } from '../composables/use-async'
import type { ApiError, ApiResult } from '../types/api.type'
import type { Booking } from '../types/booking.type'
import type { LaunchView } from '../types/launch.type'
import type { Rocket } from '../types/rocket.type'
import { getLaunch } from '../services/launches-api'
import { listRockets } from '../services/rockets-api'
import { createBooking } from '../services/bookings-api'
import {
  formatLaunchDate,
  formatSeatPrice,
  isSoldOut as isLaunchSoldOut,
  resolveRocketName,
} from '../utils/launch-format'

/** Combined payload so the launch and rockets share one loading/error cycle. */
type DetailData = { launch: LaunchView; rockets: Rocket[] }

/** A successful booking paired with the email that made it (for the receipt). */
type Confirmation = { booking: Booking; customerEmail: string }

const route = useRoute()
const launchId = computed<string>(() => String(route.params.id))

/** Load the launch and rockets together; surface the first failure. */
async function loadDetail(): Promise<ApiResult<DetailData>> {
  const [launchResult, rocketsResult] = await Promise.all([
    getLaunch(launchId.value),
    listRockets(),
  ])
  if (!launchResult.ok) return launchResult
  if (!rocketsResult.ok) return rocketsResult
  return { ok: true, data: { launch: launchResult.data, rockets: rocketsResult.data } }
}

const { data, error, loading, run, retry } = useAsync<DetailData>()

const launch = computed<LaunchView | null>(() => data.value?.launch ?? null)

const rocketName = computed<string>(() => {
  const current = launch.value
  if (!current) return ''
  return resolveRocketName(current.rocketId, data.value?.rockets ?? [])
})

const isSoldOut = computed<boolean>(() => (launch.value ? isLaunchSoldOut(launch.value) : false))

// --- Booking flow state (local to this view) ---
const submitting = ref(false)
const confirmation = ref<Confirmation | null>(null)
/** Non-404 booking failures surfaced inline (payment declined, oversell, validation). */
const bookingError = ref<string | null>(null)
/** A 404 on booking means the launch vanished; escalate to the shared error state. */
const bookingNotFound = ref(false)

/** The form shows only while there are seats and no confirmation yet. */
const showBookingForm = computed<boolean>(
  () => Boolean(launch.value) && !isSoldOut.value && confirmation.value === null,
)

/** Map a booking failure to inline microcopy or escalate a 404. */
function handleBookingError(err: ApiError): void {
  if (err.status === 404) {
    bookingNotFound.value = true
    return
  }
  if (err.status === 402) {
    bookingError.value = 'Payment was declined, so no seats were reserved. Please try again.'
    return
  }
  if (err.status === 409) {
    bookingError.value = 'Not enough seats remain for this booking. Reduce the seats and try again.'
    return
  }
  bookingError.value = err.message || 'The booking could not be completed. Please try again.'
}

async function onBookingSubmit(payload: BookingSubmit): Promise<void> {
  if (!launch.value || submitting.value) return
  submitting.value = true
  bookingError.value = null
  bookingNotFound.value = false

  const result = await createBooking({ launchId: launchId.value, ...payload })
  if (result.ok) {
    confirmation.value = { booking: result.data, customerEmail: payload.customerEmail }
    // Refresh the launch read so seatsAvailable reflects the new booking.
    await run(loadDetail)
  } else {
    handleBookingError(result.error)
  }
  submitting.value = false
}

onMounted(() => run(loadDetail))
</script>

<template>
  <section aria-labelledby="detail-h">
    <p class="back">
      <RouterLink :to="{ name: 'customer-launches' }">← Back to catalog</RouterLink>
    </p>

    <LoadingState v-if="loading" label="Loading launch…" />
    <ErrorState
      v-else-if="error || !launch"
      :message="error?.message ?? 'This launch could not be found.'"
      @retry="retry"
    />
    <ErrorState
      v-else-if="bookingNotFound"
      message="This launch is no longer available."
      @retry="retry"
    />
    <article v-else aria-labelledby="detail-h">
      <h1 id="detail-h">{{ launch.mission }}</h1>
      <p v-if="isSoldOut" class="sold-out-badge" role="status">
        Sold out<span class="visually-hidden"> — no seats available</span>
      </p>

      <dl class="detail-grid">
        <dt>Rocket</dt>
        <dd>{{ rocketName }}</dd>

        <dt>Date</dt>
        <dd>{{ formatLaunchDate(launch.date) }}</dd>

        <dt>Price per seat</dt>
        <dd>{{ formatSeatPrice(launch.pricePerSeat) }}</dd>

        <dt>Minimum passengers</dt>
        <dd>{{ launch.minPassengers }}</dd>

        <dt>Seats offered</dt>
        <dd>{{ launch.seatsOffered }}</dd>

        <dt>Seats available</dt>
        <dd>{{ launch.seatsAvailable }}</dd>
      </dl>

      <!-- Confirmation receipt after a successful booking. -->
      <section v-if="confirmation" class="confirmation" aria-labelledby="confirmation-h" role="status">
        <h2 id="confirmation-h">Booking confirmed</h2>
        <p>Your seats are reserved. A receipt is shown below.</p>
        <dl class="detail-grid">
          <dt>Mission</dt>
          <dd>{{ launch.mission }}</dd>

          <dt>Seats booked</dt>
          <dd>{{ confirmation.booking.seats }}</dd>

          <dt>Total charged</dt>
          <dd>{{ formatSeatPrice(confirmation.booking.totalPrice) }}</dd>

          <dt>Payment reference</dt>
          <dd>{{ confirmation.booking.paymentReference }}</dd>

          <dt>Email</dt>
          <dd>{{ confirmation.customerEmail }}</dd>
        </dl>
      </section>

      <!-- Booking form while seats remain and no confirmation yet. -->
      <template v-else-if="showBookingForm">
        <p v-if="bookingError" class="booking-error" role="alert">{{ bookingError }}</p>
        <BookingForm
          :seats-available="launch.seatsAvailable"
          :price-per-seat="launch.pricePerSeat"
          :submitting="submitting"
          @submit="onBookingSubmit"
        />
      </template>

      <!-- Sold out: no form, no request. -->
      <p v-else-if="isSoldOut" class="sold-out-note">
        This launch is sold out. Browse the catalog for launches with seats available.
      </p>
    </article>
  </section>
</template>

<style scoped>
.back {
  margin-bottom: 0.5rem;
}

.back a {
  color: var(--accent);
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.sold-out-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-weight: 600;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

.detail-grid {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.5rem 1.5rem;
  margin-top: 1rem;
}

.detail-grid dt {
  color: var(--text-h);
  font-weight: 600;
}

.detail-grid dd {
  margin: 0;
}

.confirmation {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  background: var(--social-bg);
}

.confirmation h2 {
  margin-top: 0;
  color: var(--text-h);
}

.booking-error {
  margin: 1.5rem 0 0.75rem;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.1);
}

.sold-out-note {
  margin-top: 1.5rem;
  color: var(--text);
}

.booking-form {
  margin-top: 0.75rem;
}
</style>
