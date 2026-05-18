export type UserPlan = 'none' | 'coach' | 'competition';

export type Athlete = {
  id: string;
  userId: string;
  name: string;
  publicDisplayName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
};

export type SportType = 'gymnastics' | 'dance' | 'cheer' | 'lifting' | 'yoga';

export type SportProfile = {
  id: string;
  athleteId: string;
  sport: SportType;
  level: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type Session = {
  id: string;
  profileId: string;
  title?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status: 'uploading' | 'processing' | 'analyzing' | 'ready' | 'error';
  errorMessage?: string | null;
  createdAt?: string | null;
};

export type Analysis = {
  id: string;
  sessionId: string;
  overallScore: number;
  summary: string;
  strengths: string[];
  feedback: Array<{
    id: string;
    title: string;
    description: string;
    improvement: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  createdAt?: string | null;
};

export type UserMe = {
  id: string;
  username: string;
  plan: UserPlan;
  trialCredits: number;
  subscriptionStatus?: string;
};
