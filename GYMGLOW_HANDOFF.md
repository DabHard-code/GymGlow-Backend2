# GymGlow Handoff

Last updated: 2026-05-07

## Current State

- App/server use Supabase Postgres for the database. Render hosts the deployed app/server.
- Uploaded videos are treated as temporary processing files. Successful and failed analyses/challenge submissions remove the Supabase Storage video object and keep only results/metadata.
- Old Supabase Storage videos were manually deleted from the `Videos` bucket after DB references were cleared.
- Settings now includes an account deletion flow. `DELETE /api/users/me` requires Supabase bearer auth and the confirmation phrase `DELETE MY ACCOUNT`, removes user-owned app data, attempts to cancel active Stripe subscription, removes any remaining user video storage objects, and deletes the Supabase Auth user.
- Auth was hardened from trusting `x-user-id` to requiring a Supabase bearer token.
- Duplicate Supabase client usage was fixed on the frontend.
- Badge catalog sync and legacy `earned_badges` to `badge_progress` backfill were added.
- Drill-to-skill seeding was added.
- Active challenge responses are deduped before returning to the client.
- Type check and production build passed after the repair work.

## Latest Supabase Audit

After the repair code ran:

- `badges`: 74
- `drills`: 32
- `skills`: 97
- `drill_skills`: 32
- `earned_badges`: 66
- `badge_progress`: 7
- `challenges`: 24
- `challenge_submissions`: 7

This means the broken drill/skill wiring was repaired, and badge progress now has catalog-backed rows instead of being empty.

After duplicate challenge cleanup:

- Deleted 17 expired duplicate challenge rows with zero submissions.
- Preserved the expired Stick Landing challenge row with 3 submissions.
- Preserved the current-week challenge rows.
- Marked 4 remaining expired challenge rows inactive, preserving their history and submissions.

After badge cleanup:

- Badge health report showed no orphan `badge_progress`, no duplicate badge names, and no legacy earned badge types missing catalog matches.
- Normalized 60 badge `short_name` values to stable lowercase snake_case keys.
- Preserved the 7 catalog-backed `badge_progress` rows from legacy earned badge backfill.

After first badge earning logic pass:

- Added upload-based catalog badge evaluation after successful non-trial analyses.
- Added startup backfill for existing profiles based on each profile's latest analysis.
- Implemented rules that can be proven from current tables:
  - `upload_count`
  - `streak` with `type: "upload_score"`
  - `streak` with `type: "upload_days"`
- Deliberately skipped cue, drill, event-specific score, improvement, and competition-rank rules until the app stores stronger structured evidence for those.

## Known Remaining Issues

- `challenges` still contains duplicate active challenge rows in Supabase. The API dedupes them for the UI, but the database still needs careful cleanup.
- One expired Stick Landing challenge row with submissions is preserved as inactive. Do not delete it unless submissions are intentionally migrated.
- Badge `short_name` values were normalized in Supabase. Keep future seed/catalog values as lowercase snake_case.
- Many catalog badge criteria types exist, but not all are fully implemented as earning logic yet.
- The legacy `earned_badges` table still contains old analysis-based awards. It should be preserved until all UI and logic uses `badge_progress` cleanly.

## Recommended Next Steps

1. Test account deletion with a disposable/demo user in Supabase before relying on it for real users.
2. Add session/result deletion controls for users who want to remove individual analysis history without deleting the whole account.
3. Implement the remaining badge earning rules for criteria such as `score_threshold`, `drills_logged`, `cues_used`, and `improvement` after storing stronger structured evidence.
4. Do an App Store readiness pass for child safety, AI disclosure, and subscriptions.

## Important Reminder

Do not run destructive cleanup SQL until duplicate challenge rows are checked against `challenge_submissions`.
