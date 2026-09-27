import 'dotenv/config';
import {readFileSync} from 'node:fs';
import {pool} from '../server/db';
import {syncAllBadgeEvidence} from '../server/badge-sync';
try {
  const before=(await pool.query('SELECT count(*)::int AS count FROM earned_badges')).rows[0].count;
  await pool.query(readFileSync('script/badge-evidence-migration.sql','utf8'));
  await syncAllBadgeEvidence();
  const {rows}=await pool.query(`SELECT (SELECT count(*)::int FROM earned_badges) AS historical_awards,
    (SELECT count(*)::int FROM badge_progress) AS progress_rows,
    (SELECT count(*)::int FROM badge_progress WHERE progress_value>=progress_target) AS earned_progress,
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.practice_logs'::regclass) AS practice_rls,
    has_table_privilege('anon','public.practice_logs','SELECT') AS anon_can_read`);
  if(rows[0].historical_awards!==before || !rows[0].practice_rls || rows[0].anon_can_read)throw new Error('Migration checks failed');
  console.log(rows[0]);
} finally {await pool.end();}
