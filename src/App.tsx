import type { ReactNode } from 'react';
import type { PublicTrip } from './api';
import logo from './assets/logo.svg';
import {
  bookedTimeLabel,
  formatDateTime,
  formatShortDate,
  formatTime,
  headlineFor,
  RIDE_TYPE_LABELS,
  timeLeft,
  vehicleLabel,
  waitEndsAt,
} from './format';
import {
  CalendarIcon,
  CarIcon,
  ClockIcon,
  HourglassIcon,
  PeopleIcon,
  PhoneIcon,
  PlaneIcon,
  ShieldIcon,
  UserIcon,
} from './icons';
import { useNow, useTrip } from './useTrip';

// Status links look like /t/<22-char token>.
const token = window.location.pathname.match(/^\/t\/([0-9A-Za-z]{22})\/?$/)?.[1] ?? null;

// The driver card only matters once a driver is actually on this ride.
const DRIVER_STATUSES = ['UPCOMING', 'TO_PICKUP', 'AT_PICKUP', 'ON_THE_WAY'];
// Free wait time is irrelevant once the trip has started.
const WAIT_STATUSES = ['PENDING', 'ACCEPTED', 'UPCOMING', 'TO_PICKUP', 'AT_PICKUP'];

export default function App() {
  const state = useTrip(token);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        <header className="px-5 pt-8 pb-2">
          <img src={logo} alt="Primelane" width={152} height={20} className="h-5 w-auto" />
        </header>

        {state.kind === 'loading' && <Skeleton />}
        {state.kind === 'ready' && <Trip trip={state.trip} stale={state.stale} />}
        {state.kind === 'not_found' && (
          <Message
            title="Trip not found"
            body="This link isn't valid. Check the link in your SMS and try again."
          />
        )}
        {state.kind === 'expired' && (
          <Message
            title="This link has expired"
            body="The trip has ended, so its status is no longer shared."
          />
        )}
        {state.kind === 'error' && (
          <Message title="Can't load your ride" body="Check your connection. We'll keep trying." />
        )}

        <footer className="sticky bottom-0 flex items-center gap-3.5 border-t border-neutral-200 bg-white/90 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-[13px] leading-snug text-neutral-500 backdrop-blur-md">
          <ShieldIcon className="size-6 flex-none text-neutral-500" />
          <p>Ride status shared by Primelane. This link stops working when the trip ends.</p>
        </footer>
      </div>
    </div>
  );
}

