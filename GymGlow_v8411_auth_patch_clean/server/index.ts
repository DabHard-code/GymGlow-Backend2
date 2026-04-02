import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { pool } from "./db";

// Some branches renamed seed helpers (e.g., seedSkillsLibraryIfEmpty vs seedSkillsIfEmpty).
// Keep startup resilient across versions so local changes don't break boot.
// Lightweight DB column upgrades (keeps local/dev environments resilient without migrations).
async function ensureDbUpgrades(): Promise<void> {
  try {
    // Trial credit for one-time AI feedback
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_credits integer NOT NULL DEFAULT 1;`);
    // Stripe subscription metadata
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id text;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive';`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end timestamp;`);
    // Mark sessions that were run as a trial (so we can keep them out of points/badges/etc.)
    await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;`);
  } catch (e) {
    console.warn("⚠️ DB upgrade step failed (safe to ignore if already applied):", e);
  }
}

async function callSeed(label: string, fnNames: string[]): Promise<void> {
  const anyStorage: any = storage as any;
  const fnName = fnNames.find((n) => typeof anyStorage?.[n] === "function");

  if (!fnName) {
    console.warn(`⚠️ ${label}: no compatible seed method found (${fnNames.join(", ")}). Skipping.`);
    return;
  }

  await anyStorage[fnName]();
}


const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "100mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "100mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ----------------------------
// ✅ HEALTH CHECK ENDPOINT
// ----------------------------
app.get("/api/health", (req: Request, res: Response) => {
  const key = process.env.OPENAI_API_KEY;
  res.json({
    status: "ok",
    time: Date.now(),
    environment: process.env.NODE_ENV || "development",
    openaiKeyPresent: Boolean(key),
    openaiKeyLength: key ? key.length : 0,
  });
});


(async () => {
  try {
  // Register API routes
  await registerRoutes(httpServer, app);

  // In development, serve the client via Vite middleware mode so http://localhost:5000/ works.
  // In production, serve the built client from server/public.
  if ((process.env.NODE_ENV || "development") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  } else {
    serveStatic(app);
  }

    // 0) Ensure small schema upgrades
    await ensureDbUpgrades();

    // 1) Seed demo data
    console.log("Seeding demo data...");
    await storage.seedDemoDataIfEmpty();
    console.log("Demo data seeded successfully");

    // 2) Seed skills – log errors but DO NOT crash server
    try {
      console.log("Seeding skills...");
      await callSeed("Skills seed", [
        "seedSkillsIfEmpty",
        "seedSkillsLibraryIfEmpty",
        "seedSkills",
      ]);
      console.log("Skills seeded successfully");
    } catch (error) {
      console.error("❌ Error seeding skills:", error);
    }

    // 3) Seed drills – log errors but DO NOT crash server
    try {
      console.log("Seeding drill library...");
      await storage.seedDrillsIfEmpty();
      console.log("Drill library seeded successfully");
    } catch (error) {
      console.error("❌ Error seeding drill library:", error);
    }

    // 4) Seed challenges – log errors but DO NOT crash server
    try {
      console.log("Seeding challenges...");
      await callSeed("Challenges seed", [
        "seedChallengesIfEmpty",
        "seedChallengeLibraryIfEmpty",
        "seedChallenges",
      ]);
      console.log("Challenges seeded successfully");
    } catch (error) {
      console.error("❌ Error seeding challenges:", error);
    }
    // 7) Start server
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port }, () => {
      console.log(`✅ Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("❌ Fatal error during startup:", error);
    process.exit(1);
  }
})();

