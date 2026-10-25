# Mobile submission audit

Lifecycle update: A01, A05, A08, A11 and A12 are fixed in source and the running database. Duplicate-conflict tests now use the explicit SQL error number 30001. Other findings below remain historical or outstanding as noted in [CLAIM_LIFECYCLE.md](CLAIM_LIFECYCLE.md). The full audit remains red for the outstanding findings.

Date: October 25, 2026. Scope: mobile app, Flask API, SQL setup/procedures/triggers, and submission test coverage. `frontend/` is excluded.

The audit adds failure-reproduction checks and a repeatable command. Application code and existing database contents were not changed by this audit. These findings describe the checked-in SQL and reproduced Flask/client behavior; the installed live schema could not be verified because MySQL was unavailable.

## Highest-priority findings

| ID | Priority | Finding and user-visible result | Evidence | Fix direction |
| --- | --- | --- | --- | --- |
| A01 | Critical | SQL setup contains `FOR EACH ROW WHEN ...` in `trg_auto_resolved_claimed_items`. This is not MySQL/MariaDB trigger syntax. Imports that stop on errors can terminate before later triggers, seed data, and grants are installed. A partially installed database can therefore appear reachable but reject submissions or leave forms without choices. | `database_setup_test.sql:899`; SQL contract test fails. | Put the condition inside `BEGIN ... IF ... END IF ... END`. Apply a targeted database change; the setup script drops the database and must not be used as a routine repair command. |
| A02 | High | Claim evidence and report photos are saved outside their database error handlers. Permission, missing-directory, or disk-full errors escape as HTML 500 responses. The client then reports an invalid response instead of explaining the storage failure. | `backend/app.py:345`, `backend/app.py:732`; simulated disk-full claim test fails. | Handle the complete upload/write operation, return JSON consistently, and remove partial files on failure. |
| A03 | High | Categories, branches, and locations close `cursor`/`conn` even when connection creation failed. Cleanup raises a second exception and hides the original DB failure. These lookups are prerequisites for completing a report. The Report screen loads them only once and has no lookup retry after recovery. | `backend/app.py:219`, `:233`, `:249`, `:264`; all four connection-failure subtests return HTML. `mobile/src/app/(tabs)/report.tsx:49`. | Initialize resources, guard cleanup, return JSON 503, and add a lookup retry that repopulates the form. |
| A04 | High | Flask's 10 MB request limit returns default HTML 413; the client tries to parse every response as JSON and replaces this with an invalid-response message. Report photos have no client size check and the report picker discards the available file-size metadata. A large camera photo can therefore fail only after upload starts. | `backend/app.py:18`; `mobile/src/services/api/client.ts:82`; `mobile/src/services/api/gapangita.ts:90`; backend 413 and two client size/error checks fail. | Add a JSON 413 handler, handle non-JSON HTTP errors by status, retain photo size, and reject oversized reports before transport. Account for multipart overhead. |
| A05 | High | Restore selects `claimProof_file_path` from `claimed_items`, but that table now stores `evidence_file_path`. Restoring an item with an existing claim takes the broken branch and fails in SQL. | `database_setup_test.sql:620`; schema/procedure contract test fails. | Read the current evidence column into the legacy archive destination, or update the archive contract coherently. Preserve evidence/history. |
| A06 | High | Upload paths depend on the working directory, while `send_from_directory` resolves relative paths against Flask's module directory. Starting the server from the repository root can save evidence successfully and then return 404 when staff opens it. | `backend/app.py:43`, `:128`, `:216`, `:884`; alternate-working-directory test reproduces 404. | Build all upload paths from one absolute backend directory and use it for save, cleanup, and serve. |
| A07 | High | API report validation does not parse the date or enforce the database's 255-character name limit. Invalid values reach the stored procedure and are rejected by a strict database rather than receiving a field-level 400. The mobile form also lacks a name-length limit. | `backend/app.py:300`; `database_setup_test.sql:453`; two validation subtests prove invalid values reach the DB mock. | Validate format, actual calendar values, and shared field lengths before uploads/SQL; return field-specific errors. |
| A08 | High | Find sends `location_code` to a public view that does not expose that column. Using the location filter produces a SQL unknown-column error and prevents finding an item to claim. | `database_setup_test.sql:156`; `backend/app.py:475`; view/query contract test fails. | Support the filter in SQL without exposing private location details in public JSON. |

## Additional reproduced defects

