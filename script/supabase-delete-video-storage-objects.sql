-- GymGlow video retention cleanup, step 2.
-- Deletes remaining objects in the Supabase Storage "Videos" bucket after DB references are cleared.
--
-- Run the PREVIEW first. Run the DELETE only after the preview shows the expected objects.

-- PREVIEW: objects that would be deleted.
select
  o.id,
  o.name as video_path,
  o.created_at,
  (o.metadata->>'size')::bigint as size_bytes,
  round(((o.metadata->>'size')::numeric / 1024 / 1024), 2) as size_mb,
  count(distinct s.id) as session_reference_count,
  count(distinct cs.id) as challenge_submission_reference_count
from storage.objects o
left join sessions s on s.video_url = o.name
left join challenge_submissions cs on cs.video_url = o.name
where o.bucket_id = 'Videos'
group by o.id, o.name, o.created_at, o.metadata
order by o.created_at desc nulls last, o.name;

-- DELETE: uncomment after the preview looks right.
/*
delete from storage.objects o
where o.bucket_id = 'Videos'
returning
  o.id,
  o.name as deleted_video_path,
  o.created_at,
  (o.metadata->>'size')::bigint as size_bytes;
*/
