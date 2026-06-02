import type { UserPlan } from '@/lib/types';

export function formatPlan(plan?: UserPlan) {
  if (!plan || plan === 'none') return 'Starter';
  if (plan === 'coach') return 'Coach';
  if (plan === 'competition') return 'Competition';
  return plan;
}

