<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { CreateBookingDto } from '../types/booking.type'
import { formatSeatPrice } from '../utils/launch-format'
import {
  isBookingFormValid,
  validateBookingForm,
  type BookingFormErrors,
} from '../validation/booking-form'

/** Payload emitted on submit; the parent adds the `launchId`. */
export type BookingSubmit = Omit<CreateBookingDto, 'launchId'>

const props = withDefaults(
  defineProps<{
    /** Remaining seats from the launch read (FR12); bounds the seat input. */
    seatsAvailable: number
    /** Unit price used to display the live total. */
    pricePerSeat: number
    /** Reflects an in-flight booking request from the parent. */
    submitting?: boolean
  }>(),
  { submitting: false },
)

const emit = defineEmits<{
  submit: [dto: BookingSubmit]
  cancel: []
}>()

type FormState = {
  customerEmail: string
  name: string
  phone: string
  seats: number | null
}

const form = reactive<FormState>({
  customerEmail: '',
  name: '',
  phone: '',
  seats: 1,
})

const errors = ref<BookingFormErrors>({})
const submitted = ref(false)

/** Live total = seats × unit price; 0 until a valid seat count is entered. */
const total = computed<number>(() => {
  const seats = form.seats
  if (seats === null || Number.isNaN(seats) || seats < 1) return 0
  return seats * props.pricePerSeat
})

function revalidate(): BookingFormErrors {
  const next = validateBookingForm(
    {
      customerEmail: form.customerEmail,
      name: form.name,
      phone: form.phone,
      seats: form.seats,
    },
    props.seatsAvailable,
  )
  errors.value = next
  return next
}

function onFieldBlur(): void {
  if (submitted.value) revalidate()
}

function onSubmit(): void {
  submitted.value = true
  const next = revalidate()
  if (!isBookingFormValid(next)) return

  emit('submit', {
    customerEmail: form.customerEmail.trim(),
    name: form.name.trim(),
    phone: form.phone.trim(),
    seats: form.seats as number,
  })
}
</script>

<template>
  <form class="booking-form" novalidate @submit.prevent="onSubmit">
    <h2>Book seats</h2>

    <div class="field">
      <label for="booking-email">Email</label>
      <input
        id="booking-email"
        v-model="form.customerEmail"
        type="email"
        autocomplete="email"
        :aria-invalid="Boolean(errors.customerEmail)"
        :aria-describedby="errors.customerEmail ? 'booking-email-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.customerEmail" id="booking-email-error" class="field-error" role="alert">
        {{ errors.customerEmail }}
      </p>
    </div>

    <div class="field">
      <label for="booking-name">Name</label>
      <input
        id="booking-name"
        v-model="form.name"
        type="text"
        autocomplete="name"
        :aria-invalid="Boolean(errors.name)"
        :aria-describedby="errors.name ? 'booking-name-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.name" id="booking-name-error" class="field-error" role="alert">
        {{ errors.name }}
      </p>
    </div>

    <div class="field">
      <label for="booking-phone">Phone</label>
      <input
        id="booking-phone"
        v-model="form.phone"
        type="tel"
        autocomplete="tel"
        :aria-invalid="Boolean(errors.phone)"
        :aria-describedby="errors.phone ? 'booking-phone-error' : undefined"
        @blur="onFieldBlur"
      />
      <p v-if="errors.phone" id="booking-phone-error" class="field-error" role="alert">
        {{ errors.phone }}
      </p>
    </div>

    <div class="field">
      <label for="booking-seats">Seats</label>
      <input
        id="booking-seats"
        v-model.number="form.seats"
        type="number"
        min="1"
        :max="seatsAvailable"
        step="1"
        :aria-invalid="Boolean(errors.seats)"
        :aria-describedby="errors.seats ? 'booking-seats-error' : 'booking-seats-hint'"
        @blur="onFieldBlur"
      />
      <p id="booking-seats-hint" class="field-hint">{{ seatsAvailable }} seat(s) available</p>
      <p v-if="errors.seats" id="booking-seats-error" class="field-error" role="alert">
        {{ errors.seats }}
      </p>
    </div>

    <dl class="totals">
      <dt>Price per seat</dt>
      <dd>{{ formatSeatPrice(pricePerSeat) }}</dd>
      <dt>Total</dt>
      <dd class="total-value" aria-live="polite">{{ formatSeatPrice(total) }}</dd>
    </dl>

    <div class="actions">
      <button type="submit" class="primary" :disabled="submitting">
        {{ submitting ? 'Booking…' : 'Book seats' }}
      </button>
      <button type="button" class="ghost" :disabled="submitting" @click="emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.booking-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 28rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--social-bg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field label {
  font-weight: 600;
  color: var(--text-h);
}

.field input {
  font: inherit;
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
}

.field input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.field [aria-invalid='true'] {
  border-color: #c0392b;
}

.field-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
}

.field-error {
  margin: 0;
  font-size: 0.85rem;
  color: #c0392b;
}

.totals {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.totals dt {
  color: var(--text-h);
  font-weight: 600;
}

.totals dd {
  margin: 0;
}

.total-value {
  font-weight: 700;
  color: var(--text-h);
}

.actions {
  display: flex;
  gap: 0.5rem;
}

button {
  font: inherit;
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: 6px;
  transition: box-shadow 0.2s;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.primary {
  border: 1px solid var(--accent-border);
  color: var(--bg);
  background: var(--accent);
}

.ghost {
  border: 1px solid var(--border);
  color: var(--text);
  background: var(--bg);
}

button:not(:disabled):hover {
  box-shadow: var(--shadow);
}

button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
