import { useEffect, useState } from "react";
import {
  fetchTrip,
  type PublicTripResponse,
  TripError,
} from "./api";

const POLL_MS = 10_000;

type State =
  | { kind: "loading" }
  | { kind: "ready"; trip: PublicTripResponse; stale: boolean }
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "error" };

const initialState = (token: string | null): State =>
  token ? { kind: "loading" } : { kind: "not_found" };

/** Loads the trip, then polls every 10s while active and the tab is visible. */
export function useTrip(token: string | null): State {
  const [state, setState] = useState<State>(() => initialState(token));

  useEffect(() => {
    if (!token) {
      setState({ kind: "not_found" });
      return;
    }

    let cancelled = false;
    let ended = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      clearTimeout(timer);

      if (!cancelled && !ended && !document.hidden) {
        timer = setTimeout(load, POLL_MS);
      }
    };

    const load = async () => {
      clearTimeout(timer);

      try {
        const trip = await fetchTrip(token);

        if (cancelled) return;

        ended = trip.data.ended;

        setState({
          kind: "ready",
          trip,
          stale: false,
        });
      } catch (err) {
        if (cancelled) return;

        const kind = err instanceof TripError ? err.kind : "network";

        if (kind !== "network") {
          ended = true;
          setState({ kind });
          return;
        }

        setState((prev) =>
          prev.kind === "ready"
            ? { ...prev, stale: true }
            : { kind: "error" },
        );
      }

      scheduleNext();
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearTimeout(timer);
      } else if (!ended) {
        load();
      }
    };

    setState({ kind: "loading" });
    load();

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  return state;
}