function Trip({ trip, stale }: { trip: PublicTrip; stale: boolean }) {
  const now = useNow();
  const { ride, driver, vehicle } = trip;
  const headline = headlineFor(trip, now);
  const isRental = ride.ride_type !== 'airport_transfer';
  const showDriver = !!driver && DRIVER_STATUSES.includes(ride.status);
  const showTimeLeft = isRental && ride.status === 'ON_THE_WAY' && !!ride.ends_at;
  const showWait = !trip.ended && WAIT_STATUSES.includes(ride.status) && !!waitEndsAt(ride);

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
      <section className="flex items-center justify-between gap-4 px-1 pt-4 pb-3">
        <div className="min-w-0">
          <Eyebrow>Your ride</Eyebrow>
          <h1 className="mt-2 mb-3 font-display text-[clamp(24px,7.5vw,32px)] leading-[1.1] uppercase [overflow-wrap:anywhere]">
            {rideTitle(ride.category_name)}
          </h1>
          <p className="flex items-center gap-2 text-[15px] text-neutral-900">
            <CarIcon className="size-5 text-neutral-500" />
            <span>{RIDE_TYPE_LABELS[ride.ride_type] ?? ride.ride_type}</span>
            {ride.seats ? (
              <>
                <PeopleIcon className="ml-2 size-5 text-neutral-500" />
                <span>{ride.seats}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="grid size-14 flex-none place-items-center rounded-full bg-neutral-100">
          <CarIcon className="size-6" />
        </div>
      </section>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[19px] font-medium">{headline.title}</h2>
            {headline.subtitle && <Muted>{headline.subtitle}</Muted>}
          </div>
          <StatusPill ended={trip.ended} stale={stale} />
        </div>
      </Card>

      {showTimeLeft && <TimeLeft endsAt={ride.ends_at!} now={now} />}

      {showDriver && <DriverCard driver={driver!} vehicle={vehicle} />}

      <DetailsCard ride={ride} isRental={isRental} />

      {ride.flight_no && (
        <Card>
          <Row icon={<PlaneIcon />} label="Flight">
            {ride.flight_no}
            {ride.flight_time && (
              <Sub>
                {ride.airport_ride_type === 'departure' ? 'Departing' : 'Arriving'}{' '}
                {formatDateTime(ride.flight_time)}
              </Sub>
            )}
          </Row>
        </Card>
      )}

      {showWait && <WaitCard ride={ride} now={now} />}
    </main>
  );
}

// Category "Executive" reads as "Executive ride"; names already ending in "ride" are kept.
function rideTitle(category: string | null): string {
  if (!category) return 'Primelane ride';
  return /\bride$/i.test(category.trim()) ? category : `${category} ride`;
}

function StatusPill({ ended, stale }: { ended: boolean; stale: boolean }) {
  if (ended) {
    return <Pill className="bg-neutral-100 text-neutral-600">Ended</Pill>;
  }
  if (stale) {
    return (
      <Pill className="bg-neutral-100 text-neutral-600">
        <span className="size-2 rounded-full bg-neutral-400" />
        Disconnected
      </Pill>
    );
  }
  return (
    <Pill className="bg-emerald-50 text-emerald-700">
      <span className="size-2 rounded-full bg-emerald-500 animate-blink motion-reduce:animate-none" />
      Live
    </Pill>
  );
}

function TimeLeft({ endsAt, now }: { endsAt: string; now: number }) {
  const { major, minor, units } = timeLeft(endsAt, now);
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <p className="bg-emerald-600 py-1.5 text-center text-sm font-medium text-white">Time left</p>
      <div className="flex items-center justify-center gap-6 px-4 pt-4 pb-3">
        <Digits value={major} unit={units[0]} />
        <span className="-mt-6 font-display text-3xl text-neutral-300">:</span>
        <Digits value={minor} unit={units[1]} />
      </div>
      <p className="pb-4 text-center text-[13px] text-neutral-500">Ends {formatTime(new Date(endsAt))}</p>
    </section>
  );
}

function Digits({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-4xl tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-neutral-500">{unit}</p>
    </div>
  );
}

