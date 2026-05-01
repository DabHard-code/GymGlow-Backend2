// server/storage.ts
import {
  users,
  athletes,
  sportProfiles,
  sessions,
  analyses,
  earnedBadges,
  drills,
  challenges,
  challengeSubmissions,
  skills,
  skillProgress,
  seasons,
  meets,
  meetScores,
  drillSkills,
  competitionPoints,
  type User,
  type InsertUser,
  type Athlete,
  type InsertAthlete,
  type SportProfile,
  type InsertSportProfile,
  type Session,
  type InsertSession,
  type Analysis,
  type InsertAnalysis,
  type EarnedBadge,
  type InsertEarnedBadge,
  type Drill,
  type InsertDrill,
  type Challenge,
  type InsertChallenge,
  type ChallengeSubmission,
  type InsertChallengeSubmission,
  type Skill,
  type InsertSkill,
  type SkillProgress,
  type InsertSkillProgress,
  type Season,
  type InsertSeason,
  type Meet,
  type InsertMeet,
  type MeetScore,
  type InsertMeetScore,
  type DrillSkillLink,
  type CompetitionPoint,
  type InsertCompetitionPoint,
  type SportType,
  type DifficultyLevel,
} from "@shared/schema";

import { db } from "./db";
import { eq, desc, inArray, and, gte, lte, sql, gt } from "drizzle-orm";

export interface IStorage {
  // ===== USER METHODS =====
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  /**
   * Ensures a Supabase-authenticated user exists in local DB.
   * Creates the row if missing.
   */
  ensureUserFromAuth(authUserId: string): Promise<User>;

  updateUserPlan(userId: string, plan: "coach" | "competition"): Promise<User>;

  /**
   * Stripe webhook updates (customer/subscription lifecycle).
   * Keeps billing state in the users table for MVP simplicity.
   */
  updateUserBilling(
    userId: string,
    updates: {
      plan?: "none" | "coach" | "competition";
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      subscriptionStatus?: string | null;
      currentPeriodEnd?: Date | null;
    },
  ): Promise<User>;

  consumeTrialCredit(userId: string): Promise<User>;

  // ===== ATHLETE METHODS =====
  getAthletesByUser(userId: string): Promise<Athlete[]>;
  getAthlete(id: string): Promise<Athlete | undefined>;
  createAthlete(athlete: InsertAthlete): Promise<Athlete>;
  updateAthlete(
    id: string,
    updates: Partial<InsertAthlete>,
  ): Promise<Athlete | undefined>;
  deleteAthlete(id: string): Promise<boolean>;

  // ===== SPORT PROFILE METHODS =====
  getProfilesByAthlete(athleteId: string): Promise<SportProfile[]>;
  getProfile(id: string): Promise<SportProfile | undefined>;
  createProfile(profile: InsertSportProfile): Promise<SportProfile>;
  updateProfile(
    id: string,
    updates: Partial<InsertSportProfile>,
  ): Promise<SportProfile | undefined>;
  deleteProfile(id: string): Promise<boolean>;

  // ===== SESSION / ANALYSIS METHODS =====
  getSessionsByProfile(profileId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(
    id: string,
    updates: Partial<Session>,
  ): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  getAnalysesBySession(sessionId: string): Promise<Analysis[]>;
  getRecentAnalysesByProfile(profileId: string, limit?: number): Promise<Analysis[]>;
  getAnalysis(id: string): Promise<Analysis | undefined>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

  // ===== BADGE METHODS =====
  getBadgesByAthlete(athleteId: string): Promise<EarnedBadge[]>;
  getBadgesByAnalysis(analysisId: string): Promise<EarnedBadge[]>;
  awardBadge(badge: InsertEarnedBadge): Promise<EarnedBadge>;
  awardBadges(badges: InsertEarnedBadge[]): Promise<EarnedBadge[]>;

  // ===== DRILL METHODS =====
  getAllDrills(): Promise<Drill[]>;
  getDrillsBySport(sport: SportType): Promise<Drill[]>;
  getDrillsByDifficulty(difficulty: DifficultyLevel): Promise<Drill[]>;
  getDrillsByIds(ids: string[]): Promise<Drill[]>;
  getDrill(id: string): Promise<Drill | undefined>;
  createDrill(drill: InsertDrill): Promise<Drill>;
  seedDrillsIfEmpty(): Promise<void>;


  // ===== DRILL ↔ SKILL LINK METHODS =====
  getDrillSkillLinksBySkill(skillId: string): Promise<DrillSkillLink[]>;
  getDrillSkillLinksByDrill(drillId: string): Promise<DrillSkillLink[]>;
  getDrillsForSkill(skillId: string): Promise<Drill[]>;




  // ===== CHALLENGE METHODS =====
  getActiveChallenges(): Promise<Challenge[]>;
  getAllChallenges(): Promise<Challenge[]>;
  getChallengesBySport(sport: SportType): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;

  getChallengeSubmissions(challengeId: string): Promise<ChallengeSubmission[]>;
  getSubmissionsByAthlete(athleteId: string): Promise<ChallengeSubmission[]>;
  getChallengeSubmission(id: string): Promise<ChallengeSubmission | undefined>;
  createChallengeSubmission(submission: InsertChallengeSubmission): Promise<ChallengeSubmission>;
  updateChallengeSubmission(
    id: string,
    updates: Partial<ChallengeSubmission>,
  ): Promise<ChallengeSubmission | undefined>;

  // ===== COMPETITION POINTS METHODS =====
  awardCompetitionPoints(point: InsertCompetitionPoint): Promise<CompetitionPoint | undefined>;
  getPointsForProfile(profileId: string, weekStart?: Date, weekEnd?: Date): Promise<CompetitionPoint[]>;
  getPointsHub(profileId: string, athleteId: string, weekStart: Date, weekEnd: Date): Promise<{
    totalPoints: number;
    breakdown: {
      challengesSubmitted: number;
      basePoints: number;
      allChallengesBonus: number;
      aiBonus: number;
    };
    activity: Array<{
      challengeId: string;
      submittedAt: Date;
      status: string;
      score: number | null;
      basePoints: number;
      aiPoints: number;
      totalFromThisChallenge: number;
    }>;
  }>;

  getWeeklyLeaderboard(profileId: string, weekStart: Date, weekEnd: Date): Promise<{
    athleteId: string;
    points: number;
    challengesCompleted: number;
    aiBonus: number;
  }[]>;
  getChallengeLeaderboard(
    challengeId: string,
  ): Promise<{ submission: ChallengeSubmission; athlete: Athlete }[]>;
  seedChallengesIfEmpty(): Promise<void>;

  // ===== SKILL LIBRARY METHODS =====
  getAllSkills(): Promise<Skill[]>;
  getSkillsBySport(sport: SportType): Promise<Skill[]>;
  getSkillsByLevel(level: number): Promise<Skill[]>;
  getSkillsBySportAndLevel(sport: SportType, level: number): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | undefined>;
  createSkill(skill: InsertSkill): Promise<Skill>;

  // ===== SKILL PROGRESS METHODS =====
  getSkillProgressByAthlete(athleteId: string): Promise<SkillProgress[]>;
  getSkillProgressForSkill(
    athleteId: string,
    skillId: string,
  ): Promise<SkillProgress | undefined>;
  upsertSkillProgress(progress: InsertSkillProgress): Promise<SkillProgress>;
  seedSkillsIfEmpty(): Promise<void>;

  // ===== SEASON / MEET / SCORES METHODS =====
  getSeasonsByAthlete(athleteId: string): Promise<Season[]>;
  getSeasonsByAthleteAndSport(athleteId: string, sport: SportType): Promise<Season[]>;
  getSeason(id: string): Promise<Season | undefined>;
  createSeason(season: InsertSeason): Promise<Season>;
  updateSeason(id: string, updates: Partial<InsertSeason>): Promise<Season | undefined>;
  deleteSeason(id: string): Promise<boolean>;

  getMeetsBySeason(seasonId: string): Promise<Meet[]>;
  getMeet(id: string): Promise<Meet | undefined>;
  createMeet(meet: InsertMeet): Promise<Meet>;
  updateMeet(id: string, updates: Partial<InsertMeet>): Promise<Meet | undefined>;
  deleteMeet(id: string): Promise<boolean>;

  getScoresByMeet(meetId: string): Promise<MeetScore[]>;
  getMeetScore(id: string): Promise<MeetScore | undefined>;
  createMeetScore(score: InsertMeetScore): Promise<MeetScore>;
  updateMeetScore(id: string, updates: Partial<MeetScore>): Promise<MeetScore | undefined>;
  deleteMeetScore(id: string): Promise<boolean>;
  createMeetScores(scores: InsertMeetScore[]): Promise<MeetScore[]>;

  // ===== DEMO SEEDING =====
  seedDemoDataIfEmpty(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ===== USER METHODS =====
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async ensureUserFromAuth(authUserId: string): Promise<User> {
    const existing = await this.getUser(authUserId);
    if (existing) return existing;

    const [user] = await db
      .insert(users)
      .values({
        id: authUserId,
        username: authUserId,
        password: "",
      } as InsertUser)
      .returning();

    return user;
  }

  
  async updateUserPlan(userId: string, plan: "coach" | "competition"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ plan } as any)
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserBilling(
    userId: string,
    updates: {
      plan?: "none" | "coach" | "competition";
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      subscriptionStatus?: string | null;
      currentPeriodEnd?: Date | null;
    }
  ): Promise<User> {
    const setObj: any = {};
    if (typeof updates.plan !== "undefined") setObj.plan = updates.plan;
    if (typeof updates.stripeCustomerId !== "undefined") setObj.stripeCustomerId = updates.stripeCustomerId;
    if (typeof updates.stripeSubscriptionId !== "undefined") setObj.stripeSubscriptionId = updates.stripeSubscriptionId;
    if (typeof updates.subscriptionStatus !== "undefined") setObj.subscriptionStatus = updates.subscriptionStatus;
    if (typeof updates.currentPeriodEnd !== "undefined") setObj.currentPeriodEnd = updates.currentPeriodEnd;

    const [user] = await db
      .update(users)
      .set(setObj)
      .where(eq(users.id, userId))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }
  async consumeTrialCredit(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ trialCredits: sql`${users.trialCredits} - 1` })
      .where(and(eq(users.id, userId), gt(users.trialCredits, 0)))
      .returning();

