import type { PublicTrip } from './api';

const LAGOS = 'Africa/Lagos';

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

// "11:25 WAT"
export function formatTime(d: Date): string {
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: LAGOS,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${time} WAT`;
}

export const RIDE_TYPE_LABELS: Record<PublicTrip['ride']['ride_type'], string> = {
  airport_transfer: 'Airport Transfer',
  daily: 'Daily Rental',
  fleet: 'Fleet Rental',
};

type Headline = { title: string; subtitle: string };

export function headlineFor(trip: PublicTrip): Headline {
  const { ride, driver, vehicle } = trip;
  const car = vehicle
    ? [vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ') +
      (vehicle.plate ? ` · ${vehicle.plate}` : '')
    : '';
  const driverLine = [driver?.first_name, car].filter(Boolean).join(' · ');

  switch (ride?.status) {
    case 'PENDING':
      return { title: 'Ride has been booked', subtitle: 'Awaiting confirmation' };
    case 'ACCEPTED':
      return { title: 'Ride confirmed', subtitle: 'A driver will be assigned soon' };
    case 'UPCOMING':
      return { title: 'Driver assigned', subtitle: driverLine };
    case 'TO_PICKUP':
      return { title: 'Driver on the way', subtitle: driverLine };
    case 'AT_PICKUP':
      return { title: 'Driver has arrived', subtitle: driverLine };
    case 'ON_THE_WAY':
      return {
        title: 'Trip in progress',
        subtitle: ride?.dropoff.address ? `Heading to ${ride?.dropoff.address}` : '',
      };
    case 'COMPLETED':
      return { title: 'Trip completed', subtitle: 'Thanks for riding with Primelane' };
    default:
      return { title: ride?.status_label, subtitle: '' };
  }
}
