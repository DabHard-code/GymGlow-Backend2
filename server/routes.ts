// server/routes.ts
import type { Express, NextFunction, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  analysisRequestSchema,
  sportTypes,
  type SportType,
} from "@shared/schema";
import { z } from "zod";
import { transcodeTo1080pH264Mp4 } from "./videoTranscode.js";
import os from "os";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { analyzeChallengeVideoFilePath, analyzeVideoFilePath } from "./openai.js";
import { supabaseAdmin } from "./supabase.js";
import { getStripe, getPriceIdForPlan, planFromPriceId, type PaidPlan } from "./stripe"; import multer from "multer";

/* ==================== VIDEO FILE DOWNLOAD HELPERS ==================== */


function sanitizeUploadFileName(fileName: string | null | undefined): string {
  const raw = String(fileName || "upload.mp4");
  const cleaned = raw
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  return cleaned || "upload.mp4";
}

function inferVideoExtension(fileName: string | null | undefined, mimeType: string | null | undefined): string {
  const fromName = String(fileName || "").toLowerCase().match(/.(mp4|mov|m4v|webm|avi|mkv)$/)?.[1];
  if (fromName) return fromName === "m4v" ? "mp4" : fromName;

  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("x-msvideo") || mime.includes("avi")) return "avi";
  if (mime.includes("matroska") || mime.includes("mkv")) return "mkv";
  return "mp4";
}

function hasInlineVideoPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.videoBase64 === "string" ||
    typeof value.videoData === "string" ||
    typeof value.videoBuffer === "string" ||
    typeof value.fileBase64 === "string" ||
    typeof value.dataUrl === "string"
  );
}

function safeVideoExtension(videoPath: string | null | undefined): string {
  const clean = String(videoPath || "").split("?")[0].toLowerCase();
  const ext = path.extname(clean);
  const allowed = new Set([".mp4", ".mov", ".m4v", ".webm", ".qt", ".hevc"]);
  return allowed.has(ext) ? ext : ".mp4";
}

function videoPathBelongsToUserProfile(
  videoPath: string,
  userId: string,
  profileId: string,
): boolean {
  const parts = videoPath.split("/").filter(Boolean);
  return (
    parts.length >= 3 &&
    parts[0] === userId &&
    parts.includes(profileId) &&
    !parts.some((part) => part === "." || part === "..")
  );
}

function looksLikeVideoHeader(header: Buffer): boolean {
  // MP4/MOV/M4V usually has "ftyp" at byte 4.
  if (header.length >= 12 && header.subarray(4, 8).toString("ascii") === "ftyp") return true;

  // WebM/Matroska EBML header.
  if (
    header.length >= 4 &&
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    return true;
  }

  return false;
}

async function writeSupabaseBlobToVideoFile(data: Blob, outputPath: string): Promise<void> {
  // Supabase storage .download() returns a Web Blob. Its stream is a Web ReadableStream,
  // so convert it to a Node stream before writing.
  await pipeline(
    Readable.fromWeb(data.stream() as any),
    fs.createWriteStream(outputPath),
  );

  const stats = await fs.promises.stat(outputPath);
  if (!stats.size || stats.size < 1024) {
    throw new Error(`Downloaded video is empty or too small (${stats.size} bytes).`);
  }

  const file = await fs.promises.open(outputPath, "r");
  try {
    const header = Buffer.alloc(Math.min(64, stats.size));
    await file.read(header, 0, header.length, 0);

    if (!looksLikeVideoHeader(header)) {
      const preview = header
        .toString("utf8")
        .replace(/[^\x20-\x7E]/g, ".")
        .slice(0, 80);

      throw new Error(
        `Downloaded file is not valid video data. Size=${stats.size} bytes. First bytes="${preview}". This usually means the frontend uploaded a bad blob or the storage path points to the wrong object.`,
      );
    }
  } finally {
    await file.close();
  }
}

async function removeStoredVideo(videoPath: string, label: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from("Videos").remove([videoPath]);
  if (error) {
    console.warn(`Could not remove ${label} video from Supabase Storage:`, error.message);
  }
}

async function removeStoredVideosForUser(userId: string): Promise<number> {
  const bucket = supabaseAdmin.storage.from("Videos");
  const paths: string[] = [];

  async function collect(prefix: string): Promise<void> {
    const { data, error } = await bucket.list(prefix, { limit: 1000 });
    if (error) {
      console.warn(`Could not list video storage prefix ${prefix}:`, error.message);
      return;
    }

    for (const item of data || []) {
      const itemPath = `${prefix}/${item.name}`;
      if ((item as any).metadata) {
        paths.push(itemPath);
      } else {
        await collect(itemPath);
      }
    }
  }

  await collect(userId);

  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await bucket.remove(batch);
    if (error) {
      console.warn("Could not remove account video storage batch:", error.message);
    }
  }

  return paths.length;
}


/* ==================== DRILL MATCHING HELPERS ==================== */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scoreOverlap(aTokens: string[], bTokens: string[]): number {
  if (!aTokens.length || !bTokens.length) return 0;
  const setB = new Set(bTokens);
  let score = 0;
  for (const t of aTokens) if (setB.has(t)) score += 1;
  return score;
}