    // If no row updated (already 0), just return current
    return user ?? (await this.getUser(userId))!;
  }



// ===== ATHLETE METHODS =====
  async getAthletesByUser(userId: string): Promise<Athlete[]> {
    return db
      .select()
      .from(athletes)
      .where(eq(athletes.userId, userId))
      .orderBy(athletes.createdAt);
  }

  async getAthlete(id: string): Promise<Athlete | undefined> {
    const [athlete] = await db.select().from(athletes).where(eq(athletes.id, id));
    return athlete || undefined;
  }

  async createAthlete(insertAthlete: InsertAthlete): Promise<Athlete> {
    const [athlete] = await db.insert(athletes).values(insertAthlete).returning();
    return athlete;
  }

  async updateAthlete(
    id: string,
    updates: Partial<InsertAthlete>,
  ): Promise<Athlete | undefined> {
    const [athlete] = await db
      .update(athletes)
      .set(updates)
      .where(eq(athletes.id, id))
      .returning();
    return athlete || undefined;
  }

  async deleteAthlete(id: string): Promise<boolean> {
    const profiles = await this.getProfilesByAthlete(id);
    for (const profile of profiles) {
      await this.deleteProfile(profile.id);
    }
    const deleted = await db.delete(athletes).where(eq(athletes.id, id)).returning();
    return deleted.length > 0;
  }

  // ===== SPORT PROFILE METHODS =====
  async getProfilesByAthlete(athleteId: string): Promise<SportProfile[]> {
    return db
      .select()
      .from(sportProfiles)
      .where(eq(sportProfiles.athleteId, athleteId))
      .orderBy(sportProfiles.createdAt);
  }

  // ✅ FIXED: matches interface and avoids null
  async getProfile(id: string): Promise<SportProfile | undefined> {
    const [profile] = await db.select().from(sportProfiles).where(eq(sportProfiles.id, id));
    return profile || undefined;
  }

  async createProfile(insertProfile: InsertSportProfile): Promise<SportProfile> {
    const [profile] = await db.insert(sportProfiles).values(insertProfile as any).returning();
    return profile;
  }

  async updateProfile(
    id: string,
    updates: Partial<InsertSportProfile>,
  ): Promise<SportProfile | undefined> {
    const [profile] = await db
      .update(sportProfiles)
      .set(updates as any)
      .where(eq(sportProfiles.id, id))
      .returning();
    return profile || undefined;
  }

  async deleteProfile(id: string): Promise<boolean> {
    const profileSessions = await this.getSessionsByProfile(id);
    for (const session of profileSessions) {
      await db.delete(analyses).where(eq(analyses.sessionId, session.id));
    }
    await db.delete(sessions).where(eq(sessions.profileId, id));
    const deleted = await db.delete(sportProfiles).where(eq(sportProfiles.id, id)).returning();
    return deleted.length > 0;
  }

  // ===== SESSION / ANALYSIS METHODS =====
  async getSessionsByProfile(profileId: string): Promise<Session[]> {
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.profileId, profileId))
      .orderBy(desc(sessions.createdAt));
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession as any).returning();
    return session;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const deleted = await db.delete(sessions).where(eq(sessions.id, id)).returning();
    return deleted.length > 0;
  }

  async getAnalysesBySession(sessionId: string): Promise<Analysis[]> {
    return db
      .select()
      .from(analyses)
      .where(eq(analyses.sessionId, sessionId))
      .orderBy(desc(analyses.createdAt));
  }

  async getRecentAnalysesByProfile(profileId: string, limit: number = 5): Promise<Analysis[]> {
    const profileSessions = await this.getSessionsByProfile(profileId);
    if (profileSessions.length === 0) return [];

    const sessionIds = profileSessions.map((s) => s.id);
    return db
      .select()
      .from(analyses)
      .where(inArray(analyses.sessionId, sessionIds))
      .orderBy(desc(analyses.createdAt))
      .limit(limit);
  }

  async getAnalysis(id: string): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(insertAnalysis as any).returning();
    return analysis;
  }

  // ===== BADGE METHODS =====
  async getBadgesByAthlete(athleteId: string): Promise<EarnedBadge[]> {
    return db
      .select()
      .from(earnedBadges)
      .where(eq(earnedBadges.athleteId, athleteId))
      .orderBy(desc(earnedBadges.awardedAt));
  }

  async getBadgesByAnalysis(analysisId: string): Promise<EarnedBadge[]> {
    return db.select().from(earnedBadges).where(eq(earnedBadges.analysisId, analysisId));
  }

  async awardBadge(badge: InsertEarnedBadge): Promise<EarnedBadge> {
    const [earned] = await db.insert(earnedBadges).values(badge as any).returning();
    return earned;
  }

  async awardBadges(badges: InsertEarnedBadge[]): Promise<EarnedBadge[]> {
    if (badges.length === 0) return [];
    const result = await db.insert(earnedBadges).values(badges as any).returning();
    return result;
  }

  // ===== DRILL METHODS =====
  async getAllDrills(): Promise<Drill[]> {
    return db.select().from(drills).orderBy(drills.sport, drills.difficulty);
  }

  async getDrillsBySport(sport: SportType): Promise<Drill[]> {
    return db.select().from(drills).where(eq(drills.sport, sport)).orderBy(drills.difficulty);
  }

  async getDrillsByDifficulty(difficulty: DifficultyLevel): Promise<Drill[]> {
    return db
      .select()
      .from(drills)
      .where(eq(drills.difficulty, difficulty))
      .orderBy(drills.sport);
  }

  async getDrillsByIds(ids: string[]): Promise<Drill[]> {
    const clean = (ids || []).map((s) => String(s).trim()).filter(Boolean);
    if (!clean.length) return [];
    // Use IN() for efficiency, but keep order predictable by name.
    return db
      .select()
      .from(drills)
      .where(inArray(drills.id, clean))
      .orderBy(drills.sport, drills.difficulty, drills.name);
  }

  async getDrill(id: string): Promise<Drill | undefined> {
    const [drill] = await db.select().from(drills).where(eq(drills.id, id));
    return drill || undefined;
  }

  async createDrill(insertDrill: InsertDrill): Promise<Drill> {
    const [drill] = await db.insert(drills).values(insertDrill as any).returning();
    return drill;
  }

  // ✅ FIXED: never calls values([]) again
  async seedDrillsIfEmpty(): Promise<void> {
    const existingDrills = await db.select().from(drills).limit(1);
    if (existingDrills.length > 0) {
      console.log("Drills already exist, skipping seed");
      return;
    }

    console.log("Seeding drill library...");

    const drillData = [
      {
        id: "drill_wall_handstand_holds",
        name: "Wall Handstand Holds",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Build straight-body shape and confidence upside down using a wall.",
        howToPerform:
          "Kick up to a handstand with stomach or back to the wall. Squeeze legs together, point toes, and push tall through shoulders. Keep ribs in.",
        repsSets: "5–8 holds x 10–20 seconds",
        purpose: "Handstand line, shoulder strength, body tension",
        category: "Basics",
      },
      {
        id: "drill_line_drills",
        name: "Line Drills (Beam Line)",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Teach beam foot placement and posture on a line or low beam.",
        howToPerform:
          "Walk heel-to-toe on a line. Pause in relevé, arms in high V. Add chassé and pivot turn when solid.",
        repsSets: "3–5 passes of 8–12 steps",
        purpose: "Balance, posture, precision",
        category: "Beam",
      },
      {
        id: "drill_bridge_rocks",
        name: "Bridge Rocks",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Strengthen shoulder opening and prepare for walkovers.",
        howToPerform:
          "Start in a bridge. Rock weight gently over hands, then back toward feet while keeping arms straight and head neutral.",
        repsSets: "3 sets x 10–15 rocks",
        purpose: "Shoulder mobility, bridge endurance",
        category: "Basics",
      },
      {
        id: "drill_handstand_shrugs",
        name: "Handstand Shoulder Shrugs",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Improve shoulder elevation and stability for strong handstands and walkovers.",
        howToPerform:
          "In a wall handstand, keep elbows locked and shrug shoulders up/down slightly without bending arms or arching.",
        repsSets: "3 sets x 8–12 shrugs",
        purpose: "Shoulder control, stability",
        category: "Basics",
      },
      {
        id: "drill_cartwheel_panel_mats",
        name: "Cartwheel Over Panel Mats",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Make cartwheels straighter and more powerful with a gentle obstacle.",
        howToPerform:
          "Set a panel mat lengthwise. Cartwheel over it, aiming for straight legs, tight core, and landing on the line.",
        repsSets: "8–12 cartwheels",
        purpose: "Leg straightness, hand placement, momentum",
        category: "Floor",
      },
      {
        id: "drill_roundoff_rebound_stick",
        name: "Round-off Rebound + Stick",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Teach a snappy round-off with rebound and controlled landing.",
        howToPerform:
          "Round-off to two feet together, immediate rebound (jump) with tight hollow, then stick the landing with arms up.",
        repsSets: "6–10 reps",
        purpose: "Power transfer, landing control",
        category: "Floor",
      },
      {
        id: "drill_kickover_wedge",
        name: "Kickover on Wedge",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Progress bridge kickovers with extra help from an incline.",
        howToPerform:
          "Place hands on the floor at the bottom of the wedge and feet higher up. Kick one leg over, push tall through shoulders.",
        repsSets: "5–8 each leg",
        purpose: "Kickover pathway, confidence",
        category: "Basics",
      },
      {
        id: "drill_back_walkover_spotted",
        name: "Back Walkover Progression (Spotted)",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Progress back walkover shape and timing with coach/parent spotting.",
        howToPerform:
          "Start in lunge. Reach back to bridge with straight arms, kick lead leg, then follow through to lunge. Spot at low back/hips.",
        repsSets: "5–8 reps",
        purpose: "Walkover timing, shoulder push",
        category: "Floor",
      },
      {
        id: "drill_cast_shape_drill",
        name: "Cast Shape Drill",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Improve cast body tension and shoulder angle on bars.",
        howToPerform:
          "In front support, lean shoulders forward, push down on bar, and lift hips slightly to a tight hollow shape. Focus on straight arms.",
        repsSets: "3 sets x 6–10 casts",
        purpose: "Cast technique, core tension",
        category: "Bars",
      },
      {
        id: "drill_back_hip_circle_drill",
        name: "Back Hip Circle: Tummy to Bar",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Build the correct close-to-the-bar pathway for back hip circles.",
        howToPerform:
          "From front support, lean forward, keep hips close to bar, pike slightly, and circle backward keeping belly close to bar.",
        repsSets: "6–10 reps",
        purpose: "Bar path, timing, strength",
        category: "Bars",
      },
      {
        id: "drill_beam_cartwheel_mats",
        name: "Beam Cartwheel with Side Mats",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Reduce fear and improve alignment for cartwheels on beam.",
        howToPerform:
          "Set a low beam with panel mats on both sides. Cartwheel with hands on the beam, eyes on end, land on the line.",
        repsSets: "5–10 reps",
        purpose: "Confidence, straight cartwheel on beam",
        category: "Beam",
      },
      {
        id: "drill_vault_hurdle_to_board",
        name: "Hurdle to Board Drill",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Clean up vault run rhythm and hurdle timing.",
        howToPerform:
          "Mark a hurdle spot. Run, hurdle into a tight straight jump onto the board, arms up, then step down safely.",
        repsSets: "8–12 reps",
        purpose: "Vault rhythm, board contact",
        category: "Vault",
      },
    
      {
        id: "drill_hollow_body_hold",
        name: "Hollow Body Hold",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Build core tension for strong shapes on all events.",
        howToPerform: "Lie on back, lift shoulders and legs, lower back pressed into floor, arms by ears.",
        repsSets: "4 x 15–25 sec",
        purpose: "Core tension, body shape",
        category: "Basics",
      },
      {
        id: "drill_arch_body_hold",
        name: "Arch Body Hold (Superman)",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Strengthen posterior chain for tumbling and swings.",
        howToPerform: "Lie on stomach, lift chest/arms/legs slightly, squeeze glutes, keep neck neutral.",
        repsSets: "4 x 15–25 sec",
        purpose: "Back strength, body shape",
        category: "Basics",
      },
      {
        id: "drill_tight_swing_shapes",
        name: "Swing Shapes on Bar",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Teach hollow-to-arch timing for bar swings.",
        howToPerform: "On a low bar with spot or strap bar, practice small swings: hollow on the way forward, arch on the way back.",
        repsSets: "3 x 6–10 swings",
        purpose: "Swing timing, shapes",
        category: "Bars",
      },
      {
        id: "drill_cast_to_hollow",
        name: "Cast to Hollow (Floor)",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Improve cast shape and quick hollow.",
        howToPerform: "From front support on a panel mat, cast hips off, snap to hollow body on floor.",
        repsSets: "3 x 6–10",
        purpose: "Cast mechanics, core",
        category: "Bars",
      },
      {
        id: "drill_kip_glide_swings",
        name: "Glide Swings (Kip Prep)",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Build glide consistency for kips.",
        howToPerform: "From low bar, jump to hang and glide forward with straight legs, then return.",
        repsSets: "4 x 5 glides",
        purpose: "Kip timing, leg drive",
        category: "Bars",
      },
      {
        id: "drill_floor_snap_downs",
        name: "Handstand Snap-Downs",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Connect round-off timing and rebound.",
        howToPerform: "Kick to handstand, then snap feet down quickly to a tight stand with arms up.",
        repsSets: "3 x 6–8",
        purpose: "Rebound, snap",
        category: "Floor",
      },
      {
        id: "drill_roundoff_rebound",
        name: "Round-off Rebound",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Add power and quick rebound after round-offs.",
        howToPerform: "Round-off to a tight two-foot rebound, arms by ears, stick landing.",
        repsSets: "3 x 5",
        purpose: "Power, landing control",
        category: "Floor",
      },
      {
        id: "drill_back_handspring_downhill",
        name: "Downhill Back Handspring (Mat Stack)",
        sport: "gymnastics",
        difficulty: "advanced",
        description: "Teach back handspring shape and reach on a safe incline.",
        howToPerform: "Use a wedge or stacked mats. Sit, jump back, reach long, snap down.",
        repsSets: "3 x 3–5",
        purpose: "BHS technique",
        category: "Floor",
      },
      {
        id: "drill_beam_kicks",
        name: "Beam Kick Series",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Improve balance and leg control for beam.",
        howToPerform: "On low beam/line: front kick, side kick, arabesque hold 2 sec each step.",
        repsSets: "3 passes",
        purpose: "Balance, leg control",
        category: "Beam",
      },
      {
        id: "drill_beam_pivot_turns",
        name: "Pivot Turns on Line",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Clean up pivot turns with posture.",
        howToPerform: "Heel-to-toe, rise to relevé, pivot 180/360 with tight core and spotting.",
        repsSets: "3 x 4 turns",
        purpose: "Turns, posture",
        category: "Beam",
      },
      {
        id: "drill_split_leaps_onto_panel",
        name: "Split Leap to Stick (Panel Mat)",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Train leap shape and controlled landing.",
        howToPerform: "Run or step, split leap onto a panel mat, land soft with arms up.",
        repsSets: "3 x 6",
        purpose: "Leap form, landing",
        category: "Floor",
      },
      {
        id: "drill_vault_run_marks",
        name: "Vault Run Marks",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Consistent sprint pattern into the board.",
        howToPerform: "Mark 6–10 steps, sprint through marks with arms pumping, finish tall.",
        repsSets: "6–8 runs",
        purpose: "Speed, consistency",
        category: "Vault",
      },
      {
        id: "drill_board_punch_rebound",
        name: "Board Punch Rebound",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Better punch and tight rebound off springboard.",
        howToPerform: "Punch board to straight jump with arms up, land stick on mat.",
        repsSets: "3 x 8",
        purpose: "Board contact, power",
        category: "Vault",
      },
      {
        id: "drill_floor_jump_half_turn",
        name: "Jump Half-Turns",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Develop air awareness for turns and landings.",
        howToPerform: "Straight jump, half turn, land tight with chest up.",
        repsSets: "3 x 8",
        purpose: "Air sense, landing",
        category: "Floor",
      },
      {
        id: "drill_bar_tap_swings",
        name: "Tap Swings",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Increase swing amplitude safely.",
        howToPerform: "From hang, hollow forward and tap to arch through bottom, keep straight arms.",
        repsSets: "3 x 6–10",
        purpose: "Swing power",
        category: "Bars",
      },
      {
        id: "drill_bar_pullovers",
        name: "Pullovers",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Strength and timing for pullover to front support.",
        howToPerform: "From hang on low bar, bring toes to bar and roll hips up to support.",
        repsSets: "3 x 3–6",
        purpose: "Bar strength, timing",
        category: "Bars",
      },
      {
        id: "drill_bridge_kickovers_spotted",
        name: "Bridge Kickovers (Spotted)",
        sport: "gymnastics",
        difficulty: "intermediate",
        description: "Progress toward walkovers.",
        howToPerform: "From bridge, kick one leg up and over with spot, keep shoulders open.",
        repsSets: "3 x 3 each leg",
        purpose: "Walkover progression",
        category: "Basics",
      },
      {
        id: "drill_press_handstand_tucks",
        name: "Press Handstand Tucks (Panel)",
        sport: "gymnastics",
        difficulty: "advanced",
        description: "Core compression for press handstands.",
        howToPerform: "Hands on panel mat, pike/tuck legs and press hips up, even if partial.",
        repsSets: "3 x 5–8",
        purpose: "Compression, strength",
        category: "Basics",
      },
      {
        id: "drill_straddle_jumps",
        name: "Straddle Jumps",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Improve hip flexibility and jump height.",
        howToPerform: "Jump, open to wide straddle, toes pointed, land tight.",
        repsSets: "3 x 8",
        purpose: "Flexibility, power",
        category: "Floor",
      },
      {
        id: "drill_tuck_jumps",
        name: "Tuck Jumps",
        sport: "gymnastics",
        difficulty: "beginner",
        description: "Build explosive power for tumbling.",
        howToPerform: "Jump straight up, knees to chest, land soft and tight.",
        repsSets: "3 x 8",
        purpose: "Power, landing",
        category: "Floor",
      },
] as const;

    await db.insert(drills).values(drillData as any);
    console.log(`Seeded ${drillData.length} drills successfully`);

    // Link seeded drills to seeded skills (used by the Drill ↔ Skill UI).
    const drillSkillLinks = [
      { drillId: "drill_wall_handstand_holds", skillId: "skill_handstand", priority: 10 },
      { drillId: "drill_handstand_shrugs", skillId: "skill_handstand", priority: 9 },
      { drillId: "drill_line_drills", skillId: "skill_chasse", priority: 6 },
      { drillId: "drill_line_drills", skillId: "skill_turn", priority: 5 },
      { drillId: "drill_bridge_rocks", skillId: "skill_bridge", priority: 10 },
      { drillId: "drill_kickover_wedge", skillId: "skill_kickover", priority: 10 },
      { drillId: "drill_cartwheel_panel_mats", skillId: "skill_cartwheel", priority: 10 },
      { drillId: "drill_roundoff_rebound_stick", skillId: "skill_roundoff", priority: 10 },
      { drillId: "drill_back_walkover_spotted", skillId: "skill_back_walkover", priority: 10 },
      { drillId: "drill_cast_shape_drill", skillId: "skill_cast", priority: 10 },
      { drillId: "drill_back_hip_circle_drill", skillId: "skill_back_hip_circle", priority: 10 },
      { drillId: "drill_beam_cartwheel_mats", skillId: "skill_beam_cartwheel", priority: 10 },
      { drillId: "drill_vault_hurdle_to_board", skillId: "skill_hurdle", priority: 10 },
    ] as const;

    try {
      await db.insert(drillSkills).values(drillSkillLinks as any);
      console.log(`Linked ${drillSkillLinks.length} drill→skill relationships`);
    } catch (err) {
      console.warn("⚠️ Could not seed drill→skill links (drill_skills).", err);
    }
  }
  // ===== DRILL ↔ SKILL LINK METHODS =====
  async getDrillSkillLinksBySkill(skillId: string): Promise<DrillSkillLink[]> {
    return db
      .select()
      .from(drillSkills)
      .where(eq(drillSkills.skillId, skillId))
      .orderBy(desc(drillSkills.priority), desc(drillSkills.createdAt));
  }

  async getDrillSkillLinksByDrill(drillId: string): Promise<DrillSkillLink[]> {
    return db
      .select()
      .from(drillSkills)
      .where(eq(drillSkills.drillId, drillId))
      .orderBy(desc(drillSkills.priority), desc(drillSkills.createdAt));
  }

  async getDrillsForSkill(skillId: string): Promise<Drill[]> {
    const links = await this.getDrillSkillLinksBySkill(skillId);
    const drillIds = links.map((l) => l.drillId);
    if (drillIds.length === 0) return [];

    const drillRows = await this.getDrillsByIds(drillIds);

    // Preserve priority ordering from drill_skills
    const order = new Map(drillIds.map((id, idx) => [id, idx]));
    return drillRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }


  // ===== CHALLENGE METHODS =====
  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return db
      .select()
      .from(challenges)
      .where(and(eq(challenges.isActive, true), lte(challenges.startDate, now), gte(challenges.endDate, now)))
      .orderBy(challenges.endDate);
  }

  async getAllChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(desc(challenges.startDate));
  }

  async getChallengesBySport(sport: SportType): Promise<Challenge[]> {
    return db
      .select()
      .from(challenges)
      .where(eq(challenges.sport, sport))
      .orderBy(desc(challenges.startDate));
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge || undefined;
  }

  async createChallenge(insertChallenge: InsertChallenge): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values(insertChallenge as any).returning();
    return challenge;
  }

  async getChallengeSubmissions(challengeId: string): Promise<ChallengeSubmission[]> {
    return db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.challengeId, challengeId))
      .orderBy(desc(challengeSubmissions.score));
  }

  async getSubmissionsByAthlete(athleteId: string): Promise<ChallengeSubmission[]> {
    return db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.athleteId, athleteId))
      .orderBy(desc(challengeSubmissions.submittedAt));
  }

  async getChallengeSubmission(id: string): Promise<ChallengeSubmission | undefined> {
    const [submission] = await db
      .select()
      .from(challengeSubmissions)
      .where(eq(challengeSubmissions.id, id));
    return submission || undefined;
  }

  async createChallengeSubmission(insertSubmission: InsertChallengeSubmission): Promise<ChallengeSubmission> {
    const [submission] = await db
      .insert(challengeSubmissions)
      .values(insertSubmission as any)
      .returning();
    return submission;
  }

  async updateChallengeSubmission(
    id: string,
    updates: Partial<ChallengeSubmission>,
  ): Promise<ChallengeSubmission | undefined> {
    const [submission] = await db
      .update(challengeSubmissions)
      .set(updates)
      .where(eq(challengeSubmissions.id, id))
      .returning();
    return submission || undefined;
  }


  // ===== COMPETITION POINTS METHODS =====
  async awardCompetitionPoints(point: InsertCompetitionPoint): Promise<CompetitionPoint | undefined> {
    const now = new Date();
    const metadata = (point.metadata || {}) as any;
    const score = typeof metadata.score === "number" ? metadata.score : null;

    if (!point.profileId || !point.athleteId || !point.sourceId) return undefined;
    if (!point.points || point.points <= 0) return undefined;

    // Minimum quality threshold for normal analysis points.
    // This prevents random junk videos from farming the leaderboard.
    if (point.reason === "analysis_upload" && score !== null && score < 40) {
      return undefined;
    }

    // Daily cap: normal upload/analyze points only count 3 times per day.
    if (point.reason === "analysis_upload") {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);

      const todays = await db
        .select({ id: competitionPoints.id })
        .from(competitionPoints)
        .where(
          and(
            eq(competitionPoints.profileId, point.profileId),
            eq(competitionPoints.athleteId, point.athleteId),
            eq(competitionPoints.reason, "analysis_upload"),
            gte(competitionPoints.createdAt, dayStart),
            lte(competitionPoints.createdAt, dayEnd),
          ),
        );

      if (todays.length >= 3) return undefined;

      const recent = await db
        .select({ createdAt: competitionPoints.createdAt })
        .from(competitionPoints)
        .where(
          and(
            eq(competitionPoints.profileId, point.profileId),
            eq(competitionPoints.athleteId, point.athleteId),
            eq(competitionPoints.reason, "analysis_upload"),
          ),
        )
        .orderBy(desc(competitionPoints.createdAt))
        .limit(1);

      const lastCreated = recent[0]?.createdAt;
      if (lastCreated && now.getTime() - new Date(lastCreated).getTime() < 30_000) {
        return undefined;
      }
    }

    const [created] = await db
      .insert(competitionPoints)
      .values(point)
      .onConflictDoNothing()
      .returning();

    return created || undefined;
  }

  async getPointsForProfile(
    profileId: string,
    weekStart?: Date,
    weekEnd?: Date,
  ): Promise<CompetitionPoint[]> {
    const filters = [eq(competitionPoints.profileId, profileId)];

    if (weekStart) filters.push(gte(competitionPoints.createdAt, weekStart));
    if (weekEnd) filters.push(lte(competitionPoints.createdAt, weekEnd));

    return db
      .select()
      .from(competitionPoints)
      .where(and(...filters))
      .orderBy(desc(competitionPoints.createdAt));
  }

  async getPointsHub(
    profileId: string,
    athleteId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<{
    totalPoints: number;
    breakdown: {
      challengesSubmitted: number;
      basePoints: number;
      allChallengesBonus: number;
      aiBonus: number;
    };
    activity: Array<{
      challengeId: string;
      submittedAt: Date;
      status: string;
      score: number | null;
      basePoints: number;
      aiPoints: number;
      totalFromThisChallenge: number;
    }>;
  }> {
    const points = await db
      .select()
      .from(competitionPoints)
      .where(
        and(
          eq(competitionPoints.profileId, profileId),
          eq(competitionPoints.athleteId, athleteId),
          gte(competitionPoints.createdAt, weekStart),
          lte(competitionPoints.createdAt, weekEnd),
        ),
      )
      .orderBy(desc(competitionPoints.createdAt));

    const totalPoints = points.reduce((sum, p) => sum + (p.points || 0), 0);
    const challengeIds = new Set<string>();

    let basePoints = 0;
    let aiBonus = 0;

    for (const p of points) {
      if (p.reason === "challenge_submission") {
        challengeIds.add(p.sourceId);
        basePoints += p.points || 0;
      } else if (p.reason === "challenge_score_bonus") {
        aiBonus += p.points || 0;
      } else if (p.reason === "analysis_upload") {
        basePoints += p.points || 0;
      }
    }

    const allChallengesBonus = points
      .filter((p) => p.reason === "all_challenges_bonus")
      .reduce((sum, p) => sum + (p.points || 0), 0);

    const byChallenge = new Map<
      string,
      {
        challengeId: string;
        submittedAt: Date;
        status: string;
        score: number | null;
        basePoints: number;
        aiPoints: number;
        totalFromThisChallenge: number;
      }
    >();

    for (const p of points) {
      if (p.sourceType !== "challenge") continue;

      const meta = (p.metadata || {}) as any;
      const row = byChallenge.get(p.sourceId) ?? {
        challengeId: p.sourceId,
        submittedAt: p.createdAt || new Date(),
        status: String(meta.status || "scored"),
        score: typeof meta.score === "number" ? meta.score : null,
        basePoints: 0,
        aiPoints: 0,
        totalFromThisChallenge: 0,
      };

      if (p.reason === "challenge_submission") row.basePoints += p.points || 0;
      if (p.reason === "challenge_score_bonus") row.aiPoints += p.points || 0;
      row.totalFromThisChallenge += p.points || 0;

      byChallenge.set(p.sourceId, row);
    }

    return {
      totalPoints,
      breakdown: {
        challengesSubmitted: challengeIds.size,
        basePoints,
        allChallengesBonus,
        aiBonus,
      },
      activity: Array.from(byChallenge.values()),
    };
  }

  async getWeeklyLeaderboard(
    profileId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<{ athleteId: string; points: number; challengesCompleted: number; aiBonus: number }[]> {
    const points = await db
      .select()
      .from(competitionPoints)
      .where(
        and(
          eq(competitionPoints.profileId, profileId),
          gte(competitionPoints.createdAt, weekStart),
          lte(competitionPoints.createdAt, weekEnd),
        ),
      );

    const byAthlete = new Map<
      string,
      { points: number; challenges: Set<string>; aiBonus: number }
    >();

    for (const p of points) {
      const entry = byAthlete.get(p.athleteId) ?? {
        points: 0,
        challenges: new Set<string>(),
        aiBonus: 0,
      };

      entry.points += p.points || 0;

      if (p.sourceType === "challenge" && p.reason === "challenge_submission") {
        entry.challenges.add(p.sourceId);
      }

      if (p.reason === "challenge_score_bonus") {
        entry.aiBonus += p.points || 0;
      }

      byAthlete.set(p.athleteId, entry);
    }

    const rows = Array.from(byAthlete.entries()).map(([athleteId, entry]) => ({
      athleteId,
      points: entry.points,
      challengesCompleted: entry.challenges.size,
      aiBonus: entry.aiBonus,
    }));

    rows.sort((a, b) => b.points - a.points);
    return rows;
  }

  async getChallengeLeaderboard(
    challengeId: string,
  ): Promise<{ submission: ChallengeSubmission; athlete: Athlete }[]> {
    const submissions = await db
      .select()
      .from(challengeSubmissions)
      .where(and(eq(challengeSubmissions.challengeId, challengeId), eq(challengeSubmissions.status, "scored")))
      .orderBy(desc(challengeSubmissions.score))
      .limit(50);

    const results: { submission: ChallengeSubmission; athlete: Athlete }[] = [];
    for (const submission of submissions) {
      const athlete = await this.getAthlete(submission.athleteId);
      if (athlete) results.push({ submission, athlete });
    }
    return results;
  }

  // ✅ FIXED: never calls values([]) again
  async seedChallengesIfEmpty(): Promise<void> {
    const existingChallenges = await db.select().from(challenges).limit(1);
    if (existingChallenges.length > 0) {
      console.log("Challenges already exist, skipping seed");
      return;
    }

    console.log("Seeding weekly challenges...");

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const challengeData = [
      {
        id: "ch_weekly_handstand_hold",
        name: "Handstand Hold Challenge (3s)",
        description: "Show control and alignment in a handstand hold.",
        instructions: "Upload your best handstand hold. Aim for straight arms, tight legs, and a steady finish.",
        targetSkillId: "skill_handstand",
        sport: "gymnastics",
        difficulty: "beginner",
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
      },
      {
        id: "ch_weekly_cartwheel_lines",
        name: "Cartwheel Lines Challenge",
        description: "Clean lines and control through a cartwheel.",
        instructions: "Upload your best cartwheel. Focus on straight arms, body alignment, and a strong lunge finish.",
        targetSkillId: "skill_cartwheel",
        sport: "gymnastics",
        difficulty: "beginner",
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
      },
      {
        id: "ch_weekly_stick_landing",
        name: "Stick the Landing Challenge",
        description: "Quiet, controlled landing—no extra steps.",
        instructions: "Upload a straight jump with a stick. Land softly with control: knees over toes, chest up, no steps.",
        targetSkillId: "skill_straight_jump",
        sport: "gymnastics",
        difficulty: "beginner",
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
      },
    ];

    if (!challengeData || challengeData.length === 0) {
      console.log("⚠️ No challenge seed data found. Skipping challenge seed.");
      return;
    }

    await db.insert(challenges).values(challengeData as any);
    console.log(`Seeded ${challengeData.length} weekly challenges successfully`);
  }

  // ---- Compatibility aliases (older/newer branches used different names) ----
  // These wrappers prevent runtime "is not a function" errors when index.ts expects
  // a different seed helper name.
  async seedChallengeLibraryIfEmpty(): Promise<void> {
    return this.seedChallengesIfEmpty();
  }

  async seedChallenges(): Promise<void> {
    return this.seedChallengesIfEmpty();
  }

  // ===== SKILL LIBRARY METHODS =====
  async getAllSkills(): Promise<Skill[]> {
    return db.select().from(skills).orderBy(skills.sport, skills.level, skills.name);
  }

  async getSkillsBySport(sport: SportType): Promise<Skill[]> {
    return db.select().from(skills).where(eq(skills.sport, sport)).orderBy(skills.level, skills.name);
  }

  async getSkillsByLevel(level: number): Promise<Skill[]> {
    return db.select().from(skills).where(eq(skills.level, level)).orderBy(skills.sport, skills.name);
  }

  async getSkillsBySportAndLevel(sport: SportType, level: number): Promise<Skill[]> {
    return db
      .select()
      .from(skills)
      .where(and(eq(skills.sport, sport), eq(skills.level, level)))
      .orderBy(skills.name);
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill || undefined;
  }

  async createSkill(insertSkill: InsertSkill): Promise<Skill> {
    const [skill] = await db.insert(skills).values(insertSkill as any).returning();
    return skill;
  }

  // ===== SKILL PROGRESS METHODS =====
  async getSkillProgressByAthlete(athleteId: string): Promise<SkillProgress[]> {
    return db.select().from(skillProgress).where(eq(skillProgress.athleteId, athleteId));
  }

  async getSkillProgressForSkill(
    athleteId: string,
    skillId: string,
  ): Promise<SkillProgress | undefined> {
    const [progress] = await db
      .select()
      .from(skillProgress)
      .where(and(eq(skillProgress.athleteId, athleteId), eq(skillProgress.skillId, skillId)));
    return progress || undefined;
  }

  // ✅ FIXED: status typing narrowed to enum values to satisfy Drizzle
  async upsertSkillProgress(progress: InsertSkillProgress): Promise<SkillProgress> {
    const existing = await this.getSkillProgressForSkill(progress.athleteId, progress.skillId);

    const allowedStatuses = ["working_on", "consistent", "needs_help"] as const;
    type SkillStatus = (typeof allowedStatuses)[number];

    const status: SkillStatus | undefined =
      progress.status && allowedStatuses.includes(progress.status as SkillStatus)
        ? (progress.status as SkillStatus)
        : undefined;

    if (existing) {
      const [updated] = await db
        .update(skillProgress)
        .set({
          status,
          notes: progress.notes,
          updatedAt: new Date(),
        })
        .where(eq(skillProgress.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(skillProgress)
      .values({
        ...progress,
        status,
      } as any)
      .returning();

    return created;
  }

  // ✅ FIXED: never calls values([]) again
  async seedSkillsIfEmpty(): Promise<void> {
    const existingSkills = await db.select().from(skills).limit(1);
    if (existingSkills.length > 0) {
      console.log("Skills already exist, skipping seed");
      return;
    }

    console.log("Seeding skills library...");

    const skillData = [
      // Gymnastics basics (Levels 1–4 friendly). IDs are stable for linking.
      { id: "skill_mount", name: "Mount", sport: "gymnastics", level: 1, category: "Beam" },
      { id: "skill_dismount", name: "Dismount", sport: "gymnastics", level: 1, category: "Beam" },
      { id: "skill_handstand", name: "Handstand", sport: "gymnastics", level: 1, category: "Basics" },
      { id: "skill_cartwheel", name: "Cartwheel", sport: "gymnastics", level: 1, category: "Floor" },
      { id: "skill_roundoff", name: "Round-off", sport: "gymnastics", level: 2, category: "Floor" },
      { id: "skill_bridge", name: "Bridge", sport: "gymnastics", level: 1, category: "Basics" },
      { id: "skill_backbend", name: "Backbend (from stand)", sport: "gymnastics", level: 2, category: "Basics" },
      { id: "skill_kickover", name: "Kickover", sport: "gymnastics", level: 2, category: "Basics" },
      { id: "skill_front_walkover", name: "Front Walkover", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_back_walkover", name: "Back Walkover", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_forward_roll", name: "Forward Roll", sport: "gymnastics", level: 1, category: "Floor" },
      { id: "skill_backward_roll", name: "Backward Roll", sport: "gymnastics", level: 1, category: "Floor" },
      { id: "skill_split", name: "Split", sport: "gymnastics", level: 1, category: "Flexibility" },
      { id: "skill_leap", name: "Leap", sport: "gymnastics", level: 2, category: "Floor" },
      { id: "skill_hurdle", name: "Hurdle", sport: "gymnastics", level: 1, category: "Vault" },
      { id: "skill_straight_jump", name: "Straight Jump", sport: "gymnastics", level: 1, category: "Vault" },
      { id: "skill_tuck_jump", name: "Tuck Jump", sport: "gymnastics", level: 1, category: "Vault" },
      { id: "skill_straddle_jump", name: "Straddle Jump", sport: "gymnastics", level: 2, category: "Vault" },
      { id: "skill_jump_to_front_support", name: "Jump to Front Support", sport: "gymnastics", level: 2, category: "Bars" },
      { id: "skill_cast", name: "Cast", sport: "gymnastics", level: 2, category: "Bars" },
      { id: "skill_back_hip_circle", name: "Back Hip Circle", sport: "gymnastics", level: 3, category: "Bars" },
      { id: "skill_pullover", name: "Pullover", sport: "gymnastics", level: 3, category: "Bars" },
      { id: "skill_squat_on", name: "Squat On", sport: "gymnastics", level: 2, category: "Bars" },
      { id: "skill_stretch_jump_dismount", name: "Stretch Jump Dismount", sport: "gymnastics", level: 2, category: "Bars" },
      { id: "skill_beam_cartwheel", name: "Cartwheel on Beam", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_beam_handstand", name: "Handstand on Beam", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_chasse", name: "Chassé", sport: "gymnastics", level: 2, category: "Beam" },
      { id: "skill_turn", name: "Pivot Turn", sport: "gymnastics", level: 2, category: "Beam" },
      { id: "skill_tuck_jump_beam", name: "Tuck Jump on Beam", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_vault_front_handspring", name: "Front Handspring Vault", sport: "gymnastics", level: 4, category: "Vault" },
    
      { id: "skill_kip", name: "Kip", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_glide_swing", name: "Glide Swing", sport: "gymnastics", level: 3, category: "Bars" },
      { id: "skill_long_hang", name: "Long Hang", sport: "gymnastics", level: 3, category: "Bars" },
      { id: "skill_tap_swing", name: "Tap Swing", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_cast_handstand", name: "Cast to Handstand (progression)", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_swing_dismount", name: "Swing Dismount", sport: "gymnastics", level: 3, category: "Bars" },
      { id: "skill_stride_circle", name: "Stride Circle", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_mill_circle", name: "Mill Circle", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_clear_hip", name: "Clear Hip Circle (progression)", sport: "gymnastics", level: 4, category: "Bars" },
      { id: "skill_beam_front_walkover", name: "Front Walkover (Beam)", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_back_walkover", name: "Back Walkover (Beam)", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_split_jump", name: "Split Jump (Beam)", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_beam_split_leap", name: "Split Leap (Beam)", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_full_turn", name: "Full Turn (Beam)", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_handstand_dismount", name: "Handstand Dismount", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_side_handstand", name: "Side Handstand", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_beam_jump_series", name: "Jump Series", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_back_handspring", name: "Back Handspring", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_front_handspring_floor", name: "Front Handspring (Floor)", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_back_extension_roll", name: "Back Extension Roll", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_handstand_forward_roll", name: "Handstand Forward Roll", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_handstand_bridge", name: "Handstand to Bridge", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_cartwheel_step_in", name: "Cartwheel Step-In", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_roundoff_bhs_prep", name: "Round-off + Rebound", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_split_leap", name: "Split Leap", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_split_jump", name: "Split Jump", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_switch_leap_prep", name: "Switch Leap (prep)", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_chasse_leap", name: "Chassé + Leap Connection", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_pivot_turn_360", name: "360° Pivot Turn", sport: "gymnastics", level: 4, category: "Floor" },
      { id: "skill_straight_jump_rebound", name: "Straight Jump Rebound", sport: "gymnastics", level: 3, category: "Vault" },
      { id: "skill_handstand_flatback", name: "Handstand Flatback (Vault)", sport: "gymnastics", level: 3, category: "Vault" },
      { id: "skill_yurchenko_entry_prep", name: "Round-off onto Board (prep)", sport: "gymnastics", level: 4, category: "Vault" },
      { id: "skill_vault_block", name: "Vault Block (technique)", sport: "gymnastics", level: 4, category: "Vault" },
      { id: "skill_pike_jump", name: "Pike Jump", sport: "gymnastics", level: 3, category: "Floor" },
      { id: "skill_wolf_jump", name: "Wolf Jump", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_scale", name: "Scale", sport: "gymnastics", level: 3, category: "Beam" },
      { id: "skill_lever", name: "Lever", sport: "gymnastics", level: 4, category: "Beam" },
      { id: "skill_press_handstand", name: "Press Handstand (progression)", sport: "gymnastics", level: 4, category: "Basics" },
      { id: "skill_hollow_hold", name: "Hollow Hold", sport: "gymnastics", level: 3, category: "Basics" },
      { id: "skill_arch_hold", name: "Arch Hold", sport: "gymnastics", level: 3, category: "Basics" },
      { id: "skill_shoulder_stand", name: "Shoulder Stand", sport: "gymnastics", level: 3, category: "Floor" },

      // ===== Added Levels 5–10 (coach-style definitions) =====
      { id: "skill_roundoff_back_handspring", name: "Round-off Back Handspring", sport: "gymnastics", level: 5, category: "Floor", description: "A connected tumbling skill combining a round-off into a back handspring with immediate rebound.", keyPoints: ["Fast snap-down to two feet together", "Immediate sit and jump back", "Arms stay by ears; straight elbows", "Rebound tall on landing"], commonMistakes: ["Pause between skills", "Dropping arms", "Under-rotating the BHS", "Feet apart on landing"] },
      { id: "skill_back_handspring_stepout", name: "Back Handspring Step-Out", sport: "gymnastics", level: 5, category: "Floor", description: "A back handspring landing one foot at a time, used for connections into other skills.", keyPoints: ["Set shoulders and jump back", "Reach long with straight arms", "Snap down to controlled step-out", "Maintain tight core and alignment"], commonMistakes: ["Feet crossing on step-out", "Bent arms", "Low jump causing travel", "Dropping chest on landing"] },
      { id: "skill_front_handspring_stepout", name: "Front Handspring Step-Out", sport: "gymnastics", level: 5, category: "Floor", description: "A front handspring finishing one foot at a time, emphasizing lift and control through the shoulders.", keyPoints: ["Long hurdle and reach", "Strong shoulder block", "Tight body through flight", "Controlled step-out finish"], commonMistakes: ["Diving forward", "No block", "Piking down", "Over-stepping and losing control"] },
      { id: "skill_back_tuck", name: "Back Tuck", sport: "gymnastics", level: 6, category: "Floor", description: "A backward salto in tuck position requiring a strong set and quick tuck for safe rotation.", keyPoints: ["Set up before tucking", "Drive arms up by ears", "Tuck fast; knees to chest", "Open early to spot landing"], commonMistakes: ["Throwing head back", "Tucking too early", "Low set", "Opening late causing steps"] },
      { id: "skill_front_tuck", name: "Front Tuck", sport: "gymnastics", level: 6, category: "Floor", description: "A forward salto in tuck position off a hurdle/punch with controlled landing.", keyPoints: ["Aggressive hurdle and punch", "Lift chest to set", "Tuck after leaving the floor", "Spot and open for landing"], commonMistakes: ["Diving forward", "Tucking too early", "Arms dropping", "Landing with big step"] },
      { id: "skill_layout", name: "Back Layout", sport: "gymnastics", level: 7, category: "Floor", description: "A backward salto in straight body position emphasizing a high set and tight core control.", keyPoints: ["High set\u2014jump up, not back", "Maintain straight line body", "Tight hollow through flight", "Spot and land tall"], commonMistakes: ["Arching excessively", "Piking mid-air", "Low set", "Landing with low chest"] },
      { id: "skill_layout_full", name: "Layout Full Twist", sport: "gymnastics", level: 8, category: "Floor", description: "A back layout with a full (360\u00b0) twist, requiring set-first mechanics and body tightness.", keyPoints: ["Set first, twist second", "Initiate twist from shoulders/hips", "Stay tight\u2014legs together", "Spot early and land square"], commonMistakes: ["Twisting too early", "Loose legs", "Over-rotating twist", "Landing crossed"] },
      { id: "skill_double_back_tuck", name: "Double Back Tuck", sport: "gymnastics", level: 10, category: "Floor", description: "A double backward salto in tuck position requiring power, fast rotation, and controlled landing.", keyPoints: ["Explosive set upward", "Tuck tight and fast", "Open to spot between rotations", "Absorb landing safely"], commonMistakes: ["Low set", "Opening late", "Drifting sideways", "Uncontrolled steps"] },
      { id: "skill_kip_cast_handstand", name: "Kip Cast to Handstand", sport: "gymnastics", level: 6, category: "Bars", description: "A kip followed by a cast rising to handstand, showing power and line control.", keyPoints: ["Long glide and strong kip", "Immediate cast with hollow body", "Open shoulders to vertical", "Control to handstand line"], commonMistakes: ["Soft kip with no support", "Casting with pike", "Not finishing vertical", "Leg separation"] },
      { id: "skill_clear_hip_handstand", name: "Clear Hip to Handstand", sport: "gymnastics", level: 7, category: "Bars", description: "A clear hip circle that finishes in handstand with tight form and open shoulders.", keyPoints: ["Strong cast entry", "Keep hips off bar through circle", "Drive heels up to vertical", "Finish stacked handstand"], commonMistakes: ["Hitting hips on bar", "Piking early", "Casting too low", "Breaking at handstand"] },
      { id: "skill_giant", name: "Giant Swing", sport: "gymnastics", level: 8, category: "Bars", description: "A full circle around the high bar passing through handstand with straight body and tight form.", keyPoints: ["Tight hollow on downswing", "Push through shoulders at bottom", "Open to handstand at top", "Straight legs together"], commonMistakes: ["Piking at hips", "Bent arms", "Breaking at top", "Leg separation"] },
      { id: "skill_flyaway_tuck", name: "Flyaway Tuck Dismount", sport: "gymnastics", level: 7, category: "Bars", description: "A release dismount from the high bar into a tuck salto with controlled landing.", keyPoints: ["Strong tap swing", "Release at correct angle", "Quick tuck; spot landing", "Stick with chest up"], commonMistakes: ["Late release", "No set before tuck", "Over/under rotation", "Big step"] },
      { id: "skill_beam_back_handspring", name: "Back Handspring on Beam", sport: "gymnastics", level: 7, category: "Beam", description: "A back handspring on the beam requiring power, precise hand placement, and controlled landing.", keyPoints: ["Jump back on the line", "Hands land centered on beam", "Straight arms; quick snap down", "Land tight and hold"], commonMistakes: ["Jumping sideways", "Hands off line", "Bent arms", "Feet apart landing"] },
      { id: "skill_beam_aerial", name: "Aerial (Side) on Beam", sport: "gymnastics", level: 8, category: "Beam", description: "A no-hands aerial cartwheel on beam, driven by a strong kick and hip lift for flight.", keyPoints: ["Strong lunge entry", "Kick high; lift hips", "Stay square over beam", "Land in lunge and hold"], commonMistakes: ["Low kick", "Dropping shoulder", "Not committing to flight", "Landing off line"] },
      { id: "skill_yurchenko_layout", name: "Yurchenko Layout", sport: "gymnastics", level: 9, category: "Vault", description: "A Yurchenko vault with straight-body salto off the table, emphasizing a powerful block and tight line.", keyPoints: ["Fast round-off entry", "Strong back handspring onto table", "Aggressive shoulder block", "Maintain straight body in flight"], commonMistakes: ["Slow entry", "Hands too low on table", "No block", "Piking off table"] },
      { id: "skill_tsukahara_tuck", name: "Tsukahara Tuck", sport: "gymnastics", level: 9, category: "Vault", description: "A vault with a 1/4\u20131/2 turn entry onto the table and a back salto dismount in tuck.", keyPoints: ["Controlled entry and hand placement", "Strong block through shoulders", "Quick tuck after block", "Spot and land controlled"], commonMistakes: ["Late turn onto table", "Weak block", "Tuck too early", "Drifting and big steps"] },
      { id: "skill_switch_leap", name: "Switch Leap", sport: "gymnastics", level: 6, category: "Beam", description: "A leap switching the legs in the air, showing height, split position, and controlled landing.", keyPoints: ["Lift through chest and core", "Drive back leg up to split", "Square hips; pointed toes", "Land softly and hold"], commonMistakes: ["Low height", "Bent knees", "Turning hips", "Landing with wobble"] },
      { id: "skill_split_jump_180", name: "Split Jump 180", sport: "gymnastics", level: 5, category: "Beam", description: "A split jump showing 180\u00b0 position with straight legs and controlled landing.", keyPoints: ["Strong takeoff from two feet", "Hit 180\u00b0 split with straight legs", "Point toes; square hips", "Land quietly, hold"], commonMistakes: ["Under-splitting", "Bent legs", "Feet apart landing", "Arms dropping"] },
      { id: "skill_full_turn_beam", name: "Full Turn on Beam", sport: "gymnastics", level: 5, category: "Beam", description: "A controlled 360\u00b0 turn on beam with tight posture and balance.", keyPoints: ["Tall posture; core tight", "Spot a fixed point", "Arms controlled", "Finish without extra adjustment"], commonMistakes: ["Dropping heel", "Shoulders leaning", "Arms swinging", "Extra steps after finish"] },
      { id: "skill_front_aerial", name: "Front Aerial", sport: "gymnastics", level: 8, category: "Floor", description: "A no-hands forward salto-like skill with extended body line and controlled landing.", keyPoints: ["Strong hurdle and punch", "Drive lead leg up", "Keep chest lifted", "Spot landing and control"], commonMistakes: ["Diving forward", "Low takeoff", "Twisting unintentionally", "Landing with big step"] },
      { id: "skill_ro_bhs_layout", name: "Round-off BHS Layout", sport: "gymnastics", level: 8, category: "Floor", description: "A tumbling pass connecting a round-off and back handspring into a layout.", keyPoints: ["Maintain speed through RO+BHS", "Set high after BHS", "Stay tight in layout", "Spot and land tall"], commonMistakes: ["Breaking connection", "Low set", "Arch/pike in layout", "Landing off line"] },
      { id: "skill_ro_bhs_full", name: "Round-off BHS Full", sport: "gymnastics", level: 9, category: "Floor", description: "A tumbling pass connecting a round-off and back handspring into a full-twisting layout.", keyPoints: ["Set first, twist second", "Stay tight through twist", "Spot early", "Land square"], commonMistakes: ["Twisting early", "Loose legs", "Over-rotating", "Crossed landing"] },
      { id: "skill_pak_salto", name: "Pak Salto", sport: "gymnastics", level: 9, category: "Bars", description: "A transition from high bar to low bar with a salto-like flight element.", keyPoints: ["Strong swing and release timing", "Tight body through flight", "Catch low bar with control", "Immediate swing continuation"], commonMistakes: ["Releasing too late", "Loose knees/feet", "Catching too close", "Stopping swing"] },
      { id: "skill_van_leeuwen", name: "Van Leeuwen", sport: "gymnastics", level: 10, category: "Bars", description: "A bar transition combining a release and turn to catch, requiring precision and power.", keyPoints: ["Maintain swing speed", "Accurate release timing", "Tight body and quick turn", "Catch with straight arms"], commonMistakes: ["Late release", "Under-rotation", "Bent arms on catch", "Loss of swing after catch"] },
      { id: "skill_double_twist", name: "Double Twist", sport: "gymnastics", level: 10, category: "Floor", description: "A layout with a double (720\u00b0) twist requiring strong set and tight rotation control.", keyPoints: ["High set before twisting", "Initiate twist cleanly", "Stay tight; legs together", "Spot and land square"], commonMistakes: ["Twisting early", "Loose core", "Over-rotating", "Landing crossed"] },
      { id: "skill_arabian_double_front", name: "Arabian Double Front", sport: "gymnastics", level: 10, category: "Floor", description: "An advanced tumbling element combining half turn entry with a double front rotation.", keyPoints: ["Set powerfully; commit to rotation", "Stay tight through flips", "Spot early when possible", "Land with safe absorption"], commonMistakes: ["Low set", "Opening too late", "Drifting", "Uncontrolled landing"] },
] as const;

    // Coach-style definitions used in Skills page + AI scoring context.
    const skillDefinitions: Record<string, { description: string; keyPoints: string[]; commonMistakes?: string[] }> = {
      "skill_handstand": {
        description: "Handstand: a controlled inverted support with stacked shoulders/hips and tight body alignment.",
        keyPoints: ["Arms locked, shoulders elevated (push tall)", "Ribs in / hollow body—no arch", "Hips stacked over shoulders", "Legs tight together, toes pointed", "Controlled entry and exit—no wobble"],
        commonMistakes: ["Bent arms", "Arched back / ribs out", "Feet apart / soft legs", "Falling out early"],
      },
      "skill_cartwheel": {
        description: "Cartwheel: a sideways rotation through a lunge-to-lunge with straight arms and controlled finish.",
        keyPoints: ["Strong lunge with arms by ears", "Hands place on a straight line", "Kick to a vertical split—hips pass over hands", "Straight arms, open shoulders", "Finish in lunge—control with no extra steps"],
        commonMistakes: ["Hands off line", "Bent arms", "Hips never pass over hands", "Stepping out of lunge"],
      },
      "skill_roundoff": {
        description: "Round-off: cartwheel entry that snaps down to two feet together, generating backward momentum.",
        keyPoints: ["Fast hurdle into tight lunge", "Hands turn in to support snap-down", "Hips rise to near-vertical", "Aggressive snap-down to two feet together", "Rebound tall with tight core"],
        commonMistakes: ["Feet apart on landing", "Slow snap-down", "Arched body line", "No rebound"],
      },
      "skill_straight_jump": {
        description: "Straight jump: vertical jump with tight body and quiet, controlled landing.",
        keyPoints: ["Jump straight up—no pike", "Legs together, toes pointed", "Arms controlled", "Land softly with knees tracking", "Stick—no extra steps"],
        commonMistakes: ["Legs apart", "Unstable landing", "Extra steps"],
      },
      "skill_back_walkover": {
        description: "Back walkover: controlled kick-over from bridge through split-handstand line to a lunge finish.",
        keyPoints: ["Kick to split handstand—hips pass over shoulders", "Straight arms and open shoulders", "Maintain split line and tight legs", "Step down one foot at a time with control", "Finish tall in lunge—no wobble"],
        commonMistakes: ["Bent arms", "Missing split line", "Collapsing shoulders", "Uncontrolled step-down"],
      },
      "skill_front_walkover": {
        description: "Front walkover: lunge entry to split-handstand line, then controlled step-down to lunge finish.",
        keyPoints: ["Long lunge with arms by ears", "Kick to split handstand—hips stacked", "Straight arms; open shoulders", "Step down with control—no hop", "Finish tall in lunge"],
        commonMistakes: ["Short lunge", "Bent arms", "Jumping down"],
      },
      "skill_pullover": {
        description: "Pullover: transition from hang to front support using a tight body lift and strong pull to the hips.",
        keyPoints: ["Tight body—legs together, toes pointed", "Pull bar to hips—no chicken wing", "Lean over bar to finish front support", "Straight arms in support", "Control—no throwing head"],
        commonMistakes: ["Chicken wing", "Legs apart", "Throwing head"],
      },
      "skill_kip": {
        description: "Kip: glide swing transition from hang to front support using toe rise and aggressive hip drive.",
        keyPoints: ["Long glide with hollow body", "Fast toe rise toward the bar", "Aggressive hip drive up", "Quick wrist shift to front support", "Legs tight together throughout"],
        commonMistakes: ["Short glide", "Early pike", "Late hip drive"],
      },
    };

    const enrichedSkillData = skillData.map((s) => {
      const d = skillDefinitions[s.id as string];
      return d ? ({ ...s, ...d } as any) : (s as any);
    });


    await db.insert(skills).values(enrichedSkillData as any);
    console.log(`Seeded ${skillData.length} skills successfully`);
  }

  // ---- Compatibility aliases (older/newer branches used different names) ----
  async seedSkillsLibraryIfEmpty(): Promise<void> {
    return this.seedSkillsIfEmpty();
  }

  async seedSkills(): Promise<void> {
    return this.seedSkillsIfEmpty();
  }

  // ===== SEASON / MEET / SCORES METHODS =====
  async getSeasonsByAthlete(athleteId: string): Promise<Season[]> {
    return db.select().from(seasons).where(eq(seasons.athleteId, athleteId)).orderBy(desc(seasons.year));
  }

  async getSeasonsByAthleteAndSport(athleteId: string, sport: SportType): Promise<Season[]> {
    return db
      .select()
      .from(seasons)
      .where(and(eq(seasons.athleteId, athleteId), eq(seasons.sport, sport)))
      .orderBy(desc(seasons.year));
  }

  async getSeason(id: string): Promise<Season | undefined> {
    const [season] = await db.select().from(seasons).where(eq(seasons.id, id));
    return season || undefined;
  }

  async createSeason(insertSeason: InsertSeason): Promise<Season> {
    const [season] = await db.insert(seasons).values(insertSeason as any).returning();
    return season;
  }

  async updateSeason(id: string, updates: Partial<InsertSeason>): Promise<Season | undefined> {
    const [season] = await db.update(seasons).set(updates as any).where(eq(seasons.id, id)).returning();
    return season || undefined;
  }

  async deleteSeason(id: string): Promise<boolean> {
    const seasonMeets = await this.getMeetsBySeason(id);
    for (const meet of seasonMeets) {
      await this.deleteMeet(meet.id);
    }
    const deleted = await db.delete(seasons).where(eq(seasons.id, id)).returning();
    return deleted.length > 0;
  }

  async getMeetsBySeason(seasonId: string): Promise<Meet[]> {
    return db.select().from(meets).where(eq(meets.seasonId, seasonId)).orderBy(desc(meets.meetDate));
  }

  async getMeet(id: string): Promise<Meet | undefined> {
    const [meet] = await db.select().from(meets).where(eq(meets.id, id));
    return meet || undefined;
  }

  async createMeet(insertMeet: InsertMeet): Promise<Meet> {
    const [meet] = await db.insert(meets).values(insertMeet).returning();
    return meet;
  }

  async updateMeet(id: string, updates: Partial<InsertMeet>): Promise<Meet | undefined> {
    const [meet] = await db.update(meets).set(updates).where(eq(meets.id, id)).returning();
    return meet || undefined;
  }

  async deleteMeet(id: string): Promise<boolean> {
    await db.delete(meetScores).where(eq(meetScores.meetId, id));
    const deleted = await db.delete(meets).where(eq(meets.id, id)).returning();
    return deleted.length > 0;
  }

  async getScoresByMeet(meetId: string): Promise<MeetScore[]> {
    return db.select().from(meetScores).where(eq(meetScores.meetId, meetId));
  }

  async getMeetScore(id: string): Promise<MeetScore | undefined> {
    const [score] = await db.select().from(meetScores).where(eq(meetScores.id, id));
    return score || undefined;
  }

  async createMeetScore(insertScore: InsertMeetScore): Promise<MeetScore> {
    const [score] = await db.insert(meetScores).values(insertScore).returning();
    return score;
  }

  async updateMeetScore(id: string, updates: Partial<InsertMeetScore>): Promise<MeetScore | undefined> {
    const [score] = await db.update(meetScores).set(updates).where(eq(meetScores.id, id)).returning();
    return score || undefined;
  }

  async deleteMeetScore(id: string): Promise<boolean> {
    const deleted = await db.delete(meetScores).where(eq(meetScores.id, id)).returning();
    return deleted.length > 0;
  }

  async createMeetScores(scores: InsertMeetScore[]): Promise<MeetScore[]> {
    // Insert many meet scores at once. Avoid calling values([]).
    if (!scores || scores.length === 0) return [];
    return db.insert(meetScores).values(scores as any).returning();
  }

  async seedDemoDataIfEmpty(): Promise<void> {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already has data, skipping seed");
      return;
    }

    console.log("Seeding demo data...");

    const [demoUser] = await db
      .insert(users)
      .values({
        id: "demo-user",
        username: "demo",
        password: "demo",
      })
      .returning();

    const [athlete1] = await db
      .insert(athletes)
      .values({
        userId: demoUser.id,
        name: "Demi",
      })
      .returning();

    const [athlete2] = await db
      .insert(athletes)
      .values({
        userId: demoUser.id,
        name: "Dad",
      })
      .returning();

    await db.insert(sportProfiles).values([
      {
        athleteId: athlete1.id,
        sport: "gymnastics",
        level: "Level 5",
      },
      {
        athleteId: athlete1.id,
        sport: "dance",
        level: "Intermediate",
        metadata: { style: "Ballet", level: "Intermediate" },
      },
      {
        athleteId: athlete2.id,
        sport: "lifting",
        level: "intermediate",
      },
      {
        athleteId: athlete2.id,
        sport: "yoga",
        level: "beginner",
      },
    ]);

    console.log("Demo data seeded successfully");
  }
}

export const storage = new DatabaseStorage();