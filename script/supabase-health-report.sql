-- GymGlow read-only Supabase health report.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.

with
table_counts as (
  select jsonb_build_object(
    'users', (select count(*) from users),
    'athletes', (select count(*) from athletes),
    'sport_profiles', (select count(*) from sport_profiles),
    'sessions', (select count(*) from sessions),
    'analyses', (select count(*) from analyses),
    'badges', (select count(*) from badges),
    'earned_badges', (select count(*) from earned_badges),
    'badge_progress', (select count(*) from badge_progress),
    'drills', (select count(*) from drills),
    'skills', (select count(*) from skills),
    'drill_skills', (select count(*) from drill_skills),
    'challenges', (select count(*) from challenges),
    'challenge_submissions', (select count(*) from challenge_submissions),
    'competition_points', (select count(*) from competition_points)
  ) as value
),
challenge_groups as (
  select
    sport,
    name,
    coalesce(target_skill_id, '') as target_skill_id,
    difficulty,
    is_active,
    count(*) as row_count,
    count(*) filter (where start_date <= now() and end_date >= now()) as currently_active_count,
    min(start_date) as earliest_start_date,
    max(end_date) as latest_end_date,
    array_agg(id order by created_at nulls last, id) as challenge_ids
  from challenges
  group by sport, name, coalesce(target_skill_id, ''), difficulty, is_active
  having count(*) > 1
),
duplicate_challenge_groups as (
  select coalesce(jsonb_agg(to_jsonb(challenge_groups) order by row_count desc, name), '[]'::jsonb) as value
  from challenge_groups
),
duplicate_challenge_rows as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.name, row_data.submission_count desc, row_data.id), '[]'::jsonb) as value
  from (
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
    join challenge_groups g
      on g.sport = c.sport
      and g.name = c.name
      and g.target_skill_id = coalesce(c.target_skill_id, '')
      and g.difficulty = c.difficulty
      and g.is_active is not distinct from c.is_active
    left join challenge_submissions cs on cs.challenge_id = c.id
    group by c.id, c.name, c.sport, c.target_skill_id, c.difficulty, c.is_active, c.start_date, c.end_date, c.created_at
  ) row_data
),
badge_short_name_issues as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.sort_order, row_data.name), '[]'::jsonb) as value
  from (
    select
      id,
      name,
      short_name,
      lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')) as suggested_short_name,
      tier,
      sport,
      criteria_type,
      sort_order
    from badges
    where short_name is null
       or short_name <> lower(short_name)
       or short_name ~ '[^a-z0-9_]'
  ) row_data
),
duplicate_badge_keys as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.row_count desc, row_data.sport, row_data.normalized_name), '[]'::jsonb) as value
  from (
    select
      sport,
      lower(name) as normalized_name,
      coalesce(lower(short_name), '') as normalized_short_name,
      count(*) as row_count,
      array_agg(id order by sort_order nulls last, id) as badge_ids
    from badges
    group by sport, lower(name), coalesce(lower(short_name), '')
    having count(*) > 1
  ) row_data
),
legacy_badges_without_catalog_match as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.award_count desc, row_data.badge_type), '[]'::jsonb) as value
  from (
    select
      eb.badge_type,
      count(*) as award_count
    from earned_badges eb
    left join badges b on lower(b.short_name) = lower(eb.badge_type)
    where b.id is null
    group by eb.badge_type
  ) row_data
),
orphan_badge_progress as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb) as value
  from (
    select
      bp.id,
      bp.athlete_id,
      bp.badge_id,
      case when a.id is null then true else false end as missing_athlete,
      case when b.id is null then true else false end as missing_badge
    from badge_progress bp
    left join athletes a on a.id = bp.athlete_id
    left join badges b on b.id = bp.badge_id
    where a.id is null or b.id is null
  ) row_data
),
orphan_drill_skill_links as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.id), '[]'::jsonb) as value
  from (
    select
      ds.id,
      ds.drill_id,
      ds.skill_id,
      case when d.id is null then true else false end as missing_drill,
      case when s.id is null then true else false end as missing_skill
    from drill_skills ds
    left join drills d on d.id = ds.drill_id
    left join skills s on s.id = ds.skill_id
    where d.id is null or s.id is null
  ) row_data
)
select jsonb_pretty(jsonb_build_object(
  'counts', table_counts.value,
  'duplicate_challenge_groups', duplicate_challenge_groups.value,
  'duplicate_challenge_rows', duplicate_challenge_rows.value,
  'badge_short_name_issues', badge_short_name_issues.value,
  'duplicate_badge_keys', duplicate_badge_keys.value,
  'legacy_badges_without_catalog_match', legacy_badges_without_catalog_match.value,
  'orphan_badge_progress', orphan_badge_progress.value,
  'orphan_drill_skill_links', orphan_drill_skill_links.value,
  'cleanup_warning', 'Review challenge_submissions before deleting duplicate challenges.'
)) as gymglow_health_report
from table_counts,
  duplicate_challenge_groups,
  duplicate_challenge_rows,
  badge_short_name_issues,
  duplicate_badge_keys,
  legacy_badges_without_catalog_match,
  orphan_badge_progress,
  orphan_drill_skill_links;
