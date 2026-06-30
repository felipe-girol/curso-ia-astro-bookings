/**
 * Frontend mirror of the backend launch DTOs (`backend/src/types/launches.type.ts`).
 * The API stays the single source of truth; these types only shape requests and
 * responses for the typed client and the management UI.
 */

export type Launch = {
  id: string
  rocketId: string
  mission: string
  date: string
  pricePerSeat: number
  minPassengers: number
  seatsOffered: number
}

/** Payload for `POST /api/launches`. */
export type CreateLaunchDto = Pick<
  Launch,
  'rocketId' | 'mission' | 'date' | 'pricePerSeat' | 'minPassengers' | 'seatsOffered'
>

/** Payload for `PUT /api/launches/:id`. */
export type UpdateLaunchDto = Partial<CreateLaunchDto>
