# Mobile Reliability and Access Plan

Status: Core changes implemented; physical-device and live database QA remain pending.
Scope: Expo mobile app and Flask API; preserve browser compatibility.

## 1. Open the public listing on first launch

Expected behavior: Normal launch opens Find/items listing, including for guests. Reporting requires an authorized account.

Observed: The listing exists at mobile/src/app/(tabs)/index.tsx. Root and tab layouts have no explicit initial destination. The report screen already has a guest sign-in gate. The cause of the reported launch behavior still requires reproduction.

Tasks:
- Reproduce a fresh install/cleared app state, cold launch, and reopening after visiting Report. Inspect entry configuration, redirects, and navigation restoration.
- Configure the root and tab entry to select Find using the installed Expo Router version's supported mechanism.
- Render the public listing independently of session restoration; show listing loading/error states when the backend is unavailable.
- Preserve valid explicit deep links and authorized return-after-login behavior.
- Keep report fields/submission protected in the app and API. Guests selecting Report should receive the sign-in gate.

Acceptance:
- Fresh guest and signed-in normal launches open Find.
- Backend failure does not change the starting destination to Report or Login.
- Authorized staff can intentionally open Report; guests cannot submit reports through direct navigation or API requests.

## 2. Prevent signed-in accounts from claiming

Policy: Use the requested broader rule: public claiming is unavailable to any signed-in account, including Admin/Staff. Guests may claim eligible items, consistent with plan.md. Staff review remains available.

Observed: mobile/src/app/items/[itemCode].tsx currently checks only item.can_claim when enabling the button. The claim screen and POST /api/claims also require account restrictions.

Tasks:
- Enable claiming only when session checking has completed, the visitor is confirmed logged out, and item.can_claim is true.
- Disable the button for signed-in users and explain: Sign out to submit a public claim.
- Guard mobile/src/app/claims/[itemCode].tsx against direct navigation and recheck authorization at submission, including account changes while the form is open.
- Reject authenticated POST /api/claims requests with HTTP 403 before processing attachments or database writes. Keep existing CSRF and validation rules intact.
- Keep unknown/loading session state distinct from a confirmed guest; connection failure must not grant claim access.
- Preserve claim history with at most one active claim per item. Rejection releases the item until its original 21-day deadline; approval archives it. This supersedes the older one-claim-ever rule in plan.md.
- Update login/account copy that currently implies claimants must sign in.

Acceptance:
- Guests can submit one valid claim for an eligible item.
- Admin/Staff cannot claim through the button, direct route, or direct authenticated API request. No claim row or uploaded attachment is created by a rejected request.
- Loading/unknown session state blocks submission until resolved.
- Unavailable items remain unclaimable, and staff claim review continues working.

## 3. Diagnose and stabilize phone/backend connectivity

Observed:
- mobile/src/services/api/client.ts uses EXPO_PUBLIC_API_URL, falling back to 10.0.2.2 on Android and localhost elsewhere. Those defaults do not address the development computer from a physical phone. Inspect the effective configured address first.
- Requests have no explicit timeout.
- mobile/src/features/auth/AuthContext.tsx treats authentication-request failures as logged out.
- Flask already binds to 0.0.0.0:5000. Database connections have no explicit connection timeout. Actual causes of slowness remain unmeasured.

Diagnosis and configuration:
- Separate app bundle/Metro launch failure from API connection, authentication, listing, and database failures.
- Record development API origin and cold/warm request timings without credentials or tokens.
- Test Flask reachability from the phone. For LAN development, verify matching Wi-Fi, computer LAN address, firewall access, running Flask/MySQL, VPN effects, and Wi-Fi client isolation.
- Document separate emulator, simulator, physical-phone, and deployed API addresses in mobile/.env.example and mobile/README.md.
- For a physical phone on the LAN, use http://<computer-LAN-IP>:5000/api. Document restart/rebuild requirements after configuration changes and handling of a changed LAN IP.
- Verify API reachability separately from any Expo development tunnel.
- Use a stable HTTPS API address for deployed builds. Inspect the actual build's transport policy before changing native configuration.

