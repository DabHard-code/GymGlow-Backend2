console.log("VITE CONFIG LOADED ✅");
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async ({ mode }) => {
  const plugins: any[] = [react()];

  // Replit dev-only overlay plugin (breaks production/Node 22 ESM in some environments)
  if (mode !== "production" && (process.env.NODE_ENV || "development") === "development") {
    try {
      const mod: any = await import("@replit/vite-plugin-runtime-error-modal");
      const runtimeErrorOverlay = mod?.default ?? mod;
      if (typeof runtimeErrorOverlay === "function") {
        plugins.push(runtimeErrorOverlay());
      }
    } catch {
      // Ignore if not installed (safe for prod)
    }
  }

  return {
    plugins,

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },

    root: path.resolve(__dirname, "client"),

    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
          },
        },
      },
    },

    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});

