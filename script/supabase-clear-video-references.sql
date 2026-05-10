-- GymGlow video retention cleanup, step 1.
-- Clears DB references to old Supabase Storage videos now that videos are temporary.
--
-- Run the PREVIEW first. Run the UPDATE only after reviewing.

-- PREVIEW: DB rows that still point at stored video objects.
with video_objects as (
  select name as video_path
  from storage.objects
  where bucket_id = 'Videos'
)
select
  'sessions' as table_name,
  s.id,
  s.video_url,
  s.status,
  s.created_at
from sessions s
join video_objects vo on vo.video_path = s.video_url
where s.video_url is not null
union all
select
  'challenge_submissions' as table_name,
  cs.id,
  cs.video_url,
  cs.status,
  cs.submitted_at as created_at
from challenge_submissions cs
join video_objects vo on vo.video_path = cs.video_url
where cs.video_url is not null
order by table_name, created_at desc nulls last;

-- UPDATE: uncomment after the preview looks right.
/*
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
*/
