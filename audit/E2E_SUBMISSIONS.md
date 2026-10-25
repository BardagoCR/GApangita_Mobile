# Live submission verification

Update: the two failures below are now fixed. The expanded lifecycle verification passes 62/62 on localhost and LAN. See [CLAIM_LIFECYCLE.md](CLAIM_LIFECYCLE.md) for current behavior, migration and test results. The remainder records the earlier baseline.

Verified October 25, 2026 against the running Flask API and MariaDB 10.4.32.

**Result: 38 of 40 checks passed**, independently through localhost and the computer's current Wi-Fi address. This executes live HTTP requests, real stored procedures/transactions, and real upload writes and downloads. It does not operate a physical phone's UI or its native photo-picker file permissions.

## Connection issue found and corrected

`mobile/.env` pointed to `http://10.108.86.208:5000/api`. That address timed out even when checked outside the sandbox. The computer's current Wi-Fi address is `10.129.48.208`, and its API health check returned 200. Updated the environment file to `http://10.129.48.208:5000/api`.

Restart Expo and fully reload the app so the bundled API address is refreshed. Rebuild distributed binaries if they embed the old environment configuration.

## Live flows that passed

- Staff login, session cookies, CSRF-authenticated report submission, and logout.
- Required category, branch, and location lookups.
- One lost-item report without a photo and two found-item reports with real PNG files. Each acknowledged report persisted exactly one database row.
- Public claims without evidence, with PNG evidence, and with PDF evidence. All persisted with Pending status.
- Staff retrieval of PNG/PDF evidence matched the uploaded bytes exactly. Guest evidence retrieval was rejected.
- Staff accounts could not submit public claims, and guests could not report items.
- Pending claims disabled public claiming; duplicate submission did not create a second claim row.
- Staff Under Review, Approved, and Returned updates persisted, including the expected item lifecycle changes.
- Removal of all run-owned test item/claim rows and files.

## Failures confirmed against the live services

1. **Duplicate-claim feedback:** the duplicate is correctly blocked, but POST `/api/claims` returns HTTP 500 with `Unable to save the claim. Please try again.` This should be a business conflict response rather than a retryable-looking server failure.
2. **Restore of a claimed item:** POST `/api/items/unarchive` returns HTTP 500 with MySQL error 1054, `Unknown column 'claimProof_file_path' in 'field list'`. The installed restore procedure still references the removed column. This confirms the earlier source audit finding against the live database.

The raw procedure calls did work for normal reports and claims on this MariaDB/connector setup. Their lack of explicit result draining was not a demonstrated submission blocker in these runs. The installed claim-lifecycle trigger was present and its transitions worked; that does not repair the incompatible trigger syntax still present in the repository's reset/setup SQL.

## Re-run without repeating manual form entry

```powershell
py backend/verify_submissions_e2e.py --write-test-data
```

The default API address comes from `mobile/.env`, so a stale LAN address cannot be hidden by a successful localhost test. The script refuses remote API targets and requires `gapangita_db_test`. It uses the documented seeded Admin123 test account; set `GAPANGITA_E2E_PASSWORD` if that seed password has changed. Credentials and cookies are not written to the results.

For a localhost-only diagnostic:

```powershell
py backend/verify_submissions_e2e.py --api http://127.0.0.1:5000/api --write-test-data
```

Each run creates three uniquely marked test reports and three claims, then cleans only its own fixture rows, associated test audit-log rows, and byte-identifiable generated files. It never resets schema, deletes unrelated records, or resets ID counters. Normal generated-ID gaps remain. If the report endpoint fails, an explicitly labelled SQL fixture can independently exercise claiming; the report test remains failed rather than being counted as a successful submission.

Exit code 1 currently records the two confirmed failures. Per-check output is in `e2e-submission-results.json` for the LAN run and `e2e-loopback-results.json` for the localhost run. Both runs verified cleanup of three items and four uploaded files. Review any failed cleanup check before rerunning.
