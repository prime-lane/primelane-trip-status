import { useEffect, useState } from 'react';
import { fetchTrip, TripError, type PublicTrip } from './api';

const POLL_MS = 10_000;

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; trip: PublicTrip; stale: boolean }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'error' };

/**
 * Loads the trip, then polls every 10s while it's active, the tab is visible
 * and the device is online. Going offline flags the data as stale right away;
 * coming back online refreshes immediately.
 */
export function useTrip(token: string | null): State {
  const [state, setState] = useState<State>(
    token ? { kind: 'loading' } : { kind: 'not_found' },
  );

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let ended = false;

    // Keep the last good data on screen, flagged as stale.
    const markStale = () =>
      setState((prev) => {
        if (prev.kind === 'ready') return { ...prev, stale: true };
        if (prev.kind === 'loading') return { kind: 'error' };
        return prev;
      });

    const load = async () => {
      clearTimeout(timer);
      // No point polling without a connection; the 'online' event resumes it.
      if (!navigator.onLine) {
        markStale();
        return;
      }
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
    const onOffline = () => {
      clearTimeout(timer);
      markStale();
    };
    const onOnline = () => {
      if (!ended) load();
    };

    load();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
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
