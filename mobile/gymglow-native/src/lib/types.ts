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

export type Season = {
  id: string;
  athleteId: string;
  name: string;
  year: number;
  sport: SportType;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  createdAt?: string | Date | null;
};

export type MeetScore = {
  id: string;
  meetId: string;
  category: string;
  score?: string | null;
  placement?: number | null;
  notes?: string | null;
  createdAt?: string | Date | null;
};

export type MeetWithScores = {
  id: string;
  seasonId: string;
  name: string;
  location?: string | null;
  meetDate: string | Date;
  notes?: string | null;
  createdAt?: string | Date | null;
  scores: MeetScore[];
};

export type BadgeTier = 'common' | 'rare' | 'epic' | 'legendary' | 'crimson';

export type BadgeCatalogItem = {
  id: string;
  sport: SportType;
  name: string;
  shortName?: string | null;
  description?: string | null;
  tier: BadgeTier;
  colorHex?: string | null;
  icon?: string | null;
  isCompOnly?: boolean;
  bodyFocus?: string | null;
};

export type BadgeProgressState = {
  earnedBadgeIds: string[];
  progress: {
    id: string;
    athleteId: string;
    badgeId: string;
    progressValue: number;
    progressTarget: number;
  }[];
};

export type EarnedBadge = {
  id: string;
  athleteId: string;
  analysisId: string;
  badgeType: string;
  awardedAt?: string | Date | null;
};

export type Session = {
  id: string;
  profileId: string;
  title?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status: 'uploading' | 'processing' | 'analyzing' | 'ready' | 'error' | 'failed';
  errorMessage?: string | null;
  createdAt?: string | null;
};

export type Analysis = {
  id: string;
  sessionId: string;
  overallScore: number;
  summary: string;
  technicalBreakdown?: string | null;
  strengths: string[];
  feedback: {
    id: string;
    title: string;
    description: string;
    improvement: string;
    severity: 'info' | 'warning' | 'critical';
    bodyPart?: string | null;
    phase?: string | null;
    drillRecommendation?: string | null;
    drillMatches?: { id: string; name: string }[];
  }[];
  safetyNotes?: string[] | null;
  progressionTips?: string[] | null;
  createdAt?: string | null;
};

export type Challenge = {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  sport: SportType;
  difficulty?: string | null;
  targetSkillId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

export type CompetitionStatus = {
  cycleStart?: string | Date;
  weekStart: string | Date;
  weekEnd: string | Date;
  weekInCycle: number;
  isCompWeek: boolean;
};

export type CompetitionResults =
  | {
      weekStart: string | Date;
      weekEnd: string | Date;
      cycleWeek: number;
      isCompWeek: false;
      message: string;
      coachRecap: string;
    }
  | {
      weekStart: string | Date;
      weekEnd: string | Date;
      cycleWeek: number;
      isCompWeek: true;
      totalPlayers: number;
      your: null | {
        rank: number | null;
        percentile: number | null;
        avgTop2: number;
        best: number;
        second: number;
        top2: { score: number; createdAt: string | Date }[];
      };
      top10: { rank: number; displayName: string; avgTop2: number; best: number; second: number }[];
      message: string;
      coachRecap: string;
    };

export type ChallengeSubmission = {
  id: string;
  challengeId: string;
  athleteId: string;
  profileId: string;
  skillId?: string | null;
  sessionId?: string | null;
  score?: number | null;
  feedback?: string | null;
  videoUrl?: string | null;
  status: 'pending' | 'analyzing' | 'scored' | 'ineligible' | 'error';
  submittedAt?: string | null;
};

export type WeeklyLeaderboard =
  | {
      locked: true;
      weekStart: string | Date;
      weekEnd: string | Date;
      totalWeeklyChallenges: number;
      preview: { rank: number; displayName: string }[];
    }
  | {
      locked?: false;
      weekStart: string | Date;
      weekEnd: string | Date;
      totalWeeklyChallenges: number;
      entries: {
        rank: number;
        points: number;
        challengesCompleted: number;
        aiBonus: number;
        displayName: string;
        isViewer: boolean;
      }[];
    };

export type UserMe = {
  id: string;
  username: string;
  displayName?: string | null;
  plan: UserPlan;
  trialCredits: number;
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
};
