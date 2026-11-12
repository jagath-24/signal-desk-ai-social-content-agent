import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createPosts, getPost, listCalendarPosts, listPosts, markDuePosts, updatePost } from "../db";
import { generateVariants } from "../contentGeneration";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/content/generate", async (req, res) => {
    try {
      const topic = String(req.body?.topic ?? "").trim();
      const platform = req.body?.platform ?? "LinkedIn";
      if (topic.length < 3) return res.status(400).json({ error: "topic must be at least 3 characters" });
      const generated = await generateVariants(topic);
      const posts = await createPosts(generated.variants.map((variant) => ({ ...variant, topic, platform, status: "draft" as const })));
      res.json({ provider: generated.provider, posts });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "generation failed" });
    }
  });
  app.get("/api/content/queue", async (req, res) => {
    try { res.json(await listPosts(req.query.status ? String(req.query.status) as any : undefined)); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "queue failed" }); }
  });
  app.put("/api/content/:id/approve", async (req, res) => {
    try { const post = await updatePost(Number(req.params.id), { status: "approved", copy: req.body?.copy }); res.json(post); }
    catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "approval failed" }); }
  });
  app.post("/api/content/:id/schedule", async (req, res) => {
    try {
      const existing = await getPost(Number(req.params.id));
      if (!existing) return res.status(404).json({ error: "post not found" });
      if (!["approved", "scheduled"].includes(existing.status)) return res.status(409).json({ error: "approve before scheduling" });
      const post = await updatePost(existing.id, { status: "scheduled", scheduledAt: new Date(req.body?.scheduledAt), platform: req.body?.platform ?? existing.platform });
      res.json(post);
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "scheduling failed" }); }
  });
  app.get("/api/content/calendar", async (req, res) => {
    try {
      const now = new Date();
      const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
      res.json(await listCalendarPosts(from, to));
    } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : "calendar failed" }); }
  });
  app.post("/api/scheduled/dispatch", async (_req, res) => {
    try {
      const processed = await markDuePosts(new Date());
      res.json({ ok: true, processed, mode: "simulated" });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "dispatcher failed" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
