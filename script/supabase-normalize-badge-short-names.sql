-- GymGlow badge short_name normalization update.
-- Reviewed preview showed 60 changes and 0 conflicts.
-- This updates only badges.short_name. It does not delete badges or touch progress/history.

with normalized as (
  select
    id,
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
    end as next_short_name
  from badges
),
changed as (
  update badges b
  set short_name = n.next_short_name
  from normalized n
  where b.id = n.id
    and b.short_name is distinct from n.next_short_name
  returning
    b.id,
    b.name,
    b.short_name as new_short_name,
    n.next_short_name,
    b.sport,
    b.tier,
    b.criteria_type,
    b.sort_order
)
select *
from changed
order by sort_order, name;
