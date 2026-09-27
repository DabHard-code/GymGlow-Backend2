import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { apiFetch, apiPost } from '@/lib/api';
import { GlassCard } from './glass-card';
import { colors } from '@/theme/colors';

type Item = {kind:string;key:string;label:string};
export function PracticeLog({profileId}:{profileId:string}) {
  const client=useQueryClient();
  const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  const query=useQuery({queryKey:['practice',profileId],queryFn:()=>apiFetch<{options:Item[];logged:Item[]}>(`/api/profiles/${profileId}/practice`)});
  async function log(item:Item) {
    setBusy(true);setMessage('');
    try {
      await apiPost(`/api/profiles/${profileId}/practice`,{kind:item.kind,key:item.key});
      await Promise.all([query.refetch(),client.invalidateQueries({queryKey:['badge-progress']})]);
      setMessage('Practice saved. Badge progress updated.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Unable to save practice.');}
    finally {setBusy(false);}
  }
  return <GlassCard><Text style={{color:colors.text,fontSize:18,fontWeight:'700'}}>Log today’s practice</Text>
    <Text style={{color:colors.text,marginVertical:10}}>Tap only the cues or drills you practiced today. Each counts once per day (UTC).</Text>
    {query.isError ? <Text style={{color:colors.text}}>Practice logging is unavailable. Try again later.</Text> : null}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{query.data?.options.map(item=>{
      const saved=query.data.logged.some(p=>p.kind===item.kind&&p.key===item.key);
      return <Pressable key={`${item.kind}:${item.key}`} accessibilityRole="button" disabled={busy||saved} onPress={()=>log(item)} style={{padding:12,borderRadius:10,backgroundColor:colors.primary,opacity:saved?0.5:1}}>
        <Text style={{color:colors.text}}>{saved?'✓ ':''}{item.kind==='cue'?'Cue: ':'Drill: '}{item.label}</Text>
      </Pressable>;
    })}</View><Text accessibilityLiveRegion="polite" style={{color:colors.text,marginTop:8}}>{message}</Text>
  </GlassCard>;
}
