-- GymGlow read-only duplicate challenge report.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.

with duplicate_groups as (
  select
    sport,
    name,
    coalesce(target_skill_id, '') as target_skill_id,
    difficulty,
    is_active,
    count(*) as row_count,
    count(*) filter (where start_date <= now() and end_date >= now()) as currently_active_count,
    min(start_date) as earliest_start_date,
    max(end_date) as latest_end_date
  from challenges
  group by sport, name, coalesce(target_skill_id, ''), difficulty, is_active
  having count(*) > 1
),
duplicate_rows as (
  select
    c.id,
    c.name,
    c.sport,
    c.target_skill_id,
    c.difficulty,
    c.is_active,
    c.start_date,
    c.end_date,
    c.created_at,
    count(cs.id) as submission_count,
    case
      when count(cs.id) > 0 then 'keep_or_migrate_submissions_before_delete'
      else 'candidate_duplicate_delete_after_review'
    end as cleanup_note
  from challenges c
  join duplicate_groups g
    on g.sport = c.sport
    and g.name = c.name
    and g.target_skill_id = coalesce(c.target_skill_id, '')
    and g.difficulty = c.difficulty
    and g.is_active is not distinct from c.is_active
  left join challenge_submissions cs on cs.challenge_id = c.id
  group by c.id, c.name, c.sport, c.target_skill_id, c.difficulty, c.is_active, c.start_date, c.end_date, c.created_at
)
select jsonb_pretty(jsonb_build_object(
  'counts', jsonb_build_object(
    'challenges', (select count(*) from challenges),
    'challenge_submissions', (select count(*) from challenge_submissions),
    'duplicate_groups', (select count(*) from duplicate_groups),
    'duplicate_rows', (select count(*) from duplicate_rows),
    'duplicate_rows_with_submissions', (select count(*) from duplicate_rows where submission_count > 0)
  ),
  'duplicate_groups', coalesce(
    (select jsonb_agg(to_jsonb(duplicate_groups) order by row_count desc, name) from duplicate_groups),
    '[]'::jsonb
  ),
  'duplicate_rows', coalesce(
    (select jsonb_agg(to_jsonb(duplicate_rows) order by name, submission_count desc, created_at desc nulls last, id) from duplicate_rows),
    '[]'::jsonb
  ),
  'cleanup_warning', 'Do not delete duplicate challenges that have submissions until those submissions are reviewed or migrated.'
)) as gymglow_duplicate_challenge_report;
