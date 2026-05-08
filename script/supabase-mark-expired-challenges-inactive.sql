-- GymGlow challenge status cleanup.
-- Safe history-preserving update: marks expired challenges inactive without deleting them.
-- This keeps challenge_submissions intact.

update challenges
set is_active = false
where end_date < now()
  and is_active = true
returning id, name, target_skill_id, start_date, end_date, is_active;
