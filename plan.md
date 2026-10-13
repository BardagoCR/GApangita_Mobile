# GApangita Privacy and Claim Verification Plan

**Status:** QA decisions recorded; one-claim rule is preserved for the deadline  
**Target completion:** October 12, 2026  
**Scope:** Expo mobile app, Flask API, and MySQL test-schema changes. Keep the existing browser app working.

## Goal

Reduce identifying information shown to the public, collect useful ownership evidence when a claim is submitted, and give Admin/Staff a simple way to review the evidence and record a decision. Verification is manual; no fraud-detection algorithm is included.

## Current Baseline

- Public item searches and item details currently expose item photos, descriptions, branch/location names, and date/time data.
- The mobile claim form currently collects claimant names, contact number, and a proof photo.
- Claim submission currently requires an authenticated session.
- Claims are stored in `claimed_items`, linked to an item by `item_code`. The schema currently permits one claim per item.
- A database trigger closes the item immediately after claim insertion. There are no claim-review statuses or staff notes yet.
- The existing `database_setup_test.sql` drops and recreates `gapangita_db_test`. QA says this project database will be rerun, so edits will go directly into that setup file.

## Agreed Scope

### 1. Safer Public Listings

Public search and item-detail responses will show only:

- Generic item type/category, not an identifying title
- General color only from a separate, explicitly public color field; never extract it from the private description
- Branch/campus
- Approximate date, without time
- Public availability derived from the existing item status and its claim status

Public responses will omit exact location, detailed description, and original item photo. This avoids image-processing work; staff retain access to the original information for verification. Exact time and item-specific details remain available only through staff-authorized claim review.

The claim flow will continue to identify which listing is being claimed, but the public listing must not reveal the details intended to verify ownership.

### 2. Claim Form

Claim submission will be available without an account. This is an intentional change from the current authenticated-only behavior so students, faculty, staff, or visitors can submit a claim. Admin/Staff login remains required for staff review and archive operations. No claimant account or sign-up system will be added.

The form will collect:

- Claimant full name, contact number, email, and affiliation (Student, Faculty, Staff, or Visitor)
- Last-seen location and approximate date/time
- Item description and identifying features, including marks or damage
- Contents, when applicable
- Additional evidence
- Optional pre-loss photo or other ownership evidence attachment; it can support verification but is not required to submit

Required versus optional answers will be enforced in both the app and API. Required: full name, contact number, email, affiliation, item description, and identifying features. Optional: last-seen location, approximate date/time, contents, additional evidence, and evidence attachment. For the deadline, support common images and PDF documents only, validate actual file content/MIME as well as the extension, and enforce a size limit.

### 3. Claim Storage and Review

To minimize disruption, extend the existing `claimed_items` table rather than renaming it. Keep `item_code` as the link to the found item and add the new claimant/evidence fields, `status`, `staff_notes`, and an update timestamp. Existing `date_claimed` will serve as the creation timestamp. Add an optional public color field to the item record; do not expose the private item name/description as the public label.

Claim statuses:

- `Pending`: submitted and awaiting staff review
- `Under Review`: staff is checking evidence
- `Approved`: ownership is verified; item is reserved/unavailable
- `Rejected`: evidence did not match; item remains visible for staff follow-up but cannot accept another public claim under the one-claim rule
- `Returned`: handoff is complete; item is closed

**One claim per item:** QA confirmed one claim per item is sufficient, so preserve the current unique `item_code` constraint. Pending/Under Review blocks any second claim. After Rejected, keep the listing visible with a staff-follow-up state, disable public claim submission, and direct the claimant to staff; exceptional follow-up is manual. Do not label a rejected item “Available” with an enabled claim button because the unique constraint would reject the second submission.

**Separate claim status from public availability:** store the review status on the claim. Do not add a second independently edited public status that can disagree with it. The API derives display availability and `can_claim` from the existing item lifecycle state and claim status:

| Claim state | Public listing | Claim action |
| --- | --- | --- |
| No claim; item open | Available | Enabled |
| Pending or Under Review | Under Verification | Disabled |
| Approved | Unavailable/reserved | Disabled |
| Rejected | Visible; contact staff | Disabled under the one-claim rule |
| Returned or item closed | Closed/not available | Disabled |

The existing 14-day auto-close for unclaimed listings is a separate expiry rule and remains unchanged unless the team explicitly changes it.

## Implementation Phases

### Phase 1: Confirm Decisions and Capture Baseline

