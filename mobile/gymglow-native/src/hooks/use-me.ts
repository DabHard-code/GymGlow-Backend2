import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { UserMe } from '@/lib/types';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<UserMe>('/api/users/me'),
  });
}
