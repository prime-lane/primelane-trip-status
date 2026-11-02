import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Place } from './api';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

// Muted, icon-free base map to match the design. Styled in code (no map ID),
// which is why the pins below are HTML overlays rather than Advanced Markers.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f2f2f0' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b6b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#dcefd9' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbe7a6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f7b27a' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d9e6' }] },
];

type Point = google.maps.LatLngLiteral;

const toPoint = (p: Place): Point | null =>
  p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null;

/**
 * Pickup → drop-off route, or just the pickup pin when there's no drop-off
 * (daily/fleet rentals). Renders nothing without a key or pickup coordinates.
 */
export function RideMap({ pickup, dropoff }: { pickup: Place; dropoff: Place | null }) {
  const from = toPoint(pickup);
  const to = dropoff ? toPoint(dropoff) : null;
  if (!API_KEY || !from) return null;

  return (
    <section className="-mx-4 h-64 bg-neutral-100" aria-label="Map of your trip">
      <APIProvider apiKey={API_KEY}>
        <Map
          styles={MAP_STYLES}
          defaultCenter={from}
          defaultZoom={14}
          disableDefaultUI
          clickableIcons={false}
          gestureHandling="cooperative"
          keyboardShortcuts={false}
          className="size-full"
        >
          {/* Offsets put the pin's tip (pickup) or centre (drop-off) on the point. */}
          <HtmlMarker position={from} zIndex={2}>
            <div className="relative -translate-x-[9px] -translate-y-[24px]">
              <PickupPin />
              <Label place={pickup} />
            </div>
          </HtmlMarker>
          {to && (
            <HtmlMarker position={to} zIndex={1}>
              <div className="relative -translate-x-2 -translate-y-2">
                <DropoffDot />
                <Label place={dropoff!} />
              </div>
            </HtmlMarker>
          )}
          <Framing from={from} to={to} />
        </Map>
      </APIProvider>
    </section>
  );
}

/** Renders React content at a map position via an OverlayView. */
function HtmlMarker({
  position,
  zIndex,
  children,
}: {
  position: Point;
  zIndex: number;
  children: ReactNode;
}) {
  const map = useMap();
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.zIndex = String(zIndex);
    return el;
  });
  const { lat, lng } = position;

  useEffect(() => {
    if (!map) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => overlay.getPanes()?.floatPane.appendChild(container);
    overlay.draw = () => {
      const px = overlay.getProjection()?.fromLatLngToDivPixel({ lat, lng });
      if (px) container.style.transform = `translate(${px.x}px, ${px.y}px)`;
    };
    overlay.onRemove = () => container.remove();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, container, lat, lng]);

  return createPortal(children, container);
}

/** Draws the road route (straight line if routing fails) and fits it in view. */
function Framing({ from, to }: { from: Point; to: Point | null }) {
  const map = useMap();
  const routes = useMapsLibrary('routes');
  const key = `${from.lat},${from.lng}|${to?.lat},${to?.lng}`;
  // Stable across polls, so the route is fetched once per page load.
  const points = useMemo(() => ({ from, to }), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!map) return;
    const { from, to } = points;
    if (!to) {
      map.setCenter(from);
      map.setZoom(15);
      return;
    }
    if (!routes) return;

    let line: google.maps.Polyline | undefined;
    let cancelled = false;

    const draw = (path: google.maps.LatLngLiteral[] | google.maps.LatLng[]) => {
      if (cancelled) return;
      line = new google.maps.Polyline({
        map,
        path,
        strokeColor: '#000000',
        strokeOpacity: 1,
        strokeWeight: 4,
        clickable: false,
      });
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      // Extra room at the bottom/right for the place labels.
      map.fitBounds(bounds, { top: 40, left: 40, right: 120, bottom: 70 });
    };

    new routes.DirectionsService()
      .route({ origin: from, destination: to, travelMode: google.maps.TravelMode.DRIVING })
      .then((res) => draw(res.routes[0]?.overview_path ?? [from, to]))
      .catch(() => draw([from, to]));

    return () => {
      cancelled = true;
      line?.setMap(null);
    };
  }, [map, routes, points]);

  return null;
}

// "Radisson Blu, GRA, Lagos" → title "Radisson Blu", subtitle "GRA, Lagos".
function Label({ place }: { place: Place }) {
  if (!place.address) return null;
  const [title, ...rest] = place.address.split(',').map((s) => s.trim());
  return (
    <div className="pointer-events-none absolute top-5 left-4 w-max max-w-[168px] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgb(0_0_0/0.12)]">
      <p className="truncate text-[13px] leading-tight text-black">{title}</p>
      {rest.length > 0 && (
        <p className="mt-0.5 truncate text-[11px] leading-tight text-neutral-500">
          {rest.join(', ')}
        </p>
      )}
    </div>
  );
}

function PickupPin() {
  return (
    <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden className="block">
      <circle cx="9" cy="9" r="6.5" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M9 17v7" stroke="#000" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function DropoffDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="block">
      <circle cx="8" cy="8" r="5.5" fill="#fff" stroke="#22c55e" strokeWidth="4" />
    </svg>
  );
}
