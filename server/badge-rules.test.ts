import {test} from 'node:test';
import assert from 'node:assert/strict';
import {badgeProgressFor,parseBadgeEvidence,type BadgeFact,type WeekFact} from './badge-rules';
const fact=(day:number,score=90):BadgeFact=>({id:String(day),at:`2026-09-${String(day).padStart(2,'0')}T12:00:00.000Z`,score});
const badge=(criteriaType:string,criteriaJson:unknown)=>({shortName:'test',criteriaType,criteriaJson,levelMin:1,levelMax:4});
const week=(rank:number):WeekFact=>({start:'2026-09-06',comp:true,rank,scores:[95,94],challenges:0});
test('requires event evidence and observed skill rather than overall score',()=>{
  const b=badge('score_threshold',{event:'floor',skill:'cartwheel',min:8.8});
  assert.equal(badgeProgressFor(b,[fact(1,99)],[],[],'Level 2')?.value,0);
  assert.equal(badgeProgressFor(b,[{...fact(1),evidence:{eventScores:{floor:90},skills:['cartwheel']}}],[],[],'Level 2')?.value,1);
});
test('score streak requires consecutive qualifying uploads',()=>{
  assert.equal(badgeProgressFor(badge('streak',{type:'upload_score',min:8.8,count:3}),[fact(1),fact(2,60),fact(3),fact(4)],[],[],'Level 2')?.value,2);
});
test('upload days deduplicates dates and breaks at missed days',()=>{
  assert.equal(badgeProgressFor(badge('streak',{type:'upload_days',count:7}),[fact(1),fact(1),fact(2),fact(4)],[],[],'Level 2')?.value,2);
});
test('historical rolling windows count earned milestones',()=>{
  assert.equal(badgeProgressFor(badge('upload_count',{count:3,windowDays:7}),[fact(1),fact(2),fact(3),fact(25)],[],[],'Level 2')?.value,3);
});
test('level-limited badges reject wrong level and Xcel',()=>{
  for(const level of ['Level 5','Xcel Gold'])assert.equal(badgeProgressFor(badge('upload_count',{count:1}),[fact(1)],[],[],level),null);
});
test('legendary control requires two finalized first-place weeks',()=>{
  const b=badge('weekly_best',{type:'rank',count:2});
  assert.equal(badgeProgressFor(b,[],[],[week(1),week(0),week(2)],'Level 2')?.value,1);
  assert.equal(badgeProgressFor(b,[],[],[week(1),week(1)],'Level 2')?.value,2);
});
test('practice badges match kind and normalize cue',()=>{
  assert.equal(badgeProgressFor(badge('cues_used',{cue:'Eyes up',count:5}),[],[{at:fact(1).at,kind:'cue',key:'eyes_up'},{at:fact(2).at,kind:'drill',key:'eyes_up'}],[],'Level 2')?.value,1);
});
test('competition placement must be finalized and on a comp week',()=>{
  assert.equal(badgeProgressFor(badge('comp_week_rank',{top:10}),[],[],[week(0),{...week(1),comp:false}],'Level 2')?.value,0);
});
test('evidence parser drops unsupported and out-of-range scores',()=>{
  assert.deepEqual(parseBadgeEvidence({eventScores:{floor:92,bars:101,unknown:99},skills:['Cartwheel',4],stuckLanding:'true'}),{eventScores:{floor:92},skills:['cartwheel'],stuckLanding:false});
});
