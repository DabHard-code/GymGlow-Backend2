import { pool } from './db';
import { badgeProgressFor, type BadgeFact, type WeekFact } from './badge-rules';

const WEEK=7*86400000;
export function weekStart(at: string | Date) {const d=new Date(at);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-d.getUTCDay());return d.toISOString();}
export function isCompetitionWeek(at:string) {const start=weekStart(process.env.GYMGLOW_COMP_CYCLE_START || '2026-05-10');const diff=Math.floor((Date.parse(at)-Date.parse(start))/WEEK);return diff>=0 && [3,6].includes(diff%6+1);}

export async function syncProfileBadges(profileId:string, now=new Date()) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows:[profile]}=await client.query('SELECT * FROM sport_profiles WHERE id=$1',[profileId]);
    if(!profile){await client.query('ROLLBACK');return;}
    const {rows:catalog}=await client.query('SELECT * FROM badges WHERE sport=$1',[profile.sport]);
    const {rows:raw}=await client.query(`SELECT a.id,a.created_at,a.overall_score,a.badge_evidence,a.is_competition_eligible,p.athlete_id,p.id AS profile_id
      FROM analyses a JOIN sessions s ON s.id=a.session_id JOIN sport_profiles p ON p.id=s.profile_id
      WHERE p.sport=$1 AND p.level=$2 AND s.is_trial=false AND s.status='ready' AND a.created_at<=$3 ORDER BY a.created_at,a.id`,[profile.sport,profile.level,now]);
    const own=raw.filter(r=>r.profile_id===profileId);
    const facts:BadgeFact[]=own.map(r=>({id:r.id,at:new Date(r.created_at).toISOString(),score:r.overall_score,evidence:r.badge_evidence}));
    const {rows:practice}=await client.query('SELECT created_at AS at,kind,practice_key AS key FROM practice_logs WHERE profile_id=$1 AND created_at<=$2',[profileId,now]);
    const {rows:submissions}=await client.query("SELECT cs.challenge_id,cs.submitted_at FROM challenge_submissions cs WHERE cs.profile_id=$1 AND cs.status='scored' AND cs.submitted_at<=$2",[profileId,now]);
    const currentWeek=weekStart(now);
    const starts=Array.from(new Set([...own.map(r=>weekStart(r.created_at)),...submissions.map(r=>weekStart(r.submitted_at))])).sort();
    const weeks:WeekFact[]=starts.map(start=>{
      const inWeek=raw.filter(r=>r.is_competition_eligible && weekStart(r.created_at)===start);
      const byAthlete=new Map<string,number[]>();
      for(const r of inWeek) byAthlete.set(r.athlete_id,[...(byAthlete.get(r.athlete_id)||[]),r.overall_score]);
      const ranked=Array.from(byAthlete).map(([id,scores])=>({id,scores:scores.sort((a,b)=>b-a).slice(0,2)})).filter(r=>r.scores.length===2)
        .sort((a,b)=>(b.scores[0]+b.scores[1])-(a.scores[0]+a.scores[1]) || b.scores[0]-a.scores[0] || a.id.localeCompare(b.id));
      const index=ranked.findIndex(r=>r.id===profile.athlete_id);
      // Competition placements are final only after the week closes. Ties share rank.
      const rank=index<0 || start>=currentWeek?0:ranked.findIndex(r=>r.scores[0]+r.scores[1]===ranked[index].scores[0]+ranked[index].scores[1] && r.scores[0]===ranked[index].scores[0])+1;
      return {start,comp:isCompetitionWeek(start),rank,scores:own.filter(r=>r.is_competition_eligible && weekStart(r.created_at)===start).map(r=>r.overall_score),challenges:new Set(submissions.filter(r=>weekStart(r.submitted_at)===start).map(r=>r.challenge_id)).size};
    });
    for(const row of catalog) {
      const badge={shortName:row.short_name,criteriaType:row.criteria_type,criteriaJson:row.criteria_json,levelMin:row.level_min,levelMax:row.level_max,isCompOnly:row.is_comp_only};
      const result=badgeProgressFor(badge,facts,practice.map(p=>({...p,at:new Date(p.at).toISOString()})),weeks,profile.level);
      if(!result || result.value===0)continue;
      await client.query(`INSERT INTO badge_progress(athlete_id,badge_id,progress_value,progress_target,context_json)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(athlete_id,badge_id) DO UPDATE SET
        progress_value=CASE WHEN badge_progress.progress_value>=badge_progress.progress_target THEN GREATEST(badge_progress.progress_value,EXCLUDED.progress_target) ELSE GREATEST(badge_progress.progress_value,EXCLUDED.progress_value) END,
        progress_target=EXCLUDED.progress_target, updated_at=now(),context_json=EXCLUDED.context_json`,
        [profile.athlete_id,row.id,result.value,result.target,JSON.stringify({source:'evidence_rules',profileId})]);
    }
    await client.query('COMMIT');
  } catch(error) {await client.query('ROLLBACK');throw error;} finally {client.release();}
}

export async function syncAllBadgeEvidence() {
  const {rows}=await pool.query('SELECT id FROM sport_profiles');
  for(const profile of rows)await syncProfileBadges(profile.id);
}
