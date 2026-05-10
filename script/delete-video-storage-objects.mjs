import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Pool } = pg;

const confirm = process.argv.includes("--confirm");
const bucket = "Videos";

const requiredEnv = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

try {
  const { rows } = await pool.query(
    `
      select
        o.name as video_path,
        (o.metadata->>'size')::bigint as size_bytes,
        count(distinct s.id) as session_reference_count,
        count(distinct cs.id) as challenge_submission_reference_count
      from storage.objects o
      left join sessions s on s.video_url = o.name
      left join challenge_submissions cs on cs.video_url = o.name
      where o.bucket_id = $1
      group by o.name, o.metadata
      order by o.name;
    `,
    [bucket],
  );

  const referenced = rows.filter(
    (row) =>
      Number(row.session_reference_count) > 0 ||
      Number(row.challenge_submission_reference_count) > 0,
  );

  if (referenced.length) {
    console.error(
      `Refusing to delete: ${referenced.length} storage object(s) are still referenced by DB rows.`,
    );
    console.table(
      referenced.map((row) => ({
        video_path: row.video_path,
        session_reference_count: row.session_reference_count,
        challenge_submission_reference_count: row.challenge_submission_reference_count,
      })),
    );
    process.exit(1);
  }

  const paths = rows.map((row) => row.video_path);
  const totalBytes = rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  const totalMb = (totalBytes / 1024 / 1024).toFixed(2);

  console.log(`Found ${paths.length} unreferenced object(s) in ${bucket} (${totalMb} MB).`);

  if (!paths.length) {
    process.exit(0);
  }

  console.table(paths.map((path) => ({ video_path: path })));

  if (!confirm) {
    console.log("\nDry run only. Re-run with --confirm to delete these objects via the Supabase Storage API.");
    process.exit(0);
  }

  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { data, error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }

    deleted += data?.length ?? batch.length;
  }

  console.log(`Deleted ${deleted} object(s) from ${bucket}.`);
} finally {
  await pool.end();
}
