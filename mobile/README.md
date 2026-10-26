# GApangita Mobile

Expo Router mobile client for the existing GApangita Flask API and MySQL database. The web frontend and database remain unchanged; this app is an additional client.

## Start locally

1. Start MySQL and the Flask server using the instructions in the repository root `README.md`.
2. From this directory, create a local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set `EXPO_PUBLIC_API_URL` in `.env` to an address the test device can reach:
   - Android emulator: `http://10.0.2.2:5000/api`
   - Physical phone: `http://<computer-lan-ip>:5000/api`
   - iOS simulator: `http://localhost:5000/api`
4. Install packages if needed and start Expo:

   ```powershell
   npm install
   npm run start
   ```

Use Expo Go on a phone or select an installed Android emulator. For a physical device, the computer and phone must be on the same network; Flask must accept LAN connections and the firewall must allow port 5000.

## Client routes

- `/(tabs)` searches and browses open listings.
- `/(tabs)/report` creates an item report with an optional lost-item image or required found-item image.
- `/items/[itemCode]` shows an open listing.
- `/claims/[itemCode]` submits claimant information and proof.
- `/login` signs in using the existing Flask session and stores the CSRF token in Expo SecureStore.
- `/staff/archive`, `/staff/unarchive-history`, and `/staff/restore/[itemCode]` provide staff record workflows.

## Backend integration notes

The client uses the current cookie-session and CSRF API. React Native cookie persistence must be tested on the target Android and iOS devices. The API's archive search is now protected, the auth-status response includes the user's role, and `GET /api/items/<item_code>` supports open-item details. A future production hardening step should add a dedicated mobile token/refresh flow and HTTPS rather than relying on browser-style sessions.

The backend still has no general item edit or delete endpoint. The existing claim and archive/restore procedures are the supported status-changing workflows.
## Connection recovery and phone checks

The client uses 10-second request deadlines and up to two retries for transient read failures (about 32 seconds maximum, including backoff). Uploads have a 60-second deadline. Writes are never automatically replayed: if interrupted, verify whether the report or claim exists before trying again.

Find opens on normal launch and has a Retry action. Session failures offer Retry on Account, Report, and claim screens. A failed session check does not count as a guest session. Signed-in accounts must sign out before submitting public claims.

For physical phones, check the computer's current LAN IPv4 address with ipconfig and set EXPO_PUBLIC_API_URL accordingly. Android's 10.0.2.2 default is for the emulator; localhost on a phone points to the phone. Do not commit credentials in EXPO_PUBLIC variables. Restart Expo after changing .env; use a full reload, and rebuild distributed apps to update their bundled configuration. Prefer a stable HTTPS origin for deployed apps.

From the phone browser, open http://<computer-lan-ip>:5000/api/health (Flask liveness) and /api/ready (database readiness). Health should return 200; readiness returns 503 if MySQL cannot connect. Check same Wi-Fi, firewall port 5000, VPNs, and wireless client isolation. Expo/Metro or an Expo tunnel reaching the phone does not establish Flask reachability.

Device QA still requires a physical phone: test fresh launch, signed-in claim blocking, session expiry, offline/online recovery, interrupted uploads, and cookie/CSRF continuity. Record five cold and five warm launch timings before judging performance improvements.

## Expo 57 upload transport

Keep `EXPO_PUBLIC_USE_RN_FETCH=1` in the mobile environment. Expo 57 defaults to `expo/fetch`, whose multipart encoder does not accept the native `{ uri, name, type }` attachments used by this app. This compatibility switch retains React Native fetch for these uploads. Restart Expo and fully reload after changing it; distributed apps require a rebuild.
