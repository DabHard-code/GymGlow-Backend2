-- GymGlow duplicate challenge cleanup DELETE.
-- Deletes only expired duplicate challenge rows with zero submissions.
-- Based on the reviewed preview from 2026-05-07.

with duplicate_groups as (
  select
    sport,
    name,
    coalesce(target_skill_id, '') as target_skill_id,
    difficulty,
    is_active
  from challenges
  group by sport, name, coalesce(target_skill_id, ''), difficulty, is_active
  having count(*) > 1
),
delete_candidates as (
  select c.id
  from challenges c
  join duplicate_groups g
    on g.sport = c.sport
    and g.name = c.name
    and g.target_skill_id = coalesce(c.target_skill_id, '')
    and g.difficulty = c.difficulty
    and g.is_active is not distinct from c.is_active
  left join challenge_submissions cs on cs.challenge_id = c.id
  where c.end_date < now()
  group by c.id
  having count(cs.id) = 0
)
delete from challenges
where id in (select id from delete_candidates)
returning id, name, target_skill_id, start_date, end_date;