async function enrichFeedbackWithDrills(
  sport: SportType,
  feedback: any[],
): Promise<any[]> {
  // Pull drills for this sport and try to match them to each feedback item.
  const drillsForSport = await storage.getDrillsBySport(sport);

  if (!drillsForSport.length) return feedback;

  return feedback.map((item) => {
    const text = `${item?.title ?? ""} ${item?.description ?? ""} ${item?.improvement ?? ""} ${item?.drillRecommendation ?? ""}`;
    const itemTokens = tokenize(text);

    const ranked = drillsForSport
      .map((d) => {
        const drillText = `${d.name} ${d.category ?? ""} ${d.purpose ?? ""} ${d.description ?? ""}`;
        const s = scoreOverlap(itemTokens, tokenize(drillText));
        return { d, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 2);

    if (!ranked.length) return item;

    return {
      ...item,
      drillIds: ranked.map((x) => x.d.id),
      drillMatches: ranked.map((x) => ({
        id: x.d.id,
        name: x.d.name,
        difficulty: x.d.difficulty,
        category: x.d.category,
      })),
    };
  });
}

// Challenges support
import { db } from "./db";
import {
  challenges as challengesTable,
  challengeSubmissions as submissionsTable,
  type DifficultyLevel,
  sportProfiles as sportProfilesTable,
  sessions as sessionsTable,
  analyses as analysesTable,
  badges as badgesTable,
  badgeProgress as badgeProgressTable,
} from "@shared/schema";
import { and, eq, gte, lte, or, isNull, sql, desc } from "drizzle-orm";

/* ==================== AUTH ==================== */

async function attachVerifiedUser(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return next();

  const { data, error } = await supabaseAdmin.auth.getUser(match[1]);
  if (error || !data.user?.id) {
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }

  (req as any).authUserId = data.user.id;
  next();
}

function requireUserId(req: Request, res: Response): string | null {
  const userId = (req as any).authUserId as string | undefined;
  if (!userId) {
    res.status(401).json({ error: "Missing Authorization bearer token" });
    return null;
  }
  return userId;
}

async function requirePlan(
  req: Request,
  res: Response,
  allowed: Array<PaidPlan>,
): Promise<{ userId: string; user: any } | null> {
  const userId = requireUserId(req, res);
  if (!userId) return null;

  await storage.ensureUserFromAuth(userId);

  const user = await storage.getUser(userId);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return null;
  }

  const plan = (user.plan ?? "none") as PaidPlan | "none";

  if (plan === "none" || !allowed.includes(plan)) {
    res.status(402).json({
      error: "Plan required",
      required: allowed,
      current: user.plan,
    });
    return null;
  }

  return { userId, user };
}


/* ==================== ROUTES ==================== */

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use(attachVerifiedUser);

  app.get("/api/version", (_req, res) => {
    res.json({ version: "v8411-copy-patched-auth-2026-04-02" });
  });

  async function requireProfileAccess(req: Request, res: Response, profileId: string) {
    const userId = requireUserId(req, res);
    if (!userId) return null;

    const profile = await storage.getProfile(profileId);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return null;
    }

    const athlete = await storage.getAthlete(profile.athleteId);
    if (!athlete || athlete.userId !== userId) {
      res.status(404).json({ error: "Profile not found" });
      return null;
    }

    return { userId, profile, athlete };
  }

  async function requireSessionAccess(req: Request, res: Response, sessionId: string) {
    const session = await storage.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Not found" });
      return null;
    }

    const access = await requireProfileAccess(req, res, session.profileId);
    if (!access) return null;

    return { ...access, session };
  }

  async function requireAnalysisAccess(req: Request, res: Response, analysisId: string) {
    const analysis = await storage.getAnalysis(analysisId);
    if (!analysis) {
      res.status(404).json({ error: "Not found" });
      return null;
    }

    const access = await requireSessionAccess(req, res, analysis.sessionId);
    if (!access) return null;

    return { ...access, analysis };
  }

  app.post("/api/uploads/video/prepare", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    await storage.ensureUserFromAuth(userId);

    const parsed = z.object({
      fileName: z.string().min(1).optional(),
      mimeType: z.string().min(1).optional(),
      athleteId: z.string().min(1).optional(),
      profileId: z.string().min(1).optional(),
    }).safeParse(req.body ?? {});

    if (!parsed.success) return res.status(400).json(parsed.error);

    if (parsed.data.profileId) {
      const profile = await storage.getProfile(parsed.data.profileId);
      if (!profile) return res.status(404).json({ error: "Profile not found" });

      const athlete = await storage.getAthlete(profile.athleteId);
      if (!athlete || athlete.userId !== userId) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (parsed.data.athleteId && parsed.data.athleteId !== athlete.id) {
        return res.status(400).json({ error: "Profile does not belong to athlete." });
      }
    }

    const extension = inferVideoExtension(parsed.data.fileName, parsed.data.mimeType);
    const baseName = sanitizeUploadFileName(parsed.data.fileName).replace(/\.[^.]+$/, "");
    const videoPath = [
      userId,
      parsed.data.athleteId || "unassigned-athlete",
      parsed.data.profileId || "unassigned-profile",
      `${Date.now()}_${baseName}${extension}`,
    ].join("/");

    return res.json({
      bucket: "Videos",
      videoPath,
      contentType: parsed.data.mimeType || "video/mp4",
    });
  });

  
const backendVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(os.tmpdir(), "gymglow-uploads");
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const safeName = String(file.originalname || "upload.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${randomUUID()}_${safeName}`);
    },
  }),
  limits: { fileSize: 600 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    const ok = String(file.mimetype || "").startsWith("video/") || /\.(mp4|mov|m4v|webm|qt|hevc)$/i.test(name);
    if (!ok) return cb(new Error("Please upload a supported video file."));
    cb(null, true);
  },
});

app.post("/api/uploads/video/backend", backendVideoUpload.single("video"), async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  await storage.ensureUserFromAuth(userId);

  const file = req.file;
  if (!file) return res.status(400).json({ error: "No video file received." });

  const profileId = String(req.body?.profileId || "no-profile");
  const profile = await storage.getProfile(profileId);
  if (!profile) {
    await fs.promises.rm(file.path, { force: true }).catch(() => {});
    return res.status(404).json({ error: "Profile not found" });
  }

  const athlete = await storage.getAthlete(profile.athleteId);
  if (!athlete || athlete.userId !== userId) {
    await fs.promises.rm(file.path, { force: true }).catch(() => {});
    return res.status(404).json({ error: "Profile not found" });
  }

  const safeBaseName = String(file.originalname || "upload.mp4")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.[^.]+$/, "");

  let optimizedPath: string | null = null;

  try {
    optimizedPath = await transcodeTo1080pH264Mp4(file.path);
    const optimizedBuffer = await fs.promises.readFile(optimizedPath);
    const optimizedSizeMb = Number((optimizedBuffer.length / 1024 / 1024).toFixed(1));

    if (optimizedBuffer.length > 50 * 1024 * 1024) {
      return res.status(413).json({
        error: `Video is still ${optimizedSizeMb} MB after optimization. Trim it shorter, then upload again.`,
        optimizedSizeMb,
      });
    }

    const videoPath = [userId, profileId, `${Date.now()}_${safeBaseName}_optimized.mp4`].join("/");

    const { error: uploadError } = await supabaseAdmin.storage
      .from("Videos")
      .upload(videoPath, optimizedBuffer, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ error: `Optimized upload failed: ${uploadError.message}` });
    }

    return res.json({ success: true, bucket: "Videos", videoPath, sizeMb: optimizedSizeMb });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Backend video optimization failed before upload.",
    });
  } finally {
    await fs.promises.rm(file.path, { force: true }).catch(() => {});
    if (optimizedPath) await fs.promises.rm(optimizedPath, { force: true }).catch(() => {});
  }
});

/* ==================== USER / BILLING (MVP) ==================== */

  // Returns current user (including plan). Used for paywalls in the app.
  app.get("/api/users/me", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    await storage.ensureUserFromAuth(userId);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      username: user.username,
      plan: user.plan,
      trialCredits: user.trialCredits,
      subscriptionStatus: (user as any).subscriptionStatus ?? "inactive",
      currentPeriodEnd: (user as any).currentPeriodEnd ?? null,
    });
  });

  app.delete("/api/users/me", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = z.object({
      confirmation: z.string(),
    }).safeParse(req.body ?? {});

    if (!parsed.success) return res.status(400).json(parsed.error);

    if (parsed.data.confirmation !== "DELETE MY ACCOUNT") {
      return res.status(400).json({
        error: "Type DELETE MY ACCOUNT to confirm account deletion.",
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
      return res.json({ success: true, deleted: { users: 0 } });
    }

    if (user.stripeSubscriptionId && user.subscriptionStatus !== "canceled") {
      await getStripe()
        .subscriptions.cancel(user.stripeSubscriptionId)
        .catch((err) => console.warn("Could not cancel Stripe subscription during account deletion:", err));
    }

    const storageObjectsDeleted = await removeStoredVideosForUser(userId).catch((err) => {
      console.warn("Could not clean user video storage during account deletion:", err);
      return 0;
    });

    const deleted = await storage.deleteUserAccountData(userId);
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.warn("Supabase auth user deletion failed after DB deletion:", authDeleteError.message);
      return res.status(500).json({
        error: "Account data was deleted, but auth deletion needs support follow-up.",
        deleted,
        storageObjectsDeleted,
      });
    }

    res.json({ success: true, deleted, storageObjectsDeleted });
  });

  // Disabled: plans must be changed by Stripe/webhook, not by client request.
  app.post("/api/users/me/plan", (_req, res) => {
    return res.status(403).json({ error: "Plan changes must go through billing." });
  });

  // ----------------------------
  // 💳 Stripe Billing (subscriptions)
  // ----------------------------
  // GET helper so links/buttons can open billing portal (works great in iPhone WebView)
