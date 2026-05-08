-- GymGlow badge short_name normalization preview.
-- Safe to run in the Supabase SQL editor. This query does not insert, update, or delete data.

with candidates as (
  select
    id,
    name,
    short_name as current_short_name,
    case
      -- Preserve canonical app-awarded / seed short names.
      when name = 'Amazing Balance' then 'amazing_balance'
      when name = 'Endurance Champ' then 'endurance_champ'
      when name = 'Flexibility Star' then 'flexibility_star'
      when name = 'Glow Up' then 'glow_up'
      when name = 'Graceful Flow' then 'graceful_flow'
      when name = 'Perfect Lines' then 'perfect_lines'
      when name = 'Power Move' then 'power_move'
      when name = 'Precision Master' then 'precision_master'
      when name = 'Rising Star' then 'rising_star'
      when name = 'Strong Core' then 'strong_core'
      when name = 'Crimson Challenger' then 'crimson_challenger'
      when name = 'Crimson Top 10' then 'crimson_top_ten'
      when name = 'Weekly Champion' then 'crimson_weekly_champion'
      when name = 'Crimson Consistency' then 'crimson_consistency'
      else lower(trim(both '_' from regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g')))
    end as next_short_name,
    sport,
    tier,
    criteria_type,
    sort_order
  from badges
),
changed as (
  select *
  from candidates
  where current_short_name is distinct from next_short_name
),
conflicts as (
  select
    sport,
    next_short_name,
    count(*) as row_count,
    array_agg(id order by sort_order nulls last, id) as badge_ids,
    array_agg(name order by sort_order nulls last, id) as badge_names
  from candidates
  group by sport, next_short_name
  having count(*) > 1
)
select jsonb_pretty(jsonb_build_object(
  'counts', jsonb_build_object(
    'badges_that_would_change', (select count(*) from changed),
    'short_name_conflicts', (select count(*) from conflicts)
  ),
  'conflicts', coalesce(
    (select jsonb_agg(to_jsonb(conflicts) order by row_count desc, sport, next_short_name) from conflicts),
    '[]'::jsonb
  ),
  'changes', coalesce(
    (select jsonb_agg(to_jsonb(changed) order by sort_order, name) from changed),
    '[]'::jsonb
  ),
  'cleanup_warning', 'Only run the update when short_name_conflicts is 0.'
)) as gymglow_badge_short_name_normalization_preview;
