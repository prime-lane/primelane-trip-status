import type { ReactNode } from "react";
import type { PublicTrip, PublicTripResponse } from "./api";
import logo from "./assets/logo.svg";
import {
  formatDateTime,
  formatTime,
  headlineFor,
  RIDE_TYPE_LABELS,
} from "./format";
import {
  CalendarIcon,
  CarIcon,
  HourglassIcon,
  PeopleIcon,
  PlaneIcon,
  ShieldIcon,
} from "./icons";
import { useTrip } from "./useTrip";

// Status links look like /t/<22-char token>.
const token =
  window.location.pathname.match(/^\/t\/([0-9A-Za-z]{22})\/?$/)?.[1] ?? null;

export default function App() {
  const state = useTrip(token);
  console.log({ state });

  return (
    <div className="page">
      <header className="brand">
        <img src={logo} alt="Primelane" width={165} height={22} />
      </header>

      {state.kind === "loading" && <Skeleton />}
      {state.kind === "ready" && <Trip trip={state.trip} stale={state.stale} />}
      {state.kind === "not_found" && (
        <Message
          title="Trip not found"
          body="This link isn't valid. Check the link in your SMS and try again."
        />
      )}
      {state.kind === "expired" && (
        <Message
          title="This link has expired"
          body="The trip has ended, so its status is no longer shared."
        />
      )}
      {state.kind === "error" && (
        <Message
          title="Can't load your ride"
          body="Check your connection. We'll keep trying."
        />
      )}

      <footer className="footer">
        <ShieldIcon />
        <p>
          Ride status shared by Primelane. This link stops working when the trip
          ends.
        </p>
      </footer>
    </div>
  );
}

function Trip({ trip, stale }: { trip: PublicTripResponse; stale: boolean }) {
  const { ride, timeline, ended } = trip.data;

  const headline = headlineFor(trip.data);

  const pickupTime = ride.pickup.time;
  const pickupAt = pickupTime ? new Date(pickupTime) : null;

  const freeWaitMins = ride.free_wait_mins ?? 0;

  const waitUntil =
    pickupAt && freeWaitMins > 0 && !Number.isNaN(pickupAt.getTime())
      ? new Date(pickupAt.getTime() + freeWaitMins * 60_000)
      : null;

  return (
    <main className="stack">
      <section className="hero">
        <div>
          <p className="eyebrow">Your ride</p>
          <h1>{ride.category_name ?? "Primelane ride"}</h1>

          <p className="meta">
            <CarIcon />
            <span>{RIDE_TYPE_LABELS[ride.ride_type] ?? ride.ride_type}</span>

            {ride.seats != null && ride.seats > 0 && (
              <>
                <PeopleIcon />
                <span>{ride.seats}</span>
              </>
            )}
          </p>
        </div>

        <div className="hero-badge">
          <CarIcon />
        </div>
      </section>

      <Card>
        <div className="status">
          <div>
            <h2>{headline.title}</h2>
            {headline.subtitle && <p className="muted">{headline.subtitle}</p>}
          </div>

          {ended ? (
            <span className="pill pill-ended">Ended</span>
          ) : (
            <span className={`pill ${stale ? "pill-stale" : "pill-live"}`}>
              <i aria-hidden />
              {stale ? "Reconnecting" : "Live"}
            </span>
          )}
        </div>
      </Card>

      <Card>
        {pickupTime && pickupAt && !Number.isNaN(pickupAt.getTime()) && (
          <Row icon={<CalendarIcon />} label="Pickup date and time">
            {formatDateTime(pickupTime)}
          </Row>
        )}

        <Row icon={<span className="dot dot-pickup" />} label="Pickup">
          {ride.pickup.address ?? "—"}
        </Row>

        <Row icon={<span className="dot dot-dropoff" />} label="Drop-off">
          {ride.dropoff.address ?? "—"}
        </Row>
      </Card>

      {ride.flight_no && (
        <Card>
          <Row icon={<PlaneIcon />} label="Flight">
            {ride.flight_no}

            {ride.flight_time && (
              <span className="sub">
                {ride.airport_ride_type === "departure"
                  ? "Departing"
                  : "Arriving"}{" "}
                {formatDateTime(ride.flight_time)}
              </span>
            )}
          </Row>
        </Card>
      )}

      {waitUntil && !ended && (
        <Card>
          <Row icon={<HourglassIcon />} label="Wait time" plainLabel>
            {freeWaitMins} minutes of wait time included
            <span className="sub">
              You have until {formatTime(waitUntil)} to meet your driver, after
              which wait or cancellation fees may apply.
            </span>
          </Row>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card>
          <p className="label">Updates</p>

          <ol className="timeline">
            {[...timeline].reverse().map((entry, index) => (
              <li key={`${entry.event}-${entry.at}-${index}`}>
                <span>{entry.label}</span>
                <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}

function Row({
  icon,
  label,
  plainLabel,
  children,
}: {
  icon: ReactNode;
  label: string;
  plainLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="row">
      <div className="row-icon">{icon}</div>
      <div>
        <p className={plainLabel ? "row-title" : "label"}>{label}</p>
        <p className="value">{children}</p>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="stack">
      <Card>
        <h2>{title}</h2>
        <p className="muted">{body}</p>
      </Card>
    </main>
  );
}

function Skeleton() {
  return (
    <main className="stack" aria-busy="true" aria-label="Loading your ride">
      <div className="sk sk-hero" />
      <div className="sk sk-card" />
      <div className="sk sk-card sk-tall" />
    </main>
  );
}
