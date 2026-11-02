import type { PublicTrip, RideType } from './api';

const LAGOS = 'Africa/Lagos';
const MIN = 60_000;

// "Sat, Oct 4, 2026 11:20 AM WAT"
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    timeZone: LAGOS,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${date} ${formatTime(d)}`;
}

// "Fri, Oct 7"
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: LAGOS,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// "1:00 AM WAT"
export function formatTime(d: Date): string {
  const time = d.toLocaleTimeString('en-US', {
    timeZone: LAGOS,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${time} WAT`;
}

// Time only when it's today in Lagos, otherwise the full date and time.
export function formatWhen(d: Date, now: number): string {
  const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { timeZone: LAGOS });
  return day(d.getTime()) === day(now) ? formatTime(d) : formatDateTime(d.toISOString());
}

export const RIDE_TYPE_LABELS: Record<RideType, string> = {
  airport_transfer: 'Airport Transfer',
  daily: 'Daily Rental',
  fleet: 'Fleet Rental',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Half-day (12 hours)", "Full-day (24 hours)", "3 days"
export function bookedTimeLabel(ride: PublicTrip['ride']): string | null {
  if (ride.ride_type === 'fleet') {
    return ride.no_of_days ? plural(ride.no_of_days, 'day') : null;
  }
  if (ride.ride_type !== 'daily') return null;
  const hours = ride.booked_hours ? ` (${plural(ride.booked_hours, 'hour')})` : '';
  if (ride.hourly_ride_type === 'half_day') return `Half-day${hours}`;
  if (ride.hourly_ride_type === 'full_day') return `Full-day${hours}`;
  return ride.booked_hours ? plural(ride.booked_hours, 'hour') : null;
}

// "Mercedes Benz, GLE 2025, White"
export function vehicleLabel(v: NonNullable<PublicTrip['vehicle']>): string {
  return [v.make, [v.model, v.year].filter(Boolean).join(' '), v.color]
    .filter(Boolean)
    .join(', ');
}

/**
 * When free waiting ends. Waiting counts from the booked pickup time, or from
 * the driver's arrival if they're late — an early driver doesn't start the clock.
 */
export function waitEndsAt(ride: PublicTrip['ride']): Date | null {
  const times = [ride.pickup.time, ride.arrived_at].filter((t): t is string => !!t);
  if (!times.length) return null;
  const from = Math.max(...times.map((t) => new Date(t).getTime()));
  return new Date(from + ride.free_wait_mins * MIN);
}

export function minutesUntil(target: Date, now: number): number {
  return Math.ceil((target.getTime() - now) / MIN);
}

type Headline = { title: string; subtitle: string };

export function headlineFor(trip: PublicTrip, now: number): Headline {
  const { ride } = trip;
  const isRental = ride.ride_type !== 'airport_transfer';

  switch (ride.status) {
    case 'PENDING':
      return { title: 'Ride has been booked', subtitle: 'Awaiting confirmation' };
    case 'ACCEPTED':
      return { title: 'Ride has been booked', subtitle: 'Booking confirmed' };
    case 'UPCOMING':
      return { title: 'Driver assigned', subtitle: 'Your driver will head out before pickup' };
    case 'TO_PICKUP':
      return {
        title: 'Driver en route to pickup',
        subtitle: ride.pickup.time
          ? `Arriving by ${formatWhen(new Date(ride.pickup.time), now)}`
          : 'Arriving soon',
      };
    case 'AT_PICKUP': {
      const pickupAt = ride.pickup.time ? new Date(ride.pickup.time) : null;
      if (pickupAt && pickupAt.getTime() > now) {
        return {
          title: 'Driver has arrived',
          subtitle: `Your driver is early. Pickup is at ${formatWhen(pickupAt, now)}`,
        };
      }
      const end = waitEndsAt(ride);
      const left = end ? minutesUntil(end, now) : 0;
      return {
        title: 'Driver has arrived',
        subtitle:
          left > 0
            ? `${plural(left, 'minute')} of wait time remaining`
            : 'Your driver is waiting at pickup',
      };
    }
    case 'ON_THE_WAY':
      if (isRental) {
        return {
          title: 'Trip in progress',
          subtitle: ride.ends_at ? `Booking ends ${formatWhen(new Date(ride.ends_at), now)}` : '',
        };
      }
      return {
        title: 'Trip in progress',
        subtitle: ride.dropoff.address ? `Heading to ${ride.dropoff.address}` : '',
      };
    case 'COMPLETED':
      return { title: 'Trip completed', subtitle: 'Thanks for riding with Primelane' };
    case 'CANCELLED':
    case 'DECLINED':
    case 'EXPIRED':
      return { title: 'Ride cancelled', subtitle: 'This ride is no longer going ahead' };
    default:
      return { title: ride.status_label, subtitle: '' };
  }
}

/** Clock segments: dd:hh:mm when a day or more is left, else hh:mm. */
export function splitDuration(mins: number): { value: string; unit: string }[] {
  const m = Math.max(0, Math.floor(mins));
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = { value: pad(Math.floor(m / 60) % 24), unit: 'hh' };
  const mm = { value: pad(m % 60), unit: 'mm' };
  if (m >= 24 * 60) return [{ value: pad(Math.floor(m / 1440)), unit: 'dd' }, hh, mm];
  return [{ value: pad(Math.floor(m / 60)), unit: 'hh' }, mm];
}

/** Live countdown for a rental once its trip has started; null before that. */
export function rentalClock(
  ride: PublicTrip['ride'],
  now: number,
): { mins: number; endsAt: Date } | null {
  if (ride.status !== 'ON_THE_WAY' || !ride.ends_at) return null;
  const endsAt = new Date(ride.ends_at);
  return { mins: (endsAt.getTime() - now) / MIN, endsAt };
}
