# GymGlow Handoff

Last updated: 2026-05-10

## Current State

- App/server use Supabase Postgres for the database. Render hosts the deployed app/server.
- Native mobile work now lives in `mobile/gymglow-native`. This Expo Router app was imported from the first-pass native prototype and its API layer was updated to use Supabase bearer tokens instead of legacy `x-user-id` headers so it matches the hardened backend.
- Native mobile visual polish pass started: shared theme colors, glass cards, gradient primary buttons, home hero, athlete rows, upload screen, and settings screen were redesigned to feel closer to a real GymGlow mobile app.
- Uploaded videos are treated as temporary processing files. Successful and failed analyses/challenge submissions remove the Supabase Storage video object and keep only results/metadata.
- Old Supabase Storage videos were manually deleted from the `Videos` bucket after DB references were cleared.
- Settings now includes an account deletion flow. `DELETE /api/users/me` requires Supabase bearer auth and the confirmation phrase `DELETE MY ACCOUNT`, removes user-owned app data, attempts to cancel active Stripe subscription, removes any remaining user video storage objects, and deletes the Supabase Auth user.
- Profile pages now include individual analysis/result deletion. `DELETE /api/analyses/:id` requires ownership, removes the analysis row, tied earned badges, analysis-sourced competition points, any leftover stored video path, and the parent session when it no longer has analyses.
- Added public `/privacy-choices` page for account/data deletion instructions outside the logged-in app. Use this as the Google Play data deletion URL and optionally Apple privacy choices URL.
- Added persisted in-app support/safety reporting. The Feedback dialog posts to `POST /api/support-reports` and stores reports in the new `support_reports` table.
- Added safe public leaderboard aliases with `athletes.public_display_name`. Private athlete names remain inside the user's account; leaderboard/result endpoints return public aliases and `isViewer` instead of exposing athlete IDs.
- Weekly challenges now use a rotating 12-template gymnastics catalog instead of always showing the same handstand/cartwheel/landing trio. The active endpoint prioritizes the current week's rotated three while preserving existing challenge/submission history.
- AI analysis prompts were tightened for youth-safe, specific coaching. Feedback now requires observable notes, a reason it matters, a clear correction cue, drill/repetition suggestions, conservative scoring when unclear, and stricter challenge eligibility checks.
- Added `users.display_name`, `PATCH /api/users/me`, and a cleaner Settings account card. Raw account IDs are tucked under support details instead of shown as the primary account identity.
- Added first-run trust polish: onboarding now explains private names, public aliases, temporary video processing, and AI-feedback limits; athlete creation explains private names; uploads and challenges show short video retention and safety disclaimers.
- Added Comp Week visibility. Callouts now show when the shared GymGlow Comp Week calendar is live or coming soon on athlete cards, profile upload pages, and the badge page. Crimson badge locked text now explains whether badges are available during the current Comp Week or locked until the next one.
- Added a Comp Week calendar to the competition results screen. It shows the shared 6-week GymGlow cycle, highlights the current week, and marks weeks 3 and 6 as Comp Weeks. The home button now reads "Comp Calendar & Results."
- Auth was hardened from trusting `x-user-id` to requiring a Supabase bearer token.
- Duplicate Supabase client usage was fixed on the frontend.
- Badge catalog sync and legacy `earned_badges` to `badge_progress` backfill were added.
- Drill-to-skill seeding was added.
- Active challenge responses are deduped before returning to the client.
- Type check, `db:push`, and production build passed after the repair work, result deletion pass, privacy choices pass, support-report pass, public leaderboard alias pass, weekly challenge rotation pass, AI feedback quality pass, account display-name pass, first-run trust polish pass, Comp Week visibility pass, and Comp Week calendar pass.

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

1. Test individual result deletion with a disposable user that has earned badges/competition points, then confirm the result disappears from the profile.
2. After deploying, test Settings -> edit athlete -> public leaderboard name, then confirm leaderboard rows show the alias and not a private athlete name.
3. Confirm `/api/challenges?active=true` returns the current rotated three challenges and that old submissions remain visible on their original challenge rows.
4. Test a normal upload and one intentionally wrong challenge upload to confirm feedback is specific and ineligible submissions are rejected kindly.
5. After deploying, edit Settings -> Account display name and verify it persists after reload.
6. Test the shared Comp Week calendar in weeks 1, 2, 3, and 6 to confirm the callout copy is clear for inactive, upcoming, and live states. The default shared cycle starts on the Sunday week of `2026-05-10`; override with `GYMGLOW_COMP_CYCLE_START=YYYY-MM-DD` if needed.
7. In app store consoles, set Privacy Policy URL to `/privacy` and Google Play data deletion URL to `/privacy-choices`.
8. Implement the remaining badge earning rules for criteria such as `score_threshold`, `drills_logged`, `cues_used`, and `improvement` after storing stronger structured evidence.

## Important Reminder

Do not run destructive cleanup SQL until duplicate challenge rows are checked against `challenge_submissions`.
