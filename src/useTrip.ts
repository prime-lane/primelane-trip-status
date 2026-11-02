import { useEffect, useState } from 'react';
import { fetchTrip, TripError, type PublicTrip } from './api';

const POLL_MS = 10_000;

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: PublicTrip; stale: boolean }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'error' };

/** Loads the trip, then polls every 10s while it's active and the tab is visible. */
export function useTrip(token: string | null): State {
  const [state, setState] = useState<State>(
    token ? { kind: 'loading' } : { kind: 'not_found' },
  );

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let ended = false;

    const load = async () => {
      clearTimeout(timer);
      try {
        const trip = await fetchTrip(token);
        if (cancelled) return;
        ended = trip.ended;
        setState({ kind: 'ready', trip, stale: false });
      } catch (err) {
        if (cancelled) return;
        const kind = err instanceof TripError ? err.kind : 'network';
        if (kind !== 'network') {
          ended = true;
          setState({ kind });
          return;
        }
        // Keep showing the last good data while the connection recovers.
        setState((prev) =>
          prev.kind === 'ready' ? { ...prev, stale: true } : { kind: 'error' },
        );
      }
      if (!ended && !document.hidden) timer = setTimeout(load, POLL_MS);
    };

    const onVisibility = () => {
      if (!document.hidden && !ended) load();
    };

    load();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [token]);

  return state;
}

/** Re-renders on an interval so countdowns stay current between polls. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
