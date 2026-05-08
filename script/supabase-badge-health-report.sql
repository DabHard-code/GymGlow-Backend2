-- GymGlow read-only badge health report.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.

with
counts as (
  select jsonb_build_object(
    'badges', (select count(*) from badges),
    'earned_badges', (select count(*) from earned_badges),
    'badge_progress', (select count(*) from badge_progress),
    'athletes', (select count(*) from athletes),
    'analyses', (select count(*) from analyses)
  ) as value
),
short_name_issues as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.sort_order, row_data.name), '[]'::jsonb) as value
  from (
    select
      id,
      name,
      short_name,
      lower(trim(both '_' from regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))) as suggested_short_name,
      tier,
      sport,
      criteria_type,
      criteria_json,
      sort_order
    from badges
    where short_name is null
       or short_name <> lower(short_name)
       or short_name ~ '[^a-z0-9_]'
  ) row_data
),
legacy_award_types as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.award_count desc, row_data.badge_type), '[]'::jsonb) as value
  from (
    select
      eb.badge_type,
      count(*) as award_count,
      count(distinct eb.athlete_id) as athlete_count,
      count(distinct eb.analysis_id) as analysis_count,
      max(eb.awarded_at) as latest_awarded_at,
      max(case when b.id is not null then 1 else 0 end) = 1 as has_catalog_short_name_match
    from earned_badges eb
    left join badges b on lower(b.short_name) = lower(eb.badge_type)
    group by eb.badge_type
  ) row_data
),
legacy_without_catalog_match as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.award_count desc, row_data.badge_type), '[]'::jsonb) as value
  from (
    select
      eb.badge_type,
      count(*) as award_count,
      count(distinct eb.athlete_id) as athlete_count,
      max(eb.awarded_at) as latest_awarded_at
    from earned_badges eb
    left join badges b on lower(b.short_name) = lower(eb.badge_type)
    where b.id is null
    group by eb.badge_type
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
progress_rows as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.athlete_id, row_data.badge_name), '[]'::jsonb) as value
  from (
    select
      bp.id,
      bp.athlete_id,
      b.name as badge_name,
      b.short_name,
      bp.progress_value,
      bp.progress_target,
      bp.updated_at,
      bp.context_json
    from badge_progress bp
    join badges b on b.id = bp.badge_id
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
criteria_type_counts as (
  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.row_count desc, row_data.criteria_type), '[]'::jsonb) as value
  from (
    select criteria_type, count(*) as row_count
    from badges
    group by criteria_type
  ) row_data
)
select jsonb_pretty(jsonb_build_object(
  'counts', counts.value,
  'short_name_issues', short_name_issues.value,
  'legacy_award_types', legacy_award_types.value,
  'legacy_without_catalog_match', legacy_without_catalog_match.value,
  'duplicate_badge_keys', duplicate_badge_keys.value,
  'badge_progress_rows', progress_rows.value,
  'orphan_badge_progress', orphan_badge_progress.value,
  'criteria_type_counts', criteria_type_counts.value,
  'cleanup_warning', 'Do not delete badges until badge_progress and earned_badges mappings are reviewed.'
)) as gymglow_badge_health_report
from counts,
  short_name_issues,
  legacy_award_types,
  legacy_without_catalog_match,
  duplicate_badge_keys,
  progress_rows,
  orphan_badge_progress,
  criteria_type_counts;