app.get("/billing/portal", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  await storage.ensureUserFromAuth(userId);
  const user = await storage.getUser(userId);

  if (!user?.stripeCustomerId) {
    return res.status(400).send("No Stripe customer found.");
  }

  const stripe = getStripe();

  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    req.get("origin") ||
    `${req.protocol}://${req.get("host")}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  return res.redirect(303, session.url);
});

  // Create a Stripe Checkout Session for a subscription.
  // Frontend should redirect the user to the returned URL.
  app.post("/api/billing/portal-session", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const user = await storage.getUser(userId);
  if (!user?.stripeCustomerId) {
    return res.status(400).json({ error: "No Stripe customer found" });
  }

  const stripe = getStripe();

  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    req.get("origin") ||
    `${req.protocol}://${req.get("host")}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  res.json({ url: session.url });
});

  app.post("/api/billing/checkout-session", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = z
      .object({ plan: z.enum(["coach", "competition"]) })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    await storage.ensureUserFromAuth(userId);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const plan = parsed.data.plan as PaidPlan;

    let stripe;
    try {
      stripe = getStripe();
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Stripe not configured" });
    }

    // Derive base URL from env or request (supports dev + prod)
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      req.get("origin") ||
      `${req.protocol}://${req.get("host")}`;

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId || undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
      });
      customerId = customer.id;
      await storage.updateUserBilling(userId, { stripeCustomerId: customerId });
    }

    const priceId = getPriceIdForPlan(plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      metadata: {
        userId,
        plan,
      },
    });

    res.json({ url: session.url });
  });

  // Stripe webhook: set user plan based on subscription status.
  app.post("/api/billing/webhook", async (req, res) => {
    const stripeSignature = req.header("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: "Missing STRIPE_WEBHOOK_SECRET" });
    }
    if (!stripeSignature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (e: any) {
      return res.status(500).json({ error: e?.message ?? "Stripe not configured" });
    }

    let event;
    try {
      // req.rawBody is set in server/index.ts express.json verify
      const raw = (req as any).rawBody;
      event = stripe.webhooks.constructEvent(raw, stripeSignature, webhookSecret);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // ---- Checkout complete ----
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const userId = session?.metadata?.userId;
        const plan = session?.metadata?.plan as PaidPlan | undefined;
        const customerId = session?.customer as string | undefined;
        const subscriptionId = session?.subscription as string | undefined;

        if (userId) {
          await storage.ensureUserFromAuth(userId);
          await storage.updateUserBilling(userId, {
            stripeCustomerId: customerId ?? null,
            stripeSubscriptionId: subscriptionId ?? null,
            ...(plan ? { plan } : {}),
            subscriptionStatus: "active",
          });
        }
      }

      // ---- Subscription updates ----
      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.created"
      ) {
        const sub = event.data.object as any;
        const subscriptionId = sub?.id as string;
        const customerId = sub?.customer as string;
        const status = sub?.status as string;
        const currentPeriodEndUnix = sub?.current_period_end as number | undefined;

        // Determine plan from first item price
        const priceId = sub?.items?.data?.[0]?.price?.id as string | undefined;
        const plan = priceId ? planFromPriceId(priceId) : "none";

        // Find user by customer id (MVP: users table)
        const anyStorage: any = storage as any;
        const user = typeof anyStorage.getUserByStripeCustomerId === "function"
          ? await anyStorage.getUserByStripeCustomerId(customerId)
          : undefined;

        if (user?.id) {
          const effectivePlan = status === "active" || status === "trialing" ? plan : "none";
          await storage.updateUserBilling(user.id, {
            plan: effectivePlan as any,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: status,
            currentPeriodEnd: currentPeriodEndUnix
              ? new Date(currentPeriodEndUnix * 1000)
              : null,
          });
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as any;
        const customerId = sub?.customer as string;

        const anyStorage: any = storage as any;
        const user = typeof anyStorage.getUserByStripeCustomerId === "function"
          ? await anyStorage.getUserByStripeCustomerId(customerId)
          : undefined;

        if (user?.id) {
          await storage.updateUserBilling(user.id, {
            plan: "none",
            subscriptionStatus: sub?.status ?? "canceled",
          });
        }
      }

      res.json({ received: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e?.message ?? "Webhook handler failed" });
    }
  });

