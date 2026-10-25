# Claim lifecycle implementation

Implemented October 25, 2026. Scope: mobile, Flask and MariaDB; frontend is excluded.

## Behavior

- Items are listed for 21 days from date_reported. Pending/Under Review reserves the item without archiving it. One active claim per item is enforced by a generated unique database key and item-row transaction locking.
- Rejected claims remain in staff history with their original answers, notes and evidence. Rejection releases the active slot automatically, making the item claimable again only while its original deadline remains in the future. It does not restart that deadline.
- Approval immediately removes the item from public listings and includes it in staff archives. Approved claims may transition to Returned. Rejected decisions cannot be reopened; staff can correct Returned back to Approved while keeping the item archived. Staff can still save notes.
- Expired items are absent from public listings and appear in archives even when the database event scheduler is OFF (as on this machine). The views and claim/review procedures check deadlines directly. The minute event materializes expired items as closed when the scheduler is enabled.
- An explicit staff restore of an expired item starts a new 21-day period and retains all claim history and files. Approved/Returned items cannot be restored. A retained pending claim remains reserved for review after restore.
- Staff queue navigation, evidence and status mutations address exact claim IDs. Legacy item-code routes resolve the newest claim for compatibility. Listings, item details and the claim queue reload when focused.
- Duplicate active claims return HTTP 409; missing items return 404; unavailable/expired items and invalid transitions return 409. Notes-only saves work even when the row is unchanged.

## Migration

`backend/migrate_claim_lifecycle.py --apply` was applied to the running gapangita_db_test database and rerun successfully. Existing claim count stayed 1 before and after both applies. Original definitions were backed up in audit/claim-schema-before-20261025-203132-336712.json. No tables or existing claims were reset or deleted.

The script replaces only lifecycle views/routines/triggers/event, adds the active-claim key, removes the obsolete unique item_code key, and preserves a nonunique FK/history index. Old default 14-day deadlines become 21 days from their original report timestamp; other deadlines remain intact. The corrected fresh-install definitions are also in database_setup_test.sql; do not run that database reset script as a migration.

DDL implicitly commits. Use the saved schema snapshot for recovery if interrupted, inspect partial state, then rerun the migration. SQL definitions for the targeted migration are in backend/claim_lifecycle.sql.

## Verification

62/62 live checks passed independently on localhost and the configured LAN API. Results: audit/e2e-loopback-results.json and audit/e2e-submission-results.json. Tests cover reports, optional PNG/PDF/no evidence, duplicate 409, rejection/reclaim, exact historical record access, retained evidence bytes, immutable rejected decisions, no-op notes, approval/archive, 21-day expiry, expired rejection, restore with claim history, restore deadlines, and concurrent submissions (exactly one accepted).

All run-owned records and files were cleaned. Existing user data was preserved; ID counters are deliberately not reset. An early run encountered transport interruptions while Flask's development reloader restarted; stable reruns passed health, readiness and login.

Mobile typecheck/lint and 12 JavaScript client/claim checks passed. Nine access tests and five relevant audit contracts passed. This is live API/database/filesystem verification; physical-phone navigation and native file-picker permissions were not exercised.

The broader audit is not all green: existing storage-error JSON, report upload cleanup, metadata failure cleanup, oversized-request errors, report date/name/photo validation, working-directory-dependent upload paths and counter overflow checks remain outside this lifecycle change. See audit/SUBMISSION_AUDIT.md.

## Re-run

```powershell
py backend/verify_submissions_e2e.py --write-test-data
```

The configured LAN address is used by default. The script permits only this computer's API and gapangita_db_test, uses uniquely marked test fixtures and cleans only those fixtures. The concurrency check calls the real procedure from two DB connections without bypassing the public rate limiter. Allow at least one minute between repeated runs against the same API host to respect its five-claims-per-minute limit.


## Confirmation dialogs and returned-status correction

Staff can now correct Returned back to Approved after confirmation; both statuses keep the item archived. Other transitions retain the rules above. The latest localhost live run passes 64/64 checks, including Approved -> Returned -> Approved -> Returned. The earlier LAN run passed 62 checks before this correction was added.

Shared app-styled dialogs now confirm lost/found reports, public claims, review status changes, staff notes saves, restores and sign-out. They use the current maroon/cream palette and existing action buttons. Messages describe archiving, release after rejection, evidence inclusion and the corrected Returned behavior. Report/claim validation runs before confirmation. Cancel, Android Back, or unmount does not authorize the action. Success dialogs replace native claim-review and restore alerts; sign-out errors use the shared style too.

Six executable dialog-hook checks pass: explicit approval, cancel, Back, unmount, overlapping prompts and success acknowledgment. The six existing claim checks and nine backend access tests also pass. Mobile type checking and full lint passed. Native phone visual verification remains outstanding.
