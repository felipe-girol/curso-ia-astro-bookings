export const MIN_PASSENGERS = 1;
export const MIN_SEATS = 1;

export type Launch = {
  id: string;
  rocketId: string;
  mission: string;
  date: string;
  pricePerSeat: number;
  minPassengers: number;
  seatsOffered: number;
};

export type CreateLaunchDto = Pick<
  Launch,
  "rocketId" | "mission" | "date" | "pricePerSeat" | "minPassengers" | "seatsOffered"
>;
export type UpdateLaunchDto = Partial<CreateLaunchDto>;