function DriverCard({
  driver,
  vehicle,
}: {
  driver: NonNullable<PublicTrip['driver']>;
  vehicle: PublicTrip['vehicle'];
}) {
  const name = [driver.first_name, driver.last_name].filter(Boolean).join(' ');
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="size-[60px] flex-none rounded-full p-[3px] ring-2 ring-black">
          {driver.photo_url ? (
            <img
              src={driver.photo_url}
              alt=""
              className="size-full rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid size-full place-items-center rounded-full bg-neutral-100">
              <UserIcon className="size-6 text-neutral-500" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-medium">{name}</p>
          {vehicle && (
            <>
              <p className="mt-0.5 text-[15px] text-neutral-600">{vehicleLabel(vehicle)}</p>
              {vehicle.plate && (
                <p className="mt-1 text-[15px] font-medium tracking-wide">{vehicle.plate}</p>
              )}
            </>
          )}
        </div>
        {driver.phone_number && (
          <a
            href={`tel:+${driver.phone_number.replace(/^\+/, '')}`}
            aria-label={`Call ${driver.first_name}`}
            className="grid size-14 flex-none place-items-center rounded-full bg-black text-white transition active:scale-95 hover:bg-neutral-800"
          >
            <PhoneIcon className="size-6" />
          </a>
        )}
      </div>
    </Card>
  );
}

function DetailsCard({ ride, isRental }: { ride: PublicTrip['ride']; isRental: boolean }) {
  const booked = bookedTimeLabel(ride);
  const showDropoff = !isRental && !!ride.dropoff.address;

  return (
    <Card>
      {(ride.pickup.time || booked) && (
        <div className="flex flex-col gap-[18px] border-b border-neutral-200 pb-[18px]">
          {ride.pickup.time && (
            <Row icon={<CalendarIcon />} label="Pickup date and time">
              {formatDateTime(ride.pickup.time)}
            </Row>
          )}
          {booked && (
            <Row icon={<ClockIcon />} label="Time booked">
              {booked}
              {ride.ride_type === 'fleet' && ride.ends_at && (
                <Sub>Until {formatShortDate(ride.ends_at)}</Sub>
              )}
            </Row>
          )}
        </div>
      )}

      <div className="relative flex flex-col gap-[18px]">
        {showDropoff && (
          // Dashed line joining the pickup and drop-off markers.
          <span
            aria-hidden
            className="absolute top-6 bottom-12 left-[11px] border-l border-dashed border-neutral-300"
          />
        )}
        <Row icon={<Marker className="border-pickup" />} label="Pickup">
          {ride.pickup.address ?? '—'}
        </Row>
        {showDropoff && (
          <Row icon={<Marker className="border-dropoff" />} label="Drop-off">
            {ride.dropoff.address}
          </Row>
        )}
      </div>
    </Card>
  );
}

function WaitCard({ ride, now }: { ride: PublicTrip['ride']; now: number }) {
  const until = waitEndsAt(ride)!;
  const mins = ride.free_wait_mins;
  const over = !!ride.arrived_at && until.getTime() <= now;

  const note =
    mins <= 0
      ? `Please be ready by ${formatTime(until)}. Wait or cancellation fees apply from pickup time.`
      : over
        ? `Free wait time ended at ${formatTime(until)}. Wait fees may now apply.`
        : `You have until ${formatTime(until)} to meet your driver, after which wait or cancellation fees may apply.`;

  return (
    <Card>
      <Row icon={<HourglassIcon />} label="Wait time" plain>
        {mins > 0
          ? `${mins} minute${mins === 1 ? '' : 's'} of wait time included`
          : 'No free wait time included'}
        <Sub>{note}</Sub>
      </Row>
    </Card>
  );
}

/* ── Primitives ──────────────────────────────────────────────────────────── */

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[18px] rounded-2xl border border-neutral-200 bg-white px-4 py-[18px] shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      {children}
    </section>
  );
}

function Row({
  icon,
  label,
  plain,
  children,
}: {
  icon: ReactNode;
  label: string;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-[24px_1fr] items-start gap-3.5">
      <div className="grid h-[22px] place-items-center text-neutral-500 [&>svg]:size-[22px]">
        {icon}
      </div>
      <div className="min-w-0">
        {plain ? <p className="text-[15px] text-neutral-900">{label}</p> : <Eyebrow>{label}</Eyebrow>}
        <p className="mt-1 text-base leading-snug font-medium [overflow-wrap:anywhere]">
          {children}
        </p>
      </div>
    </div>
  );
}

function Marker({ className }: { className: string }) {
  return <span className={`size-3.5 rounded-full border-[3.5px] bg-white ${className}`} />;
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs tracking-[0.14em] text-neutral-500 uppercase">{children}</p>;
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm leading-snug text-neutral-500">{children}</p>;
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="mt-1 block text-sm font-normal text-neutral-500">{children}</span>;
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
      <Card>
        <div>
          <h2 className="text-[19px] font-medium">{title}</h2>
          <Muted>{body}</Muted>
        </div>
      </Card>
    </main>
  );
}

function Skeleton() {
  const block = 'rounded-2xl bg-neutral-100 animate-pulse motion-reduce:animate-none';
  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6" aria-busy="true" aria-label="Loading your ride">
      <div className={`${block} h-28`} />
      <div className={`${block} h-20`} />
      <div className={`${block} h-44`} />
    </main>
  );
}
