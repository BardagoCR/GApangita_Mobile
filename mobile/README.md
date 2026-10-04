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