- Record the agreed scope, including manual staff handling after rejection.
- Confirm the Flask backend points to the disposable `gapangita_db_test` before resetting it.
- Smoke-test the current browser and mobile flows that must continue working.

### Phase 2: Test Database Setup Changes

- Edit `database_setup_test.sql` directly; a separate migration script is not needed for this disposable project database.
- Add an optional `public_color` to items and claimant email/affiliation, last-seen location/date/time, item description, identifying features, contents, additional evidence, claim status, staff notes, and an update timestamp to `claimed_items`. Make the evidence-file path nullable and name it generically (for example, `evidence_file_path`) because it may point to an image or PDF.
- Update the claim stored procedure to save these fields and start each claim as `Pending`.
- Update the claimed-item trigger/workflow so inserting a claim does not immediately close the item. Availability is derived from item and claim status as specified above; `Approved` reserves it and `Returned` closes it.
- Adjust the existing hourly auto-close event so it only expires items with no Pending or Under Review claim. Keep the existing 14-day expiry for other unclaimed listings.
- Store proof/evidence files outside the web/static directory. Serve them only through a staff-authorized API endpoint; never save a public URL to the file in a public item response.
- Re-importing the setup script deletes and recreates `gapangita_db_test`, including its current items, claims, and users. This is acceptable only if it is the project test DB and its current data can be discarded. Back up anything to keep and confirm Flask points to this test DB before re-importing.
- After re-import, verify the seed account and seed listings return and the revised tables, procedures, and triggers are present.

### Phase 3: API and Access Control

- Accept and validate the expanded claim form without requiring claimant login.
- Add basic abuse protection to the public claim endpoint, such as per-IP rate limiting and a request-size limit; do not rely on claimant authentication to control spam.
- Save all submitted answers and the optional evidence-file path against the selected item.
- Add Admin/Staff-only endpoints for listing claims, reading full evidence, and updating status/notes.
- **Meaning of staff-only retrieval:** public item/search responses must not contain claimant contact details, ownership answers, staff notes, or an evidence-file path. The API route serving an evidence file must check the logged-in user's role and return it only to Admin/Staff. APIs returning full claim details or changing status/notes must make the same check. Hiding controls in the app alone is insufficient because callers can request API routes directly.
- Return an allowlisted public item response containing generic type/category, optional public color, branch/campus, approximate date, and derived availability. Do not serialize exact date/time, private location, full description, original item name, private photo path, or claim data and then hide it in the UI.
- Make evidence attachments optional. Validate content signature/actual MIME, allowed image/PDF type, size, and filename; extension alone is not sufficient. Keep the files outside static/public serving and stream them only after Admin/Staff authorization.
- If upload/database saving fails, remove any newly uploaded but unreferenced proof file and return a user-readable error.
- Update the legacy browser claim UI/request to the new public claim contract, and verify its staff review functions remain authenticated.

### Phase 4: Mobile UI

- **Public search cards:** show generic item/category, optional public color, branch/campus, approximate date, and derived availability. Hide original photo, detailed description, exact location, and exact time. Do not leave hidden data in serialized card data or accessibility text.
- **Report form:** collect optional general public color separately from the private item description. Do not derive the public color from description text, since descriptions may contain identifying details.
- **Public item details:** apply the same redaction so opening a listing does not reveal fields omitted from search. Flask must send a safe public response; the app should not download sensitive values and merely hide them visually.
- **Public claim form:** remove the sign-in gate. Collect full name, phone, email, affiliation, last-seen location/date/time, item description, identifying features, contents, and additional evidence. Prompt: “What unique characteristics does this item have?” with examples such as scratches, stickers, engravings, damage, decorations, initials, unique accessories, or other distinguishing features. Clearly mark required fields; make location/date/time/contents/additional evidence optional. Offer an optional pre-loss photo or other image/PDF evidence through the camera/photo picker and an Expo document picker for PDFs. Show validation errors, upload state, submission success, and API errors.
- **Staff claim queue:** add an Admin/Staff-only list showing item reference, claimant name, submission date, and current status, with loading, empty, and error states.
- **Staff claim detail:** show all ownership answers, the optional evidence attachment (image preview or PDF open/download), and original item details hidden from the public. Allow authorized staff to change the status and save verification notes.
- **Navigation and access:** public users can reach the claim form from a listing. Only Admin/Staff can see review screens, and Flask must enforce those permissions too.
- **Item lifecycle:** derive the public availability badge and claim-button state from item/claim status. Pending/Under Review show “Under Verification” and disable claiming; Approved is unavailable; Returned is closed; Rejected stays visible but requires staff follow-up and has no public claim button under the one-claim rule.