/* ==================== ATHLETES ==================== */

  const createAthleteSchema = z.object({
    name: z.string().min(1),
    avatarUrl: z.string().optional(),
  });

  app.get("/api/athletes", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    res.json(await storage.getAthletesByUser(userId));
  });

  app.get("/api/athletes/:athleteId", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    res.json(athlete);
  });
  app.delete("/api/athletes/:athleteId", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athleteId = req.params.athleteId;
    const athlete = await storage.getAthlete(athleteId);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    if (athlete.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const ok = await storage.deleteAthlete(athleteId);
    if (!ok) return res.status(404).json({ error: "Athlete not found" });
    res.json({ success: true });
  });


  /* ==================== ATHLETE SKILL PROGRESS ==================== */

  const upsertSkillProgressSchema = z.object({
    skillId: z.string().min(1),
    status: z.enum(["working_on", "consistent", "needs_help"]),
    notes: z.string().optional(),
  });

  app.get("/api/athletes/:athleteId/skills", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const progress = await storage.getSkillProgressByAthlete(req.params.athleteId);
    res.json(progress);
  });

  app.post("/api/athletes/:athleteId/skills", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const parsed = upsertSkillProgressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const saved = await storage.upsertSkillProgress({
      athleteId: req.params.athleteId,
      skillId: parsed.data.skillId,
      status: parsed.data.status,
      notes: parsed.data.notes,
    } as any);

    res.json(saved);
  });



  app.post("/api/athletes", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const parsed = createAthleteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    res.status(201).json(await storage.createAthlete({ userId, ...parsed.data }));
  });

  /* ==================== PROFILES ==================== */

  const createProfileSchema = z.object({
    athleteId: z.string(),
    sport: z.enum(sportTypes),
    level: z.string(),
    metadata: z.any().optional(),
  });

  app.get("/api/athletes/:athleteId/profiles", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    res.json(await storage.getProfilesByAthlete(req.params.athleteId));
  });

  // Returns one profile only if it belongs to the logged-in user.
  app.get("/api/profiles/:profileId", async (req, res) => {
    const access = await requireProfileAccess(req, res, req.params.profileId);
    if (!access) return;

    res.json(access.profile);
  });

  app.post("/api/profiles", async (req, res) => {
    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    res.status(201).json(await storage.createProfile(parsed.data));
  });


  /* ==================== SEASONS / MEETS / SCORES ==================== */

  const createSeasonSchema = z.object({
    name: z.string().min(1),
    // GymGlow is gymnastics-only for now.
    sport: z.literal("gymnastics").optional(),
    year: z.number().int().min(2000).max(2100).optional(),
  });

  app.get("/api/athletes/:athleteId/seasons", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const seasons = await storage.getSeasonsByAthleteAndSport(req.params.athleteId, "gymnastics");
    res.json(seasons);
  });

  app.post("/api/athletes/:athleteId/seasons", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const parsed = createSeasonSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const created = await storage.createSeason({
      athleteId: req.params.athleteId,
      name: parsed.data.name,
      sport: "gymnastics",
      year: parsed.data.year ?? new Date().getFullYear(),
    } as any);

    res.status(201).json(created);
  });

  app.delete("/api/seasons/:seasonId", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const season = await storage.getSeason(req.params.seasonId);
    if (!season) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(season.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Not found" });
    }

    await storage.deleteSeason(req.params.seasonId);
    res.json({ ok: true });
  });

  const createMeetSchema = z.object({
    name: z.string().min(1),
    // Accept YYYY-MM-DD or ISO datetime
    meetDate: z.string().min(4),
    location: z.string().optional(),
    notes: z.string().optional(),
  });

  function parseMeetDate(input: string): Date {
    // Date-only input from <input type="date">
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return new Date(input + "T00:00:00.000Z");
    const d = new Date(input);
    if (isNaN(d.getTime())) return new Date();
    return d;
  }

  app.get("/api/seasons/:seasonId/meets", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const season = await storage.getSeason(req.params.seasonId);
    if (!season) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(season.athleteId);
    if (!athlete || athlete.userId !== userId) return res.status(404).json({ error: "Not found" });

    const meets = await storage.getMeetsBySeason(req.params.seasonId);
    // Attach scores to each meet (UI expects this)
    const withScores = await Promise.all(
      meets.map(async (m) => ({
        ...m,
        scores: await storage.getScoresByMeet(m.id),
      })),
    );
    res.json(withScores);
  });

  app.post("/api/seasons/:seasonId/meets", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const season = await storage.getSeason(req.params.seasonId);
    if (!season) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(season.athleteId);
    if (!athlete || athlete.userId !== userId) return res.status(404).json({ error: "Not found" });

    const parsed = createMeetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const created = await storage.createMeet({
      seasonId: req.params.seasonId,
      name: parsed.data.name,
      meetDate: parseMeetDate(parsed.data.meetDate),
      location: parsed.data.location,
      notes: parsed.data.notes,
    } as any);

    res.status(201).json(created);
  });

  app.delete("/api/meets/:meetId", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const meet = await storage.getMeet(req.params.meetId);
    if (!meet) return res.status(404).json({ error: "Not found" });

    const season = await storage.getSeason(meet.seasonId);
    if (!season) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(season.athleteId);
    if (!athlete || athlete.userId !== userId) return res.status(404).json({ error: "Not found" });

    await storage.deleteMeet(req.params.meetId);
    res.json({ ok: true });
  });

  const meetScoreRowSchema = z.object({
    // Frontend uses "category" (meet_scores.category). Older UI might call it "apparatus".
    category: z.string().min(1).optional(),
    apparatus: z.string().min(1).optional(),
    // meet_scores.score is text in DB, so accept string or number from client.
    score: z.union([z.string(), z.number()]).optional(),
    placement: z.union([z.number(), z.string()]).optional(),
    notes: z.string().optional(),
  }).refine((v) => !!(v.category || v.apparatus), {
    message: "Either category or apparatus is required",
  });

  // Accept either:

  //  - [ { apparatus, score, notes? }, ... ]
  //  - { scores: [ ... ] } (what the current Meet UI sends)
  const createMeetScoresSchema = z.union([
    z.array(meetScoreRowSchema),
    z.object({ scores: z.array(meetScoreRowSchema) }),
  ]);

  app.post("/api/meets/:meetId/scores", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const meet = await storage.getMeet(req.params.meetId);
    if (!meet) return res.status(404).json({ error: "Not found" });

    const season = await storage.getSeason(meet.seasonId);
    if (!season) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(season.athleteId);
    if (!athlete || athlete.userId !== userId) return res.status(404).json({ error: "Not found" });

    const parsed = createMeetScoresSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const items = Array.isArray(parsed.data) ? parsed.data : parsed.data.scores;

    const rows = items.map((r) => ({
      meetId: req.params.meetId,
      category: (r.category ?? r.apparatus) as string,
      score: r.score == null ? null : String(r.score),
      placement:
        r.placement == null
          ? undefined
          : typeof r.placement === "number"
            ? r.placement
            : (Number(r.placement) || undefined),
      notes: r.notes,
    }));

    const created = await storage.createMeetScores(rows as any);
    res.status(201).json(created);
  });

  /* ==================== ANALYZE VIDEO ==================== */

  app.post("/api/profiles/:profileId/analyze", async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  await storage.ensureUserFromAuth(userId);
  const user = await storage.getUser(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  const canUseTrial = user.plan === "none" && (user.trialCredits ?? 0) > 0;
  const hasPaidAccess = user.plan === "coach" || user.plan === "competition";

  if (!hasPaidAccess && !canUseTrial) {
    return res.status(402).json({
      error: "Plan required",
      required: ["coach", "competition"],
      current: user.plan,
    });
  }

  const parsed = analysisRequestSchema.safeParse({
    ...req.body,
    profileId: req.params.profileId,
  });
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { profileId, videoPath, title } = parsed.data;

  const profile = await storage.getProfile(profileId);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const athlete = await storage.getAthlete(profile.athleteId);
  if (!athlete || athlete.userId !== userId) {
    return res.status(403).json({ error: "You do not have access to that profile" });
  }

  const isTrial = !hasPaidAccess && canUseTrial;

  if (!videoPathBelongsToUserProfile(videoPath, userId, profileId)) {
    return res.status(400).json({ error: "Video path does not belong to this profile." });
  }

  if (isTrial) {
    const reserved = await storage.tryConsumeTrialCredit(userId);
    if (!reserved) {
      return res.status(402).json({
        error: "Plan required",
        required: ["coach", "competition"],
        current: user.plan,
      });
    }
  }

  const session = await storage.createSession({
    profileId,
    isTrial,
    title: title || `${profile.sport} session`,
    status: "processing",
    videoUrl: videoPath,
  });

  const sessionId = session.id;
  const sportType = profile.sport as SportType;
  const athleteId = profile.athleteId;

  setImmediate(async () => {
    let tempOriginal: string | null = null;
    let tempFile: string | null = null;

    try {
      await storage.updateSession(sessionId, { status: "analyzing" });

      const { data, error } = await supabaseAdmin.storage
        .from("Videos")
        .download(videoPath);

      if (error) throw new Error(`Storage download failed: ${error.message}`);
      if (!data) throw new Error("Storage download failed: no data");

      const ext = safeVideoExtension(videoPath);
      tempOriginal = path.join(os.tmpdir(), `video_${randomUUID()}${ext}`);

      await writeSupabaseBlobToVideoFile(data, tempOriginal);

      const alreadyOptimized =
        videoPath.toLowerCase().endsWith("_optimized.mp4") ||
        videoPath.toLowerCase().includes("_optimized.");

      if (alreadyOptimized) {
        console.log("Skipping second transcode for already optimized video:", videoPath);
        tempFile = tempOriginal;
      } else {
        tempFile = await transcodeTo1080pH264Mp4(tempOriginal);
      }

      const result = await analyzeVideoFilePath(tempFile, sportType);

      result.feedback = await enrichFeedbackWithDrills(sportType, result.feedback);

      const analysis = await storage.createAnalysis({
        sessionId,
        overallScore: result.overallScore,
        summary: result.summary,
        technicalBreakdown: result.technicalBreakdown || null,
        feedback: result.feedback,
        strengths: result.strengths,
        safetyNotes: result.safetyNotes || null,
        progressionTips: result.progressionTips || null,
      });

      await storage.awardCompetitionPoints({
        athleteId,
        profileId,
        sourceType: "analysis",
        sourceId: analysis.id,
        points: 10,
        reason: "analysis_upload",
        metadata: {
          score: result.overallScore,
          sessionId,
        },
      }).catch(() => undefined);

      if (!isTrial && result.awardedBadges?.length) {
        await storage.awardBadges(
          result.awardedBadges.map((badgeType) => ({
            athleteId,
            analysisId: analysis.id,
            badgeType,
          })),
        );
        await storage
          .awardCatalogBadgesByShortNames(athleteId, result.awardedBadges)
          .catch(() => undefined);
      }
      if (!isTrial) {
        await storage
          .awardEligibleCatalogBadgesForAnalysis(athleteId, profileId, analysis.id)
          .catch((err) => console.warn("Catalog badge rule evaluation failed:", err));
      }
      await removeStoredVideo(videoPath, "analysis");
      await storage.updateSession(sessionId, { status: "ready", videoUrl: null });
    } catch (err) {
      console.error("ANALYSIS ERROR:", err);

      await removeStoredVideo(videoPath, "failed analysis").catch(() => undefined);
      await storage.updateSession(sessionId, {
        status: "error",
        videoUrl: null,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      // cleanup temp files; avoid trying to delete the same file twice when transcode is skipped
      for (const p of Array.from(new Set([tempFile, tempOriginal]))) {
        if (!p) continue;
        try {
          await fs.promises.unlink(p);
        } catch {}
      }
    }
  }); // ✅ closes setImmediate

  return res.json({ sessionId, status: "processing" });
}); // ✅ closes route

  /* ==================== SESSIONS ==================== */

  app.get("/api/sessions/:id", async (req, res) => {
    const access = await requireSessionAccess(req, res, req.params.id);
    if (!access) return;

    res.json(access.session);
  });

  app.get("/api/sessions/:id/analysis", async (req, res) => {
    const access = await requireSessionAccess(req, res, req.params.id);
    if (!access) return;

    const list = await storage.getAnalysesBySession(req.params.id);
    if (!list.length) return res.status(404).json({ error: "Not ready" });

    res.json(list[0]);
  });

  /* ==================== ANALYSES ==================== */

  app.get("/api/profiles/:profileId/analyses", async (req, res) => {
    const access = await requireProfileAccess(req, res, req.params.profileId);
    if (!access) return;

    res.json(
      await storage.getRecentAnalysesByProfile(
        req.params.profileId,
        Number(req.query.limit) || 5,
      ),
    );
  });

  app.get("/api/analyses/:id", async (req, res) => {
    const access = await requireAnalysisAccess(req, res, req.params.id);
    if (!access) return;

    res.json(access.analysis);
  });

  app.delete("/api/analyses/:id", async (req, res) => {
    const access = await requireAnalysisAccess(req, res, req.params.id);
    if (!access) return;

    if (access.session.videoUrl) {
      await removeStoredVideo(access.session.videoUrl, "deleted analysis").catch((err) => {
        console.warn("Failed to remove video for deleted analysis:", err);
      });
    }

    const deleted = await storage.deleteAnalysisResult(req.params.id);
    res.json({ success: deleted.analyses > 0, deleted });
  });

  /* ==================== BADGES ==================== */

  // DB-backed badge catalog (new system). Co-exists with legacy earned_badges.badge_type.
  app.get("/api/badges", async (req, res) => {
    const sport = (req.query.sport as string | undefined) || "gymnastics";
    const levelRaw = req.query.level as string | undefined;

    // Accept level as either a number ("3") or a gymnastics label ("Level 3").
    let levelNum: number | null = null;
    if (levelRaw) {
      const match = String(levelRaw).match(/(\d+)/);
      if (match) levelNum = Number(match[1]);
    }

    const whereClause = levelNum
      ? and(
          eq(badgesTable.sport, sport as any),
          or(isNull(badgesTable.levelMin), lte(badgesTable.levelMin, levelNum)),
          or(isNull(badgesTable.levelMax), gte(badgesTable.levelMax, levelNum)),
        )
      : eq(badgesTable.sport, sport as any);

    const rows = await db
      .select()
      .from(badgesTable)
      .where(whereClause)
      .orderBy(badgesTable.sortOrder, badgesTable.tier, badgesTable.name);

    res.json(rows);
  });

  // Athlete badge state for the DB-backed catalog.
  // NOTE: We keep compatibility by mapping legacy earned_badges.badge_type to badges.short_name/name.
  app.get("/api/athletes/:athleteId/badge-progress", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athleteId = req.params.athleteId;
    const athlete = await storage.getAthlete(athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const sport = (req.query.sport as string | undefined) || "gymnastics";
    const levelRaw = req.query.level as string | undefined;

    let levelNum: number | null = null;
    if (levelRaw) {
      const match = String(levelRaw).match(/(\d+)/);
      if (match) levelNum = Number(match[1]);
    }

    const catalogWhere = levelNum
      ? and(
          eq(badgesTable.sport, sport as any),
          or(isNull(badgesTable.levelMin), lte(badgesTable.levelMin, levelNum)),
          or(isNull(badgesTable.levelMax), gte(badgesTable.levelMax, levelNum)),
        )
      : eq(badgesTable.sport, sport as any);

    const catalog = await db.select().from(badgesTable).where(catalogWhere);

    // Pull legacy earned badges (badge_type strings).
    const earnedLegacy = await storage.getBadgesByAthlete(athleteId);
    const earnedStrings = new Set(
      earnedLegacy.map((b) => String(b.badgeType).toLowerCase()),
    );

    const earnedBadgeIds: string[] = [];

    const normalizeKey = (s: string) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    for (const b of catalog) {
      const shortRaw = String(b.shortName || "").toLowerCase();
      const nameRaw = String(b.name || "").toLowerCase();

      const shortKey = normalizeKey(b.shortName || "");
      const nameKey = normalizeKey(b.name || "");

      if (shortKey && earnedStrings.has(shortKey)) earnedBadgeIds.push(String(b.id));
      else if (shortRaw && earnedStrings.has(shortRaw)) earnedBadgeIds.push(String(b.id));
      else if (nameKey && earnedStrings.has(nameKey)) earnedBadgeIds.push(String(b.id));
      else if (nameRaw && earnedStrings.has(nameRaw)) earnedBadgeIds.push(String(b.id));
    }

    const progressRows = await db
      .select()
      .from(badgeProgressTable)
      .where(eq(badgeProgressTable.athleteId, athleteId));

    res.json({
      earnedBadgeIds,
      progress: progressRows,
    });
  });

  app.get("/api/athletes/:athleteId/badges", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const athlete = await storage.getAthlete(req.params.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    res.json(await storage.getBadgesByAthlete(req.params.athleteId));
  });

  app.get("/api/analyses/:id/badges", async (req, res) => {
    const access = await requireAnalysisAccess(req, res, req.params.id);
    if (!access) return;

    res.json(await storage.getBadgesByAnalysis(req.params.id));
  });

  /* ==================== DRILLS ==================== */

  app.get("/api/drills", async (req, res) => {
    const { sport, difficulty, ids } = req.query;

    // Batch fetch by ids: /api/drills?ids=id1,id2,id3
    if (ids && typeof ids === "string") {
      const idList = ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!idList.length) return res.json([]);
      return res.json(await storage.getDrillsByIds(idList));
    }

    if (sport) return res.json(await storage.getDrillsBySport(sport as SportType));
    if (difficulty)
      return res.json(await storage.getDrillsByDifficulty(difficulty as any));

    res.json(await storage.getAllDrills());
  });

  app.get("/api/drills/:id", async (req, res) => {
    const drill = await storage.getDrill(req.params.id);
    if (!drill) return res.status(404).json({ error: "Not found" });
    res.json(drill);
  });

  /* ==================== WEEKLY CHALLENGES ==================== */

  /* ==================== SKILLS ==================== */

  app.get("/api/skills", async (req, res) => {
    const sport = req.query.sport as SportType | undefined;
    const levelRaw = req.query.level as string | undefined;
    const level = levelRaw ? Number(levelRaw) : undefined;

    if (sport && Number.isFinite(level)) {
      return res.json(await storage.getSkillsBySportAndLevel(sport, level as number));
    }
    if (sport) return res.json(await storage.getSkillsBySport(sport));
    if (Number.isFinite(level)) return res.json(await storage.getSkillsByLevel(level as number));
    return res.json(await storage.getAllSkills());
  });

  app.get("/api/skills/:id", async (req, res) => {
    const skill = await storage.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ error: "Not found" });
    res.json(skill);
  });

  app.get("/api/skills/:id/drills", async (req, res) => {
    const skill = await storage.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ error: "Not found" });
    const drills = await storage.getDrillsForSkill(req.params.id);
    res.json(drills);
  });


  function getWeekWindowSunday(now: Date) {
    const weekStart = new Date(now);
    // Sunday = 0
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setMilliseconds(weekEnd.getMilliseconds() - 1); // end of Saturday 23:59:59.999

    return { weekStart, weekEnd };
  }

  async function ensureWeeklyChallengesExist(): Promise<void> {
  const now = new Date();

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay());

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const sport = "gymnastics";
  const baseDifficulty = "beginner";

  const existing = await storage.getChallengesBySport(sport);
  const activeThisWeek = existing.filter((c: any) => {
    const start = c.startDate ? new Date(c.startDate) : null;
    const end = c.endDate ? new Date(c.endDate) : null;

    if (!start || !end) return false;

    return start.getTime() === weekStart.getTime() && end.getTime() === weekEnd.getTime();
  });

  if (activeThisWeek.length >= 3) {
    return;
  }

  const templates = [
    {
      name: "Handstand Hold Challenge (3s)",
      description: "Show control and alignment in a handstand hold.",
      instructions:
        "Upload your best handstand hold. Aim for straight arms, tight legs, and a steady finish.",
      targetSkillId: "skill_handstand",
    },
    {
      name: "Cartwheel Lines Challenge",
      description: "Clean lines and control through a cartwheel.",
      instructions:
        "Upload your best cartwheel. Focus on straight arms, body alignment, and a strong lunge finish.",
      targetSkillId: "skill_cartwheel",
    },
    {
      name: "Stick the Landing Challenge",
      description: "Quiet, controlled landing—no extra steps.",
      instructions:
        "Upload a straight jump with a stick. Land softly with control: knees over toes, chest up, no steps.",
      targetSkillId: "skill_straight_jump",
    },
  ] as const;

  for (const t of templates) {
    const alreadyExists = activeThisWeek.some(
      (c: any) =>
        c.name === t.name &&
        new Date(c.startDate).getTime() === weekStart.getTime() &&
        new Date(c.endDate).getTime() === weekEnd.getTime()
    );

    if (alreadyExists) {
      continue;
    }

    await storage.createChallenge({
      name: t.name,
      description: t.description,
      instructions: t.instructions,
      targetSkillId: t.targetSkillId,
      sport,
      difficulty: baseDifficulty,
      startDate: weekStart,
      endDate: weekEnd,
      isActive: true,
    } as any);
  }
}

  app.get("/api/challenges", async (req, res) => {
    const active = String(req.query.active || "").toLowerCase() === "true";
    await ensureWeeklyChallengesExist();

    if (active) {
      const all = await storage.getActiveChallenges();
      const seen = new Set<string>();
      const gym = all.filter((c) => {
        if (c.sport !== "gymnastics") return false;
        const key = c.targetSkillId || c.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 3);
      return res.json(gym);
    }
    res.json(await storage.getAllChallenges());
  });

  app.get("/api/challenges/:id", async (req, res) => {
    const challenge = await storage.getChallenge(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Not found" });
    res.json(challenge);
  });

  const submitChallengeSchema = z.object({
    athleteId: z.string(),
    profileId: z.string(),
    skillId: z.string().optional(),
    videoPath: z.string().min(1),
  });

  app.post("/api/challenges/:id/submit", async (req, res) => {
    const auth = await requirePlan(req, res, ["coach", "competition"]);
    if (!auth) return;

    const challenge = await storage.getChallenge(req.params.id);
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });

    if (hasInlineVideoPayload(req.body)) {
      return res.status(413).json({
        error: "Inline video payloads are no longer accepted. Upload the file to Supabase Storage first, then send only videoPath.",
        code: "INLINE_VIDEO_NOT_ALLOWED",
      });
    }

    const parsed = submitChallengeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const { athleteId, profileId, videoPath, skillId } = parsed.data;

    const athlete = await storage.getAthlete(athleteId);
    if (!athlete || athlete.userId !== auth.userId) {
      return res.status(403).json({ error: "You do not have access to that athlete." });
    }

    const profile = await storage.getProfile(profileId);
    if (!profile || profile.athleteId !== athleteId) {
      return res.status(400).json({ error: "Profile does not belong to the selected athlete." });
    }

    if (!videoPathBelongsToUserProfile(videoPath, auth.userId, profileId)) {
      return res.status(400).json({ error: "Video path does not belong to this profile." });
    }

    // Challenge must be configured with a target skill (GymGlow v1)
    if (!challenge.targetSkillId) {
      return res.status(400).json({ error: "Challenge is missing target skill configuration." });
    }

    // Validate submission skill matches target
    if (skillId && skillId !== challenge.targetSkillId) {
      const requiredSkill = await storage.getSkill(challenge.targetSkillId);
      return res.status(400).json({ error: `This challenge requires: ${requiredSkill?.name ?? "the required skill"}. Please upload that skill.` });
    }


    // Enforce: 1 successful/active attempt per weekly challenge.
    // If a previous attempt errored, allow re-try until a non-error submission exists.
    const { weekStart, weekEnd } = getWeekWindowSundayFor(new Date());
    const existingNonError = await db
      .select({ id: submissionsTable.id })
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.profileId, profileId),
          eq(submissionsTable.athleteId, athleteId),
          eq(submissionsTable.challengeId, challenge.id),
          gte(submissionsTable.submittedAt, weekStart),
          lte(submissionsTable.submittedAt, weekEnd),
          sql`${submissionsTable.status} <> 'error'`,
        ),
      )
      .limit(1);

    if (existingNonError.length > 0) {
      return res.status(409).json({ error: "You already used your attempt for this weekly challenge." });
    }

    const submission = await storage.createChallengeSubmission({
      challengeId: challenge.id,
      athleteId,
      profileId,
      skillId: challenge.targetSkillId,
      videoUrl: videoPath ?? null,
      status: "analyzing",
      feedback: null,
      score: null,
      sessionId: null,
    } as any);

    // Process async
    setImmediate(async () => {
      let tempOriginal: string | null = null;
      let tempFile: string | null = null;
      try {
        const ext = safeVideoExtension(videoPath);
        tempOriginal = path.join(os.tmpdir(), `challenge_${randomUUID()}${ext}`);

        const { data, error } = await supabaseAdmin.storage
          .from("Videos")
          .download(videoPath);

        if (error) throw new Error(`Storage download failed: ${error.message}`);
        if (!data) throw new Error("Storage download failed: no data");

        await writeSupabaseBlobToVideoFile(data, tempOriginal);

        tempFile = await transcodeTo1080pH264Mp4(tempOriginal);

        const sport = challenge.sport as SportType;
        const requiredSkill = await storage.getSkill(challenge.targetSkillId!);

        // Challenge-specific analysis with an eligibility gate.
        // This prevents "forcing" feedback to the challenge skill when the uploaded
        // video is actually a different skill.
        const gated = await analyzeChallengeVideoFilePath(tempFile, sport, {
          challengeName: challenge.name,
          challengeInstructions: challenge.instructions ?? undefined,
          targetSkillName: requiredSkill?.name ?? challenge.name,
          targetSkillDescription: (requiredSkill as any)?.description ?? undefined,
        });

        if (!gated.isMatch) {
          const candidatesLine = Array.isArray((gated as any).detectedSkillCandidates) && (gated as any).detectedSkillCandidates.length
            ? `Possible: ${(gated as any).detectedSkillCandidates.join(" / ")}\n`
            : "";
          await storage.updateChallengeSubmission(submission.id, {
            status: "ineligible" as any,
            score: null,
            feedback:
              `Not eligible for this challenge.\n` +
              `Detected: ${gated.detectedSkill} (confidence ${(gated.confidence * 100).toFixed(0)}%).\n` +
              candidatesLine +
              `\n` +
              `${gated.feedback}`,
          } as any);
          return;
        }

        const overallScore = gated.score ?? 0;

        // Score formula: blend overallScore + "improvement" bump based on recent best.
        const recent = await db
          .select({ score: submissionsTable.score })
          .from(submissionsTable)
          .where(
            and(
              eq(submissionsTable.athleteId, athleteId),
              eq(submissionsTable.challengeId, challenge.id),
              eq(submissionsTable.status, "scored"),
            ),
          )
          .orderBy(submissionsTable.submittedAt)
          .limit(5);

        const priorBest = Math.max(0, ...recent.map((r) => r.score || 0));
        const improvement = Math.max(0, overallScore - priorBest);
        const tieBreaker = Math.round((improvement * 10) + (overallScore / 10));
        const finalScore = Math.min(100, Math.max(0, Math.round(overallScore + improvement * 0.15)));

        await storage.updateChallengeSubmission(submission.id, {
          status: "scored",
          score: finalScore,
          feedback:
            `Challenge Skill: ${requiredSkill?.name ?? challenge.name}\n` +
            `Detected: ${gated.detectedSkill} (confidence ${(gated.confidence * 100).toFixed(0)}%).\n` +
            ((Array.isArray((gated as any).detectedSkillCandidates) && (gated as any).detectedSkillCandidates.length)
              ? `Possible: ${(gated as any).detectedSkillCandidates.join(" / ")}\n\n`
              : `\n`) +
            `Coach Notes: ${gated.feedback}\n\n` +
            `Tie-breaker: ${tieBreaker}`,
        } as any);

        await storage.awardCompetitionPoints({
          athleteId,
          profileId,
          sourceType: "challenge",
          sourceId: challenge.id,
          points: 50,
          reason: "challenge_submission",
          metadata: {
            submissionId: submission.id,
            score: finalScore,
            status: "scored",
          },
        }).catch(() => undefined);

        await storage
          .awardCatalogBadgesByShortNames(athleteId, ["crimson_challenger"])
          .catch(() => undefined);

        const challengeScoreBonus = Math.floor(finalScore / 10) * 5;
        if (challengeScoreBonus > 0) {
          await storage.awardCompetitionPoints({
            athleteId,
            profileId,
            sourceType: "challenge",
            sourceId: challenge.id,
            points: challengeScoreBonus,
            reason: "challenge_score_bonus",
            metadata: {
              submissionId: submission.id,
              score: finalScore,
              status: "scored",
            },
          }).catch(() => undefined);
        }
      } catch (err: any) {
        await storage.updateChallengeSubmission(submission.id, {
          status: "error",
          videoUrl: null,
          feedback: err?.message || "Challenge analysis failed",
        } as any);
      } finally {
        await removeStoredVideo(videoPath, "challenge").catch(() => undefined);
        await storage.updateChallengeSubmission(submission.id, {
          videoUrl: null,
        } as any).catch(() => undefined);

        for (const p of Array.from(new Set([tempFile, tempOriginal]))) {
          if (!p) continue;
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
    });

    res.status(201).json({ submissionId: submission.id, status: "analyzing" });
  });

  app.get("/api/submissions/:id", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const submission = await storage.getChallengeSubmission(req.params.id);
    if (!submission) return res.status(404).json({ error: "Not found" });

    const athlete = await storage.getAthlete(submission.athleteId);
    if (!athlete || athlete.userId !== userId) {
      return res.status(403).json({ error: "You do not have access to that submission" });
    }

    res.json(submission);
  });

  // Anonymous leaderboard: returns rank entries with display names like "GymGlow Star #123".
  
  // Weekly combined leaderboard (one leaderboard button in the app).
  // Points are computed live from challenge submissions for the current week window (Sunday-Saturday).
  app.get("/api/leaderboard/weekly", async (req, res) => {
    const userId = requireUserId(req, res);
    if (!userId) return;

    await storage.ensureUserFromAuth(userId);
    const user = await storage.getUser(userId);

    const profileId = String(req.query.profileId || "");
    if (!profileId) return res.status(400).json({ error: "Missing profileId" });

    const { weekStart, weekEnd } = getWeekWindowSundayFor(new Date());

    const rows = await storage.getWeeklyLeaderboard(profileId, weekStart, weekEnd);

    const entries = rows.map((row, idx) => {
      const n = hashToNumber(row.athleteId) % 10000;
      return {
        rank: idx + 1,
        points: row.points,
        challengesCompleted: row.challengesCompleted,
        aiBonus: row.aiBonus,
        displayName: `GymGlow Star #${String(n).padStart(4, "0")}`,
      };
    });

    const locked = user?.plan !== "competition";
    if (locked) {
      const preview = entries.slice(0, 10).map((e: any) => ({
        rank: e.rank,
        displayName: e.displayName,
      }));
      return res.json({
        locked: true,
        weekStart,
        weekEnd,
        totalWeeklyChallenges: 3,
        preview,
      });
    }

    res.json({
      weekStart,
      weekEnd,
      totalWeeklyChallenges: 3,
      entries,
    });
  });


