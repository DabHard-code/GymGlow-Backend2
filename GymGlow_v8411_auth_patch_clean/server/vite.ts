import type { Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const clientRoot = path.resolve(projectRoot, "client");

  const vite = await createViteServer({
    root: clientRoot,
    configFile: false, // ✅ do NOT load ../vite.config.ts
    appType: "custom",

    resolve: {
      alias: {
        "@": path.resolve(clientRoot, "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },

    server: {
      middlewareMode: true,
      hmr: { server, path: "/vite-hmr" },
      allowedHosts: true as const,
      fs: {
        allow: [projectRoot], // ✅ allow imports from /shared
      },
    },

    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();

    try {
      const url = req.originalUrl;
      const clientTemplate = path.resolve(clientRoot, "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}