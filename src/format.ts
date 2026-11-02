import type { PublicTrip, RideType } from './api';

const LAGOS = 'Africa/Lagos';
const MIN = 60_000;

// "Sat, Oct 4, 2026 11:20 WAT"
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

// "11:25 WAT"
export function formatTime(d: Date): string {
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: LAGOS,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} WAT`;
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

/** When free waiting ends: from the driver's arrival, else estimated from pickup time. */
export function waitEndsAt(ride: PublicTrip['ride']): Date | null {
  const from = ride.arrived_at ?? ride.pickup.time;
  if (!from) return null;
  return new Date(new Date(from).getTime() + ride.free_wait_mins * MIN);
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
          ? `Arriving by ${formatTime(new Date(ride.pickup.time))}`
          : 'Arriving soon',
      };
    case 'AT_PICKUP': {
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
          subtitle: ride.ends_at ? `Booking ends ${formatTime(new Date(ride.ends_at))}` : '',
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

/** Remaining rental time split for the countdown: days/hours past 24h, else hours/minutes. */
export function timeLeft(endsAt: string, now: number) {
  const mins = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / MIN));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (mins >= 24 * 60) {
    const hours = Math.floor(mins / 60);
    return { major: pad(Math.floor(hours / 24)), minor: pad(hours % 24), units: ['dd', 'hh'] };
  }
  return { major: pad(Math.floor(mins / 60)), minor: pad(mins % 60), units: ['hh', 'mm'] };
}