// Points Hub: explains how points add up for a specific athlete within the current weekly window.
// This is intentionally separate from the leaderboard (which should stay simple: total points only).
app.get("/api/points/hub", async (req, res) => {
  const profileId = String(req.query.profileId || "");
  const athleteId = String(req.query.athleteId || "");
  if (!profileId) return res.status(400).json({ error: "Missing profileId" });
  if (!athleteId) return res.status(400).json({ error: "Missing athleteId" });

  const access = await requireProfileAccess(req, res, profileId);
  if (!access) return;

  if (access.athlete.id !== athleteId) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const { weekStart, weekEnd } = getWeekWindowSundayFor(new Date());
  const hub = await storage.getPointsHub(profileId, athleteId, weekStart, weekEnd);

  res.json({
    weekStart,
    weekEnd,
    ...hub,
  });
});

app.get("/api/challenges/:id/leaderboard", async (req, res) => {
    const challengeId = req.params.id;
    const leaderboard = await storage.getChallengeLeaderboard(challengeId);

    const anon = leaderboard.map((row, idx) => ({
      rank: idx + 1,
      score: row.submission.score,
      submittedAt: row.submission.submittedAt,
      displayName: `GymGlow Star #${String((idx + 1) * 137).padStart(3, "0")}`,
    }));

    res.json(anon);
  });

  /* ==================== COMPETITION MODE: END OF WEEK RESULTS ==================== */

  function hashToNumber(input: string) {
    // Simple stable hash for anonymous naming (not security-related)
    let h = 0;
    for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
    return h;
  }

  function getWeekWindowSundayFor(date: Date) {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setMilliseconds(weekEnd.getMilliseconds() - 1);
    return { weekStart, weekEnd };
  }

  function buildCoachRecap(opts: {
    isCompWeek: boolean;
    cycleWeek: number;
    your: null | { rank: number; percentile: number | null; avgTop2: number; best: number; second: number };
  }) {
    const { isCompWeek, cycleWeek, your } = opts;

    // Keep it short, uplifting, and kid-friendly. No shame language.
    if (!isCompWeek) {
      return "Training week — keep practicing and try to upload again. Your results screen will light up after Comp Week.";
    }

    if (!your) {
      return "No scored uploads last week. That’s okay — your next upload is your next chance. Try to post 2 videos during Comp Week so you’re on the board.";
    }

    const p = your.percentile;
    const avg = Math.round(your.avgTop2 * 10) / 10;

    if (p !== null && p >= 80) {
      return `Awesome week. Your best 2 uploads averaged ${avg}. Keep doing what you’re doing — stay confident and repeat your best habits.`;
    }
    if (p !== null && p >= 50) {
      return `Good progress. Your best 2 uploads averaged ${avg}. You’re getting more consistent — focus on clean reps and keep it tight.`;
    }
    // Lower percentile: still positive + actionable.
    return `Great effort showing up. Your best 2 uploads averaged ${avg}. Pick 1 small focus and try it every rep — that’s how you level up.`;
  }


  function getCycleWeek(profileCreatedAt: Date, weekStart: Date) {
    const start = new Date(profileCreatedAt);
    start.setHours(0, 0, 0, 0);
    const target = new Date(weekStart);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const weekInCycle = ((diffWeeks % 6) + 6) % 6; // 0..5
    return weekInCycle + 1; // 1..6
  }

  // Lightweight status endpoint used by the Badges page (to show Crimson filter only on Comp Week)
  app.get("/api/competition/status", async (req, res) => {
    const profileId = String(req.query.profileId || "");
    if (!profileId) return res.status(400).json({ error: "profileId is required" });

    const access = await requireProfileAccess(req, res, profileId);
    if (!access) return;
    const { profile } = access;

    const now = new Date();
    const { weekStart, weekEnd } = getWeekWindowSundayFor(now);

    const profileCreatedAt = (profile.createdAt instanceof Date)
      ? profile.createdAt
      : new Date(profile.createdAt as any);

    const cycleWeek = getCycleWeek(profileCreatedAt, weekStart);
    const isCompWeek = cycleWeek === 3 || cycleWeek === 6;

    res.json({
      weekStart,
      weekEnd,
      weekInCycle: cycleWeek,
      isCompWeek,
    });
  });

  app.get("/api/competition/results", async (req, res) => {
    const profileId = String(req.query.profileId || "");
    const viewerAthleteId = String(req.query.viewerAthleteId || "");

    if (!profileId) return res.status(400).json({ error: "profileId is required" });

    const access = await requireProfileAccess(req, res, profileId);
    if (!access) return;
    const { profile } = access;

    if (viewerAthleteId && viewerAthleteId !== profile.athleteId) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Results are always for the *last completed* week.
    const now = new Date();
    const { weekStart: thisWeekStart } = getWeekWindowSundayFor(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const { weekStart, weekEnd } = getWeekWindowSundayFor(lastWeekStart);

    const profileCreatedAt = (profile.createdAt instanceof Date)
      ? profile.createdAt
      : new Date(profile.createdAt as any);

    const cycleWeek = getCycleWeek(profileCreatedAt, weekStart);
    const isCompWeek = cycleWeek === 3 || cycleWeek === 6;

    // If it wasn't a comp week, still return a friendly response (so UI can show "Training week")
    if (!isCompWeek) {
      return res.json({
        weekStart,
        weekEnd,
        cycleWeek,
        isCompWeek: false,
        message: "Training week — results show after Comp Week.",
        coachRecap: buildCoachRecap({ isCompWeek: false, cycleWeek, your: null }),
      });
    }

    // Query all analyses for cohort within last week
    const rows = await db
      .select({
        athleteId: sportProfilesTable.athleteId,
        profileId: sportProfilesTable.id,
        analysisId: analysesTable.id,
        score: analysesTable.overallScore,
        createdAt: analysesTable.createdAt,
      })
      .from(analysesTable)
      .innerJoin(sessionsTable, eq(analysesTable.sessionId, sessionsTable.id))
      .innerJoin(sportProfilesTable, eq(sessionsTable.profileId, sportProfilesTable.id))
      .where(
        and(
          eq(sportProfilesTable.sport, profile.sport),
          eq(sportProfilesTable.level, profile.level),
          gte(analysesTable.createdAt, weekStart),
          lte(analysesTable.createdAt, weekEnd),
        ),
      );

    // Build per-athlete top2
    const byAthlete = new Map<string, { scores: number[]; items: { score: number; createdAt: Date }[] }>();
    for (const r of rows) {
      const aId = r.athleteId;
      if (!aId) continue;
      const createdAt = (r.createdAt instanceof Date) ? r.createdAt : new Date(r.createdAt as any);
      const entry = byAthlete.get(aId) || { scores: [], items: [] };
      entry.scores.push(r.score);
      entry.items.push({ score: r.score, createdAt });
      byAthlete.set(aId, entry);
    }

    const leaderboard = Array.from(byAthlete.entries())
      .map(([athleteId, v]) => {
        const sorted = v.items.sort((a, b) => b.score - a.score);
        const top2 = sorted.slice(0, 2);
        const topScores = top2.map((x) => x.score);
        const avgTop2 = topScores.length ? (topScores.reduce((a, b) => a + b, 0) / topScores.length) : 0;
        const best = topScores[0] || 0;
        const second = topScores[1] || 0;
        return { athleteId, avgTop2, best, second, top2 };
      })
      .filter((x) => x.best > 0)
      .sort((a, b) => (b.avgTop2 - a.avgTop2) || (b.best - a.best) || (b.second - a.second));

    const top10 = leaderboard.slice(0, 10).map((row, idx) => {
      const n = hashToNumber(row.athleteId) % 9000;
      const displayName = `Glow Star #${String(n).padStart(4, "0")}`;
      return {
        rank: idx + 1,
        displayName,
        avgTop2: Math.round(row.avgTop2 * 10) / 10,
        best: row.best,
        second: row.second,
      };
    });

    const viewerRowIdx = viewerAthleteId
      ? leaderboard.findIndex((r) => r.athleteId === viewerAthleteId)
      : leaderboard.findIndex((r) => r.athleteId === profile.athleteId);

    const viewerRow = viewerRowIdx >= 0 ? leaderboard[viewerRowIdx] : null;
    const rank = viewerRowIdx >= 0 ? viewerRowIdx + 1 : null;
    const total = leaderboard.length;
    const percentile = rank ? Math.round(((total - rank) / Math.max(1, total)) * 100) : null;

    
    const coachRecap = buildCoachRecap({
      isCompWeek: true,
      cycleWeek,
      your: viewerRow
  ? {
      rank: viewerRowIdx + 1,
      percentile,
      avgTop2: viewerRow.avgTop2,
      best: viewerRow.best,
      second: viewerRow.second,
    }
  : null,
    });

res.json({
      weekStart,
      weekEnd,
      cycleWeek,
      isCompWeek: true,
      totalPlayers: total,
      your: viewerRow
        ? {
            rank,
            percentile,
            avgTop2: Math.round(viewerRow.avgTop2 * 10) / 10,
            best: viewerRow.best,
            second: viewerRow.second,
            top2: viewerRow.top2.map((x) => ({
              score: x.score,
              createdAt: x.createdAt,
            })),
          }
        : null,
      top10,
      message: viewerRow
        ? (rank === 1 ? "🏆 You took #1 this week!" : `You finished #${rank} this week.`)
        : "No uploads counted this week.",
      coachRecap,
    });
  });

  /* ==================== DONE ==================== */

  return httpServer;
}
