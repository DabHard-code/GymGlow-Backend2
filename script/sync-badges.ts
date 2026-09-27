import 'dotenv/config';
import assert from 'node:assert/strict';
import { storage } from '../server/storage';
import { pool } from '../server/db';
import { syncAllBadgeEvidence } from '../server/badge-sync';

async function summary() {
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM badges) AS catalog,
    (SELECT count(*)::int FROM earned_badges) AS historical_awards,
    (SELECT count(*)::int FROM badge_progress) AS progress_rows,
    (SELECT count(*)::int FROM badge_progress WHERE progress_value >= progress_target) AS earned_progress,
    (SELECT count(*)::int FROM (SELECT athlete_id,badge_id FROM badge_progress GROUP BY athlete_id,badge_id HAVING count(*)>1) d) AS duplicate_progress,
    (SELECT count(*)::int FROM badge_progress p LEFT JOIN badges b ON b.id=p.badge_id LEFT JOIN athletes a ON a.id=p.athlete_id WHERE b.id IS NULL OR a.id IS NULL) AS orphan_progress,
    (SELECT count(*)::int FROM (SELECT DISTINCT e.athlete_id,b.id FROM earned_badges e JOIN badges b ON lower(b.short_name)=lower(e.badge_type) LEFT JOIN badge_progress p ON p.athlete_id=e.athlete_id AND p.badge_id=b.id WHERE p.id IS NULL OR p.progress_value<p.progress_target) m) AS missing_legacy_progress
  `)).rows[0];
}

try {
  const before = await summary();
  console.log('Before:', JSON.stringify(before));
  assert.equal(before.duplicate_progress, 0, 'Review duplicate progress before syncing');
  assert.equal(before.orphan_progress, 0, 'Review orphaned progress before syncing');
  await storage.seedBadgeCatalogIfEmpty();
  await storage.backfillBadgeProgressFromLegacy();
  await syncAllBadgeEvidence();
  const after = await summary();
  assert.equal(after.historical_awards, before.historical_awards);
  assert.equal(after.duplicate_progress, 0);
  assert.equal(after.orphan_progress, 0);
  assert.equal(after.missing_legacy_progress, 0);
  console.log('After:', JSON.stringify(after));
} finally {
  await pool.end();
}