| ID | Priority | Finding | Evidence / fix direction |
| --- | --- | --- | --- |
| A09 | Medium | Unsupported report photos such as HEIC are silently discarded while the API returns 201. A found-item report can also succeed without the photo required by the mobile UI. Claim pickers accept `image/*`, although the backend accepts only specific formats. | `backend/app.py:334`, `mobile/src/app/(tabs)/report.tsx:69`; missing-photo, unsupported-photo, and client-format tests fail. Reject unsupported files clearly or convert them to a supported format; enforce the chosen required-photo rule server-side. |
| A10 | Medium | A DB failure after saving a report leaves an orphaned image. Repeated failed attempts can consume storage and later cause more upload failures. | `backend/app.py:334`; temporary-upload cleanup test fails. Roll back and remove unreferenced new files. |
| A11 | Medium | The stored procedure deliberately rejects a second claim, but the API turns that business conflict into generic HTTP 500. The app tells the user to retry even though the one-claim rule will keep rejecting it. | `backend/app.py:771`, `database_setup_test.sql:525`; duplicate-claim test gets 500 rather than 409. Keep the unique constraint; map known conflicts/not-found/unavailable states to useful responses. |
| A12 | Medium | Restore-history views omit `status`, but `public_item_row` indexes it unconditionally. History retrieval raises an exception rather than displaying the records. | `database_setup_test.sql:373`, `backend/app.py:157`, `:504`; history-view contract test fails. Give staff history a compatible serializer/response contract. |
| A13 | Medium, capacity-dependent | `LPAD(v_last_number, 4, '0')` truncates longer values. Counter 10000 formats as 1000, colliding with an existing unique code; logs can reach this threshold before items. | `database_setup_test.sql:685`; ID-format contract test fails. Pad to a minimum width without truncating longer counters, respecting destination column lengths. Current live counter values are unknown. |

The schema checks inspect source contracts and documented SQL grammar; they do not substitute for importing a corrected schema into an isolated MySQL instance. The endpoint checks execute actual Flask handlers with temporary files and mocked database connections. Client checks execute the real TypeScript service/client after transpilation, with mocked native transport.

## Why the earlier green tests did not establish successful submissions

The nine existing Python tests and twelve existing JavaScript tests pass. They verify guest/staff gates, basic claim validation, request construction, timeout handling, cancellation, and no automatic POST replay. They do not run stored procedures or validate the complete report/attachment lifecycle. A `MagicMock.commit()` succeeding proves the handler attempted a commit; it does not prove MySQL accepted it.

The new Python audit has 15 test methods: one happy-path report test passes and 14 methods expose problems. Subtests produce 18 failed assertions. The new JavaScript audit has three failing checks. These are intentionally normal failing checks, not suppressed expected failures, so fixing a defect turns its check green. Failure counts are not counts of distinct bugs; several checks cover the same upload/error contract. Full machine-readable output is in `submission-results.json`. The complete audit command was run: typecheck and lint passed; the configured API health/readiness and live database inspection were unavailable.

## Repeatable checks

From the repository root:

```powershell
py backend/audit_submissions.py
```

This runs backend tests, every `mobile/scripts/check-*.cjs` suite, mobile typecheck, and lint, then writes `audit/submission-results.json`. It returns exit code 1 while defects or unavailable checks remain. Existing passing suites remain included.

For configured-API and installed-schema diagnostics, start Flask/MySQL and run:

```powershell
py backend/audit_submissions.py --live
```

For a quicker test-only rerun:

```powershell
py backend/audit_submissions.py --skip-tooling
```

The optional live checks use HTTP GET and SELECT/information-schema reads. They verify API health/readiness, procedure parameter counts (9/14/2), essential triggers, and view/table columns. They never call write procedures, reset the database, or submit a fake claim to an existing item. All write-handler tests mock MySQL and use disposable temporary upload folders. The installed Python environment must contain `backend/requirements.txt`, and mobile dependencies must already be installed.

## Remaining integration limits

- Both configured-API health/readiness requests were unavailable (`URLError`). The live DB inspection attempted during this audit failed with connector error 2003. This is an environment observation, not proof of which schema is currently installed. The configured API's current reachability is recorded by `--live` separately.
- Real Android/iOS file URI permissions, native cookie persistence, a changed LAN IP/firewall, and physical-device upload transport need a device/emulator integration test. Mocking fetch does not establish those behaviors. No claim is made that the earlier phone network failure has been fully diagnosed.
- Readiness currently checks only `SELECT 1`; it can report ready even if an application procedure, column, trigger, or seed lookup is missing. The new optional schema checks make that distinction visible.
- Raw `CALL` result draining and concurrent inserts need verification against the actual MySQL/connector version. Missing `nextset()` alone was not treated as a confirmed blocker: the current procedure bodies need not return a SELECT result set.
- The seeded `Admin` account has a plaintext password, while the login endpoint always uses bcrypt. That account cannot authenticate correctly. `Admin123` has a bcrypt hash. Native session/CSRF restoration after storage loss or expiry also needs integration coverage.
- A lost response after a committed write remains ambiguous. POSTs are not automatically retried, which is correct, but report submissions have no idempotency key. A manual retry can create a second report; an existing claim instead hits the one-claim constraint.

Recommended fix order: A01 and installed-schema checks; upload/error handling (A02-A04, A06, A09-A10); report validation and query contracts (A07-A08, A12); restore/claim business responses (A05, A11); counter capacity and integration checks (A13).

## SQL references

- [MySQL CREATE TRIGGER grammar](https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html) and [MariaDB CREATE TRIGGER grammar](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/create-trigger): the conditional belongs inside the trigger body.
- [MySQL LPAD behavior](https://dev.mysql.com/doc/refman/8.4/en/string-functions.html#function_lpad): strings longer than the requested length are shortened.
- [Connector/Python nextset](https://dev.mysql.com/doc/connector-python/en/connector-python-api-mysqlcursor-nextset.html): relevant for a future real-connector result-set test.