### Phase 5: QA and Release Check

- Run typecheck, lint, Expo web/Android bundle checks, and backend checks available in the environment.
- Test the recreated test database and API end to end before the October 12 demo.
- Smoke-test the legacy browser app for regressions.

## QA Acceptance Checklist

### Public Access and Privacy

- [ ] Logged-out users can browse and search open listings.
- [ ] Public list and detail responses do not expose exact location, precise time, detailed description, original photo, or claim data.
- [ ] Public listings still show useful general item/category, branch/campus, approximate date, and availability.
- [ ] Direct API requests cannot retrieve full claimant evidence or evidence files while logged out.
- [ ] The public API returns an allowlisted response; exact timestamps, private descriptions/locations, original names, image paths, and claim fields are absent from the payload, not just visually hidden.
- [ ] Claim availability follows the state table above; Pending/Under Review cannot accept another claim, and a Rejected item directs the person to staff rather than promising a second public claim.

### Claim Submission

- [ ] A logged-out visitor can submit a claim for an open item.
- [ ] Full name, contact number, email, affiliation, item description, and identifying features are required; other evidence fields are optional.
- [ ] Evidence attachment is optional; valid web/native images or PDFs are accepted and stored when provided.
- [ ] The database row links to the correct item and contains all submitted evidence, `Pending` status, and timestamps.
- [ ] Invalid submissions return a useful message and do not create a claim or leave an orphaned uploaded file.

### Staff Review

- [ ] Logged-out users cannot access the review queue, full evidence, staff notes, or status-update endpoint.
- [ ] Admin/Staff can inspect claimant answers and the original staff-only item details.
- [ ] Admin/Staff can set each supported status and save staff notes.
- [ ] Approval hides/reserves the item; Rejected remains visible for staff follow-up but cannot be publicly re-claimed under the one-claim rule; Returned is the final closed state.
- [ ] Status and item visibility behavior match the agreed lifecycle.
- [ ] Staff can find and manually handle an exceptional follow-up after a rejected claim; the app does not overwrite or discard the rejected evidence.

### False Claim Resistance

- [ ] Create two equivalent test items with different item codes and private distinctive features (for example, a red keychain and a small tear on the strap) absent from both public listings.
- [ ] Confirm neither public item response reveals those features.
- [ ] Submit an incorrect or insufficient claim for the first item; staff can compare it against private details, reject it, and record verification notes.
- [ ] Submit a matching claim for the second item; staff can confirm the evidence and advance its status. Use separate items because only one claim is allowed per item.
- [ ] When an optional image/PDF is attached, confirm only Admin/Staff can retrieve it through the authenticated API; unsupported or spoofed file types are rejected.

### Regression and Data Safety

- [ ] The setup script may reset the disposable test DB; confirm seed users and listings are restored afterward.
- [ ] Reporting, public search, item details, and archive/restore still behave as agreed.
- [ ] The legacy browser app remains usable after API response changes.
- [ ] Re-import only after confirming the target is the disposable project test DB; back up any data that must be preserved.

## Out of Scope Before October 12

- Automatic image blurring, cropping, or AI redaction; public item photos are hidden instead.
- Automated ownership scoring or fraud detection.
- Claimant accounts, sign-up, password reset, or notifications.
- Multiple concurrent claims per item unless explicitly added to the agreed scope.
- Replacing Flask, MySQL, or the existing Expo Router architecture.

## QA Decisions

- [x] Claim submission is public; claim review is Admin/Staff-only.
- [x] One claim per item is sufficient for the deadline.
- [x] Proof photo or other image/PDF evidence is optional.
- [x] Required fields are full name, contact number, email, affiliation, item description, and identifying features; the other evidence fields are optional.
- [x] Approval hides/reserves the listing; `Returned` is the final closed state.
- [x] Public photos are hidden entirely; image anonymization is not required.
- [x] **Rejected claim and re-submission:** preserve the rejected record; do not accept a second public claim for that item. Staff handles exceptional follow-up manually for this deadline.

**Agreement:** The checked decisions are incorporated. Public availability is derived from item and claim state; proof attachments are optional and staff-only; false-claim handling is manual. No remaining scope decision blocks implementation.