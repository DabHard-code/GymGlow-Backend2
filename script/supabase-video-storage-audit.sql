-- GymGlow read-only Supabase Storage video audit.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.
--
-- Purpose:
-- - Find old objects still sitting in the Supabase Storage "Videos" bucket.
-- - Show whether DB rows still reference those object paths.
-- - Prepare for cleanup now that GymGlow treats videos as temporary processing files.

with video_objects as (
  select
    o.id,
    o.bucket_id,
    o.name as video_path,
    o.owner,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    (o.metadata->>'size')::bigint as size_bytes,
    o.metadata
  from storage.objects o
  where o.bucket_id = 'Videos'
),
referenced as (
  select
    vo.*,
    count(distinct s.id) as session_reference_count,
    count(distinct cs.id) as challenge_submission_reference_count
  from video_objects vo
  left join sessions s on s.video_url = vo.video_path
  left join challenge_submissions cs on cs.video_url = vo.video_path
  group by
    vo.id,
    vo.bucket_id,
    vo.video_path,
    vo.owner,
    vo.created_at,
    vo.updated_at,
    vo.last_accessed_at,
    vo.size_bytes,
    vo.metadata
),
summary as (
  select jsonb_build_object(
    'storage_video_objects', (select count(*) from referenced),
    'referenced_by_sessions', (select count(*) from referenced where session_reference_count > 0),
    'referenced_by_challenge_submissions', (select count(*) from referenced where challenge_submission_reference_count > 0),
    'unreferenced_objects', (select count(*) from referenced where session_reference_count = 0 and challenge_submission_reference_count = 0),
    'total_size_mb', coalesce(round((sum(size_bytes)::numeric / 1024 / 1024), 2), 0)
  ) as value
  from referenced
)
select jsonb_pretty(jsonb_build_object(
  'summary', summary.value,
  'objects', coalesce(
    (
      select jsonb_agg(to_jsonb(referenced) order by created_at desc nulls last, video_path)
      from referenced
    ),
    '[]'::jsonb
  ),
  'cleanup_warning', 'Do not delete until you confirm GymGlow should retain no uploaded videos.'
)) as gymglow_video_storage_audit
from summary;