Request and recovery work:
- Add cancellable deadlines, initially 10 seconds for ordinary API reads, with a separate longer upload deadline. Cover response-body reading as well as fetch.
- Distinguish timeout/network, HTTP, and invalid-response errors. End loading and offer manual Retry with a useful message.
- Retry safe reads only for transient failures, at most twice with bounded backoff. Do not automatically replay claims, reports, login, or status mutations.
- Cancel obsolete searches and prevent older responses replacing newer results. Measure duplicate startup calls before adding caching.
- Distinguish auth loading, confirmed guest, authenticated, and temporarily unavailable states. Preserve known account state during recoverable network failure without allowing protected actions on stale authorization.
- Add a lightweight liveness endpoint and a separate readiness endpoint with a bounded database check; expose no sensitive diagnostics.
- Set a finite database connection timeout. Add pooling, query changes, or indexes only when measurements identify a bottleneck.
- Verify cookies, CSRF, expiry, and applicable browser CORS behavior with the actual API origin; test native and browser clients separately.

Acceptance:
- Test on a physical phone and emulator with cold and warm backend starts.
- With Flask stopped, wrong API address, Wi-Fi disconnected, or MySQL unavailable, loading ends within the defined request/retry budget and shows a recovery action.
- Once connection returns, Retry loads listings without restarting the app.
- Record before/after timings across at least five cold and five warm launches on the same phone/network. Set a healthy-startup target from the measured baseline; ordinary healthy requests finish within their deadline.
- Repeated taps and connection interruptions do not automatically duplicate submissions. For interrupted writes, explain the outcome may be unknown and check server state before resubmitting.
- Recoverable failures do not silently sign out users; confirmed session expiry removes protected access and stale CSRF state.

## Implementation order and validation

1. Capture reproductions, effective API configuration, and baseline timings.
2. Fix the normal launch destination and verify report authorization.
3. Restrict claims in the button, direct screen, and API.
4. Stabilize configuration, deadlines, authentication recovery, and backend health diagnostics; optimize measured bottlenecks.
5. Run mobile lint/typecheck, focused routing and authorization checks, backend checks, and physical-device acceptance tests. Smoke-test browser reporting and claims after API changes.

Before implementing Expo/React Native changes, read the installed Expo major version and matching official documentation as required by mobile/AGENTS.md.

No database reset or framework replacement is planned. The approved claim lifecycle update uses the non-destructive migration documented in audit/CLAIM_LIFECYCLE.md. Implementation checks and remaining device QA are recorded below.


## Implementation record

- Explicit Find startup destination in root and tab navigation; Report waits for a confirmed session.
- Signed-in claim blocking in item details, claim route/submission, and Flask before upload/database side effects.
- Auth failures retain known account state and expose session-check retry; failed sign-out cannot enable guest claiming.
- Ordinary API reads have 10-second deadlines and at most two transient retries; uploads have 60-second deadlines and writes are not automatically replayed.
- Find has Retry and cancels superseded searches. Report/claim submission guards prevent repeated taps while pending.
- Added /api/health and /api/ready, a five-second database connection timeout, and bounded readiness database reads/writes. Connector requirement is now >=9.2 for read/write timeout support.
- Updated connection documentation and environment examples; existing local .env remains unchanged.

Validation: TypeScript passed with zero diagnostics; six API-client checks and seven mocked Flask tests passed. Full-project lint was attempted but stalled while loading the Expo/React lint dependencies and was stopped; lint is not confirmed passing.

Remaining QA: fresh install/cold launch and explicit deep links on a phone; actual LAN/firewall reachability; native cookie/CSRF continuity and expiry; live MySQL/browser smoke tests; interrupted uploads and unavailable-item lifecycle against the real database; five cold and five warm startup measurements. Performance causes are not confirmed by mocked tests. No database reset was performed.
