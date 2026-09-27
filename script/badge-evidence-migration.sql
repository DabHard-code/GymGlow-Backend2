BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS badge_evidence jsonb;
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id varchar NOT NULL REFERENCES public.sport_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cue','drill')),
  practice_key text NOT NULL,
  practiced_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(profile_id,kind,practice_key,practiced_on)
);
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
UPDATE public.analyses a SET is_competition_eligible=true
FROM public.sessions s WHERE s.id=a.session_id AND s.is_trial=false
AND EXISTS (SELECT 1 FROM public.competition_points p WHERE p.source_type='analysis' AND p.source_id=a.id AND p.reason='analysis_upload');
REVOKE ALL PRIVILEGES ON public.practice_logs FROM anon, authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS badge_progress_athlete_badge_unique ON public.badge_progress(athlete_id,badge_id);
UPDATE public.badges SET criteria_json='{"count":2,"type":"rank"}'::jsonb,
  description='Finish first in your sport and level in two completed weekly rankings (best two eligible uploads).'
WHERE short_name='legendary_control';
COMMIT;
