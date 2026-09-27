// All scores in evidence are 0–100. Catalog thresholds are conventionally 0–10.
export type BadgeEvidence = { eventScores?: Record<string, number>; skills?: string[]; stuckLanding?: boolean };
export type BadgeFact = { id: string; at: string; score: number; evidence?: BadgeEvidence | null };
export type PracticeFact = { at: string; kind: 'cue' | 'drill'; key: string };
export type WeekFact = { start: string; comp: boolean; rank: number; scores: number[]; challenges: number };
export type RuleBadge = { shortName: string | null; criteriaType: string; criteriaJson: unknown; levelMin?: number | null; levelMax?: number | null; isCompOnly?: boolean };
const DAY = 86400000;
const key = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
const points = (n: unknown) => { const v = Number(n); return Number.isFinite(v) ? (v <= 10 ? v * 10 : v) : Infinity; };
const day = (at: string) => at.slice(0, 10);
const avg2 = (scores: number[]) => scores.length < 2 ? null : [...scores].sort((a,b) => b-a).slice(0,2).reduce((a,b)=>a+b,0)/2;

export function badgeProgressFor(b: RuleBadge, facts: BadgeFact[], practice: PracticeFact[], weeks: WeekFact[], level: string): { value: number; target: number } | null {
  const numeric = /^Level\s+(\d+)$/i.exec(level.trim()) ?? /^(\d+)$/.exec(level.trim());
  if ((b.levelMin != null || b.levelMax != null) && (!numeric || Number(numeric[1]) < (b.levelMin ?? 0) || Number(numeric[1]) > (b.levelMax ?? Infinity))) return null;
  const c = (b.criteriaJson ?? {}) as Record<string, any>;
  const target = Math.max(1, Number(c.count) || 1);
  const rows = [...facts].filter(f => Number.isFinite(f.score)).sort((a,z)=>a.at.localeCompare(z.at));
  let value = 0;
  const windowCount = (dates: string[], days: number) => Math.max(0, ...dates.map(at => dates.filter(other => other <= at && Date.parse(other) > Date.parse(at)-days*DAY).length));
  const bestRun = (values: boolean[]) => { let run=0,best=0; for(const v of values){run=v?run+1:0;best=Math.max(best,run);}return best; };
  const eventScore = (f: BadgeFact): number | null => {
    if (c.skill && !f.evidence?.skills?.map(key).includes(key(c.skill))) return null;
    const score = c.event ? f.evidence?.eventScores?.[key(c.event)] : f.score;
    return typeof score === 'number' && Number.isFinite(score) ? score : null;
  };
  switch(b.criteriaType) {
    case 'upload_count': value = c.windowDays ? windowCount(rows.map(r=>r.at),Number(c.windowDays)) : rows.length; break;
    case 'score_threshold': value = rows.some(f => {const s=eventScore(f);return s!==null && s>=points(c.min);}) ? 1 : 0; break;
    case 'improvement': {
      if(c.metric==='avg_top2') {
        const values=weeks.map(w=>avg2(w.scores)).filter((v):v is number=>v!==null);
        value=values.some((v,i)=>i>0 && v-values[i-1]>=points(c.delta)-1e-8)?1:0;
      } else {
        const values=rows.map(eventScore).filter((v):v is number=>v!==null);
        value=values.some((v,i)=>i>0 && v-values[i-1]>=points(c.delta)-1e-8)?1:0;
      }
      break;
    }
    case 'cues_used': value=practice.filter(p=>p.kind==='cue' && (c.any || key(p.key)===key(c.cue))).length;break;
    case 'drill_count': case 'drills_logged': value=practice.filter(p=>p.kind==='drill' && (c.any || key(p.key)===key(c.drill ?? c.group))).length;break;
    case 'streak': {
      if(c.type==='upload_score') value=bestRun(rows.map(f=>f.score>=points(c.min ?? c.minScore ?? 0)));
      else if(c.type==='upload_days' || c.type==='cues') {
        const dates=Array.from(new Set(c.type==='cues' ? practice.filter(p=>p.kind==='cue' && key(p.key)===key(c.cue)).map(p=>day(p.at)) : rows.filter(f=>f.score>=points(c.minScore ?? 0)).map(f=>day(f.at)))).sort();
        let run=0;dates.forEach((d,i)=>{run=i>0 && Date.parse(d)-Date.parse(dates[i-1])===DAY?run+1:1;value=Math.max(value,run);});
      } else if(c.type==='stick') value=windowCount(rows.filter(f=>f.evidence?.stuckLanding===true).map(f=>f.at),Number(c.windowDays)||7);
      else return null;
      break;
    }
    case 'comp_week_rank': value=weeks.some(w=>w.comp && w.rank>0 && w.rank<=Number(c.top))?1:0;break;
    case 'comp_week': {
      if(c.type==='top2_min') value=weeks.some(w=>w.comp && w.scores.length>=2 && [...w.scores].sort((a,b)=>b-a)[1]>=points(c.min))?1:0;
      else if(c.type==='improvement') value=weeks.some((w,i)=>{const a=avg2(w.scores),prev=i?avg2(weeks[i-1].scores):null;return w.comp && a!==null && prev!==null && a-prev>=points(c.delta)-1e-8;})?1:0;
      else return null;
      break;
    }
    case 'competition': {
      if(b.shortName==='crimson_challenger') value=weeks.some(w=>w.challenges>=1)?1:0;
      else if(b.shortName==='crimson_consistency') value=weeks.some(w=>w.challenges>=2)?1:0;
      else if(b.shortName==='crimson_top_ten') value=weeks.some(w=>w.comp && w.rank>0 && w.rank<=10)?1:0;
      else if(b.shortName==='crimson_weekly_champion') value=weeks.some(w=>w.comp && w.rank===1)?1:0;
      else return null;
      break;
    }
    // The catalog must explicitly define which meaning of weekly_best is intended.
    case 'weekly_best':
      if(c.type==='rank') value=weeks.filter(w=>w.rank===1).length;
      else return null;
      break;
    default: return null;
  }
  return {value:Math.min(value,target),target};
}

export function parseBadgeEvidence(raw: unknown): BadgeEvidence | null {
  if(!raw || typeof raw!=='object') return null;
  const r=raw as Record<string,unknown>, scores:Record<string,number>={};
  if(r.eventScores && typeof r.eventScores==='object') for(const [k,v] of Object.entries(r.eventScores)) {
    if(['beam','floor','bars','vault','landing','shape'].includes(k) && typeof v==='number' && Number.isFinite(v) && v>=0 && v<=100) scores[k]=v;
  }
  return {eventScores:scores,skills:Array.isArray(r.skills)?r.skills.filter((s):s is string=>typeof s==='string').slice(0,10).map(key):[],stuckLanding:r.stuckLanding===true};
}
