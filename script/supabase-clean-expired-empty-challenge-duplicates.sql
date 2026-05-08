-- GymGlow duplicate challenge cleanup.
-- This removes only expired duplicate challenge rows that have no submissions.
-- It preserves:
-- - current-week challenge rows
-- - any challenge row with challenge_submissions
-- - non-duplicate/custom challenges
--
-- Run the preview SELECT first. Run the DELETE only after reviewing the preview.

-- PREVIEW: rows that would be deleted.
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
  select
    c.id,
    c.name,
    c.sport,
    c.target_skill_id,
    c.difficulty,
    c.start_date,
    c.end_date,
    c.created_at,
    count(cs.id) as submission_count
  from challenges c
  join duplicate_groups g
    on g.sport = c.sport
    and g.name = c.name
    and g.target_skill_id = coalesce(c.target_skill_id, '')
    and g.difficulty = c.difficulty
    and g.is_active is not distinct from c.is_active
  left join challenge_submissions cs on cs.challenge_id = c.id
  where c.end_date < now()
  group by c.id, c.name, c.sport, c.target_skill_id, c.difficulty, c.start_date, c.end_date, c.created_at
  having count(cs.id) = 0
)
select *
from delete_candidates
order by name, end_date desc, id;

-- DELETE: uncomment this block only after the preview looks right.
/*
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
*/

-- OPTIONAL: mark expired challenge rows inactive while preserving their history.
-- This is safe for rows with submissions because it does not delete them.
/*
update challenges
set is_active = false
where end_date < now()
  and is_active = true
returning id, name, target_skill_id, start_date, end_date, is_active;
*/
