import axios from 'axios';

// Mirrors RidePassengerService.getPublicTrip in prime-lane-api-v1.
export type RideType = 'airport_transfer' | 'daily' | 'fleet';

export interface PublicTrip {
  ride: {
    custom_ride_id: string;
    status: string;
    status_label: string;
    ride_type: RideType;
    airport_ride_type: 'arrival' | 'departure' | null;
    hourly_ride_type: 'full_day' | 'half_day' | null;
    category_name: string | null;
    seats: number | null;
    free_wait_mins: number;
    booked_hours: number | null;
    no_of_days: number | null;
    pickup: Place & { time: string | null };
    dropoff: Place;
    flight_no: string | null;
    flight_time: string | null;
    arrived_at: string | null;
    started_at: string | null;
    ends_at: string | null;
  };
  passenger: { first_name: string };
  booked_by: { first_name: string | null };
  driver: {
    first_name: string;
    last_name: string | null;
    photo_url: string | null;
    phone_number: string | null; // only while the driver is on the ride
  } | null;
  vehicle: {
    make: string;
    model: string;
    year: number | null;
    color: string | null;
    plate: string | null;
  } | null;
  ended: boolean;
  expires_at: string | null;
}

export interface Place {
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export class TripError extends Error {
  constructor(public readonly kind: 'not_found' | 'expired' | 'network') {
    super(kind);
  }
}

const API_BASE = (import.meta.env.VITE_PRIMELANE_API_BASE_URL ?? '').replace(
  /\/+$/,
  '',
);

// Device-aware store link: App Store on iOS, Play on Android, both buttons elsewhere.
export const APP_LINK = `${API_BASE}/app`;

const http = axios.create({ baseURL: API_BASE, timeout: 10_000 });

export async function fetchTrip(token: string): Promise<PublicTrip> {
  let body;
  try {
    ({ data: body } = await http.get(`/rides/public/${encodeURIComponent(token)}`));
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 404) throw new TripError('not_found');
    if (status === 410) throw new TripError('expired');
    throw new TripError('network');
  }
  // The API wraps every response as { data, success }.
  return normalize(body?.data ?? body);
}

// Fills fields an older API build may not send yet, so the page never crashes on them.
function normalize(raw: PublicTrip): PublicTrip {
  const ride = raw.ride;
  return {
    ...raw,
    ride: {
      ...ride,
      airport_ride_type: ride.airport_ride_type ?? null,
      hourly_ride_type: ride.hourly_ride_type ?? null,
      category_name: ride.category_name ?? null,
      seats: ride.seats ?? null,
      free_wait_mins: ride.free_wait_mins ?? 0,
      booked_hours: ride.booked_hours ?? null,
      no_of_days: ride.no_of_days ?? null,
      pickup: { ...place(ride.pickup), time: ride.pickup?.time ?? null },
      dropoff: place(ride.dropoff),
      flight_no: ride.flight_no ?? null,
      flight_time: ride.flight_time ?? null,
      arrived_at: ride.arrived_at ?? null,
      started_at: ride.started_at ?? null,
      ends_at: ride.ends_at ?? null,
    },
    driver: raw.driver
      ? {
          ...raw.driver,
          last_name: raw.driver.last_name ?? null,
          photo_url: raw.driver.photo_url ?? null,
          phone_number: raw.driver.phone_number ?? null,
        }
      : null,
    vehicle: raw.vehicle
      ? { ...raw.vehicle, year: raw.vehicle.year ?? null, color: raw.vehicle.color ?? null, plate: raw.vehicle.plate ?? null }
      : null,
  };
}

function place(raw?: Partial<Place> | null): Place {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return { address: raw?.address ?? null, lat: num(raw?.lat), lng: num(raw?.lng) };
}
