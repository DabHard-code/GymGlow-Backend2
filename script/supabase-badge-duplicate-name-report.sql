-- GymGlow read-only duplicate badge name report.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.

with duplicate_names as (
  select
    sport,
    lower(name) as normalized_name,
    count(*) as row_count
  from badges
  group by sport, lower(name)
  having count(*) > 1
),
duplicate_rows as (
  select
    b.id,
    b.name,
    b.short_name,
    b.sport,
    b.tier,
    b.criteria_type,
    b.criteria_json,
    b.sort_order,
    count(bp.id) as badge_progress_count
  from badges b
  join duplicate_names d
    on d.sport = b.sport
    and d.normalized_name = lower(b.name)
  left join badge_progress bp on bp.badge_id = b.id
  group by b.id, b.name, b.short_name, b.sport, b.tier, b.criteria_type, b.criteria_json, b.sort_order
)
select jsonb_pretty(jsonb_build_object(
  'counts', jsonb_build_object(
    'duplicate_names', (select count(*) from duplicate_names),
    'duplicate_rows', (select count(*) from duplicate_rows),
    'duplicate_rows_with_progress', (select count(*) from duplicate_rows where badge_progress_count > 0)
  ),
  'duplicate_rows', coalesce(
    (select jsonb_agg(to_jsonb(duplicate_rows) order by name, badge_progress_count desc, sort_order, short_name) from duplicate_rows),
    '[]'::jsonb
  ),
  'cleanup_warning', 'Do not delete duplicate badge rows with badge_progress until progress is intentionally migrated.'
)) as gymglow_duplicate_badge_name_report;
