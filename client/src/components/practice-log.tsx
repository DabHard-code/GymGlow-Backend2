import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
type Item={kind:string;key:string;label:string};
export function PracticeLog({profileId}:{profileId:string}) {
  const client=useQueryClient();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const query=useQuery({queryKey:['practice',profileId],queryFn:async()=>{
    const response=await apiRequest('GET',`/api/profiles/${profileId}/practice`);
    return response.json() as Promise<{options:Item[];logged:Item[]}>;
  }});
  async function log(item:Item) {
    setBusy(true);setMessage('');
    try {
      await apiRequest('POST',`/api/profiles/${profileId}/practice`,{kind:item.kind,key:item.key});
      await Promise.all([query.refetch(),client.invalidateQueries({queryKey:['/api/athletes']})]);
      setMessage('Practice saved. Badge progress updated.');
    } catch(error) {setMessage(error instanceof Error?error.message:'Unable to save practice.');}
    finally {setBusy(false);}
  }
  return <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">Log today’s practice</h2>
    <p className="text-sm text-muted-foreground">Choose only the cues or drills you practiced today. Each counts once per day (UTC).</p>
    {query.isError&&<p>Practice logging is unavailable. Try again later.</p>}
    <div className="flex flex-wrap gap-2">{query.data?.options.map(item=>{
      const saved=query.data.logged.some(p=>p.kind===item.kind&&p.key===item.key);
      return <Button key={`${item.kind}:${item.key}`} variant="outline" disabled={busy||saved} onClick={()=>log(item)}>{saved?'✓ ':''}{item.kind==='cue'?'Cue: ':'Drill: '}{item.label}</Button>;
    })}</div><p role="status" className="text-sm">{message}</p></section>;
}
