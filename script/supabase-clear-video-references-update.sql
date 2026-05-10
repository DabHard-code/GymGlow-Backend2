-- GymGlow video retention cleanup, step 1 update.
-- Clears DB references to old Supabase Storage videos now that videos are temporary.
-- This does not delete sessions, analyses, feedback, badges, or storage objects.

with video_objects as (
  select name as video_path
  from storage.objects
  where bucket_id = 'Videos'
),
cleared_sessions as (
  update sessions s
  set video_url = null
  from video_objects vo
  where s.video_url = vo.video_path
  returning 'sessions' as table_name, s.id, vo.video_path
),
cleared_challenge_submissions as (
  update challenge_submissions cs
  set video_url = null
  from video_objects vo
  where cs.video_url = vo.video_path
  returning 'challenge_submissions' as table_name, cs.id, vo.video_path
)
select *
from cleared_sessions
union all
select *
from cleared_challenge_submissions
order by table_name, id;
