// Mirrors RidePassengerService.getPublicTrip in prime-lane-api-v1.
export interface PublicTripResponse {
  data: PublicTrip;
}

export interface PublicTrip {
  ride: {
    custom_ride_id: string;
    status: string;
    status_label: string;
    ride_type: 'airport_transfer' | 'daily' | 'fleet';
    airport_ride_type?: 'arrival' | 'departure' | null;
    category_name?: string | null;
    seats?: number | null;
    free_wait_mins?: number;
    pickup: {
      address: string | null;
      time: string | null;
    };
    dropoff: {
      address: string | null;
    };
    flight_no?: string | null;
    flight_time?: string | null;
  };
  passenger: {
    first_name: string;
  };
  booked_by: {
    first_name: string | null;
  };
  driver: {
    first_name: string;
    photo_url: string | null;
  } | null;
  vehicle: {
    make: string;
    model: string;
    color: string | null;
    plate: string | null;
  } | null;
  timeline: {
    event: string;
    label: string;
    at: string;
  }[];
  ended: boolean;
  expires_at: string | null;
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

export async function fetchTrip(token: string): Promise<PublicTripResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/rides/public/${encodeURIComponent(token)}`);
  } catch {
    throw new TripError('network');
  }
  if (res.status === 404) throw new TripError('not_found');
  if (res.status === 410) throw new TripError('expired');
  if (!res.ok) throw new TripError('network');
  return res.json();
}
