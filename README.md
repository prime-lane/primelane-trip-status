# primelane-status

Public ride status page for passengers booked via "book for someone else".
The SMS link `https://<host>/t/<token>` opens this app, which reads
`GET {API}/rides/public/:token` and polls every 10s while the trip is active
(paused when the tab is hidden). No map, by design.

```bash
cp .env.example .env   # set VITE_PRIMELANE_API_BASE_URL
npm install
npm run dev            # http://localhost:5173/t/<token>
npm run build
```

Deploy as a static SPA (vercel.json rewrites every path to index.html), then
set the API's `STATUS_LINK_BASE_URL` to this app's origin.
# primelane-trip-status
