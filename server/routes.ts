import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, tokenAuth, hashPassword, verifyPassword } from "./auth";
import { insertProjectSchema, insertUserSchema, insertContactSchema, insertAnnouncementSchema } from "@shared/schema";
import passport from "passport";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

// Resolve a project by internal projectId OR by name + owner username
async function resolveProject(identifier: string, ownerUsername?: string): Promise<import("@shared/schema").Project | undefined> {
  // Try by internal projectId first (e.g. projXXXX)
  let project = await storage.getProjectByProjectId(identifier);
  if (project) return project;

  // Fall back to name + owner lookup
  if (ownerUsername) {
    const owner = await storage.getUserByUsername(ownerUsername.toLowerCase());
    if (owner) {
      const userProjects = await storage.getProjectsByUser(owner.id);
      return userProjects.find(p => p.name.toLowerCase() === identifier.toLowerCase());
    }
  }
  return undefined;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  app.use(tokenAuth);

  app.get("/cli/index.js", (req, res) => {
    const cliPath = path.join(process.cwd(), "cli", "index.js");
    if (fs.existsSync(cliPath)) {
      res.setHeader("Content-Disposition", 'attachment; filename="vpush.js"');
      res.setHeader("Content-Type", "application/javascript");
      res.sendFile(cliPath);
    } else {
      res.status(404).json({ message: "CLI not found" });
    }
  });

  app.get("/api/auth/check-username/:username", async (req, res) => {
    try {
      const username = req.params.username.toLowerCase().trim();
      if (username.length < 3) return res.json({ available: false, reason: "Too short" });
      if (!/^[a-z0-9_-]+$/.test(username)) return res.json({ available: false, reason: "Only lowercase letters, numbers, hyphens, underscores" });
      const existing = await storage.getUserByUsername(username);
      return res.json({ available: !existing, reason: existing ? "Already taken" : null });
    } catch (err: any) {
      return res.status(500).json({ available: false, reason: "Error checking" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (!/^[a-z0-9_-]+$/.test(username.toLowerCase())) {
        return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, hyphens, and underscores" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }
      const existing = await storage.getUserByUsername(username.toLowerCase());
      if (existing) {
        return res.status(400).json({ message: "Username already taken" });
      }
      const role = username.toLowerCase() === "idledev" ? "admin" : "user";
      const user = await storage.createUser({ username: username.toLowerCase(), email, password });
      if (role === "admin") {
        const { db } = await import("./db");
        const { users } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
        (user as any).role = "admin";
      }
      await storage.createNotification(user.id, "Welcome to VPush!", "Your account has been created. Start by creating your first project.", "system");

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        return res.json({ id: user.id, username: user.username, displayName: user.displayName, role: (user as any).role || "user" });
      });
    } catch (err: any) {
      if (err.message?.includes("users_email_unique")) {
        return res.status(400).json({ message: "Email already registered" });
      }
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.user && !req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    return res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role, totpEnabled: user.totpEnabled });
  });

  app.post("/api/auth/token", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { name } = req.body;
      const tokenName = (name || "CLI Token").trim().slice(0, 100);
      const { randomBytes } = await import("crypto");
      const rawToken = "vpush_" + randomBytes(32).toString("hex");
      const apiToken = await storage.createApiToken(user.id, tokenName, rawToken);
      return res.json({ id: apiToken.id, name: apiToken.name, token: rawToken, createdAt: apiToken.createdAt });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/tokens", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const tokens = await storage.getApiTokensByUser(user.id);
      return res.json(tokens.map(t => ({
        id: t.id,
        name: t.name,
        tokenPreview: t.token.slice(0, 10) + "..." + t.token.slice(-4),
        lastUsed: t.lastUsed,
        createdAt: t.createdAt,
      })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/auth/tokens/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.deleteApiToken(req.params.id, user.id);
      return res.json({ message: "Token deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp/setup", requireAuth, async (req, res) => {
    try {
      const { generateSecret, generateURI } = await import("otplib");
      const QRCode = await import("qrcode");
      const user = req.user as any;
      const secret = generateSecret();
      await storage.setTotpSecret(user.id, secret);
      const otpauth = generateURI({ type: "totp", issuer: "VPush", label: user.username, secret });
      const qrDataUrl = await QRCode.toDataURL(otpauth);
      return res.json({ secret, qrCode: qrDataUrl });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp/verify", requireAuth, async (req, res) => {
    try {
      const { verifySync } = await import("otplib");
      const user = req.user as any;
      const fullUser = await storage.getUser(user.id);
      if (!fullUser?.totpSecret) return res.status(400).json({ message: "TOTP not set up" });
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code required" });
      const isValid = verifySync({ token: code, secret: fullUser.totpSecret });
      if (!isValid) return res.status(400).json({ message: "Invalid code" });
      await storage.enableTotp(user.id);
      return res.json({ message: "Two-factor authentication enabled" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/totp/disable", requireAuth, async (req, res) => {
    try {
      const { verifySync } = await import("otplib");
      const user = req.user as any;
      const fullUser = await storage.getUser(user.id);
      if (!fullUser?.totpEnabled || !fullUser?.totpSecret) return res.status(400).json({ message: "TOTP not enabled" });
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code required" });
      const isValid = verifySync({ token: code, secret: fullUser.totpSecret });
      if (!isValid) return res.status(400).json({ message: "Invalid code" });
      await storage.disableTotp(user.id);
      return res.json({ message: "Two-factor authentication disabled" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password/verify", async (req, res) => {
    try {
      const { verifySync } = await import("otplib");
      const { username, code } = req.body;
      if (!username || !code) return res.status(400).json({ message: "Username and code required" });
      const user = await storage.getUserByUsername(username.toLowerCase().trim());
      if (!user) return res.status(400).json({ message: "User not found" });
      if (!user.totpEnabled || !user.totpSecret) return res.status(400).json({ message: "Two-factor authentication not enabled for this account" });
      const isValid = verifySync({ token: code, secret: user.totpSecret });
      if (!isValid) return res.status(400).json({ message: "Invalid authenticator code" });
      const { randomBytes } = await import("crypto");
      const resetToken = randomBytes(32).toString("hex");
      const expiry = Date.now() + 10 * 60 * 1000;
      resetTokens.set(resetToken, { userId: user.id, expiresAt: expiry });
      return res.json({ resetToken });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/reset-password/complete", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) return res.status(400).json({ message: "Reset token and new password required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      const entry = resetTokens.get(resetToken);
      if (!entry || entry.expiresAt < Date.now()) {
        resetTokens.delete(resetToken);
        return res.status(400).json({ message: "Reset token expired or invalid" });
      }
      const hashedPassword = hashPassword(newPassword);
      await storage.updatePassword(entry.userId, hashedPassword);
      resetTokens.delete(resetToken);
      return res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(user.id, data);
      
      // Auto-generate auth PIN for private projects
      if (project.visibility === "private" && !project.authPin) {
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        const updated = await storage.updateProject(project.id, { authPin: pin });
        return res.json(updated || project);
      }
      
      return res.json(project);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const projects = await storage.getProjectsByUser(user.id);
      return res.json(projects);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:projectId", async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const owner = await storage.getUser(project.userId);
      const isOwner = !!req.user && (req.user as any).id === project.userId;

      if (project.visibility === "private" && !isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!pin || pin !== project.authPin) {
          return res.json({
            id: project.id,
            projectId: project.projectId,
            name: project.name,
            visibility: project.visibility,
            requiresPin: true,
            ownerUsername: owner?.username,
          });
        }
      }

      return res.json({
        ...project,
        ownerUsername: owner?.username,
        isOwner,
        requiresPin: false,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/projects/:projectId", requireAuth, async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const allowedFields: Record<string, boolean> = { name: true, description: true, visibility: true };
      const updates: any = {};
      for (const key of Object.keys(req.body)) {
        if (allowedFields[key]) updates[key] = req.body[key];
      }
      if (updates.visibility && !["public", "private"].includes(updates.visibility)) {
        return res.status(400).json({ message: "Visibility must be 'public' or 'private'" });
      }

      // Auto-generate auth PIN when switching to private
      if (updates.visibility === "private" && !project.authPin) {
        updates.authPin = String(Math.floor(1000 + Math.random() * 9000));
      }

      const updated = await storage.updateProject(project.id, updates);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/projects/:projectId", requireAuth, async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      await storage.deleteProject(project.id);
      return res.json({ message: "Project deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects/:projectId/generate-pin", requireAuth, async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const pin = String(Math.floor(1000 + Math.random() * 9000));
      await storage.updateProject(project.id, { authPin: pin });
      return res.json({ pin });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const isOwner = !!req.user && (req.user as any).id === project.userId;
      if (project.visibility === "private" && !isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!pin || pin !== project.authPin) {
          return res.status(403).json({ message: "Auth PIN required" });
        }
      }

      const parentPath = (req.query.path as string) || "/";
      const files = await storage.getFilesByProject(project.projectId, parentPath);
      return res.json(files);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/projects/:projectId/files", requireAuth, async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const { name, parentPath = "/", isDirectory = false, content = "" } = req.body;
      const filePath = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;

      const existing = await storage.getFileByPath(project.projectId, filePath);
      if (existing) return res.status(400).json({ message: "File already exists at this path" });

      const file = await storage.createFile(project.projectId, {
        name,
        path: filePath,
        isDirectory,
        content: isDirectory ? null : content,
        size: isDirectory ? 0 : Buffer.byteLength(content || "", "utf-8"),
        mimeType: isDirectory ? null : "text/plain",
        parentPath,
      });

      return res.json(file);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/projects/:projectId/upload", requireAuth, upload.array("files", 50), async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const parentPath = (req.body.parentPath as string) || "/";
      const uploadedFiles = req.files as Express.Multer.File[];
      const results: any[] = [];

      for (const file of uploadedFiles) {
        const filePath = parentPath === "/" ? `/${file.originalname}` : `${parentPath}/${file.originalname}`;
        const existing = await storage.getFileByPath(project.projectId, filePath);

        if (existing) {
          await storage.createFileVersion(existing.id, existing.content, existing.size || 0);
          const updated = await storage.updateFile(existing.id, {
            content: file.buffer.toString("utf-8"),
            size: file.size,
            mimeType: file.mimetype,
          });
          results.push(updated);
        } else {
          const created = await storage.createFile(project.projectId, {
            name: file.originalname,
            path: filePath,
            isDirectory: false,
            content: file.buffer.toString("utf-8"),
            size: file.size,
            mimeType: file.mimetype,
            parentPath,
          });
          results.push(created);
        }
      }

      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/files/:fileId", async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.fileId);
      if (!file) return res.status(404).json({ message: "File not found" });

      const project = await storage.getProjectByProjectId(file.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const isOwner = !!req.user && (req.user as any).id === project.userId;
      if (project.visibility === "private" && !isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!pin || pin !== project.authPin) {
          return res.status(403).json({ message: "Auth PIN required" });
        }
      }

      return res.json(file);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/files/:fileId", requireAuth, async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.fileId);
      if (!file) return res.status(404).json({ message: "File not found" });

      const project = await storage.getProjectByProjectId(file.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      if (req.body.content !== undefined && !file.isDirectory) {
        await storage.createFileVersion(file.id, file.content, file.size || 0);
      }

      const updates: any = {};
      if (req.body.name !== undefined) {
        updates.name = req.body.name;
        const parentPath = file.parentPath;
        updates.path = parentPath === "/" ? `/${req.body.name}` : `${parentPath}/${req.body.name}`;
      }
      if (req.body.content !== undefined) {
        updates.content = req.body.content;
        updates.size = Buffer.byteLength(req.body.content, "utf-8");
      }

      const updated = await storage.updateFile(file.id, updates);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/files/:fileId", requireAuth, async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.fileId);
      if (!file) return res.status(404).json({ message: "File not found" });

      const project = await storage.getProjectByProjectId(file.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      if (file.isDirectory) {
        await storage.deleteFilesByPath(project.projectId, file.path);
      }
      await storage.deleteFile(file.id);
      return res.json({ message: "File deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/files/:fileId/versions", async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.fileId);
      if (!file) return res.status(404).json({ message: "File not found" });

      const project = await storage.getProjectByProjectId(file.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const isOwner = !!req.user && (req.user as any).id === project.userId;
      if (project.visibility === "private" && !isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!pin || pin !== project.authPin) {
          return res.status(403).json({ message: "Auth PIN required" });
        }
      }

      const versions = await storage.getFileVersions(file.id);
      return res.json(versions);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/files/:fileId/restore/:versionId", requireAuth, async (req, res) => {
    try {
      const file = await storage.getFileById(req.params.fileId);
      if (!file) return res.status(404).json({ message: "File not found" });

      const project = await storage.getProjectByProjectId(file.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const versions = await storage.getFileVersions(file.id);
      const version = versions.find((v) => v.id === req.params.versionId);
      if (!version) return res.status(404).json({ message: "Version not found" });

      await storage.createFileVersion(file.id, file.content, file.size || 0);
      const updated = await storage.updateFile(file.id, {
        content: version.content,
        size: version.size || 0,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:projectId/download/:fileId", async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const file = await storage.getFileById(req.params.fileId);
      if (!file || file.isDirectory || file.projectId !== project.projectId) {
        return res.status(404).json({ message: "File not found" });
      }

      const isOwner = !!req.user && (req.user as any).id === project.userId;
      if (project.visibility === "private" && !isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!pin || pin !== project.authPin) {
          return res.status(403).json({ message: "Auth PIN required" });
        }
      }

      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
      return res.send(file.content || "");
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/user/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ username: user.username, displayName: user.displayName });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/user/:username/projects", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ message: "User not found" });
      const projects = await storage.getProjectsByUser(user.id);
      const publicProjects = projects.filter((p) => p.visibility === "public");
      return res.json(publicProjects);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // CLI: resolve username/projectname to projectId
  app.get("/api/resolve/:username/:projectName", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username.toLowerCase());
      if (!user) return res.status(404).json({ message: "User not found" });
      const projects = await storage.getProjectsByUser(user.id);
      const project = projects.find(p => p.name.toLowerCase() === req.params.projectName.toLowerCase());
      if (!project) return res.status(404).json({ message: "Project not found" });
      return res.json({
        projectId: project.projectId,
        name: project.name,
        visibility: project.visibility,
        ownerUsername: user.username,
        requiresPin: project.visibility === "private" && !!project.authPin,
        hasPin: !!project.authPin,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // CLI: PIN-based upload (no login required, just valid PIN)
  app.post("/api/projects/:projectId/cli-upload", upload.array("files", 50), async (req, res) => {
    try {
      const project = await resolveProject(req.params.projectId, req.query.owner as string | undefined);
      if (!project) return res.status(404).json({ message: "Project not found" });

      // Check auth: either logged-in owner, or valid PIN
      const isOwner = !!req.user && (req.user as any).id === project.userId;
      if (!isOwner) {
        const pin = req.headers["x-auth-pin"] as string;
        if (!project.authPin) return res.status(403).json({ message: "Project has no CLI PIN. Generate one in project settings." });
        if (!pin || pin !== project.authPin) return res.status(403).json({ message: "Invalid PIN" });
      }

      const parentPath = (req.body.parentPath as string) || "/";
      const uploadedFiles = req.files as Express.Multer.File[];
      const results: any[] = [];

      for (const file of uploadedFiles) {
        const filePath = parentPath === "/" ? `/${file.originalname}` : `${parentPath}/${file.originalname}`;
        const existing = await storage.getFileByPath(project.projectId, filePath);

        if (existing) {
          await storage.createFileVersion(existing.id, existing.content, existing.size || 0);
          const updated = await storage.updateFile(existing.id, {
            content: file.buffer.toString("utf-8"),
            size: file.size,
            mimeType: file.mimetype,
          });
          results.push(updated);
        } else {
          const created = await storage.createFile(project.projectId, {
            name: file.originalname,
            path: filePath,
            isDirectory: false,
            content: file.buffer.toString("utf-8"),
            size: file.size,
            mimeType: file.mimetype,
            parentPath,
          });
          results.push(created);
        }
      }

      return res.json(results);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const items = await storage.getNotificationsByUser(user.id);
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const count = await storage.getUnreadNotificationCount(user.id);
      return res.json({ count });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markNotificationRead(req.params.id as string, user.id);
      return res.json({ message: "Marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markAllNotificationsRead(user.id);
      return res.json({ message: "All marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(data);
      return res.json({ message: "Message sent successfully", id: contact.id });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/announcements", async (_req, res) => {
    try {
      const items = await storage.getAllAnnouncements();
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (user.role !== "admin" && user.username !== "idledev") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      return res.json(allUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        displayName: u.displayName,
        createdAt: u.createdAt,
      })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/contacts", requireAdmin, async (_req, res) => {
    try {
      const items = await storage.getAllContacts();
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/contacts/:id", requireAdmin, async (req, res) => {
    try {
      await storage.markContactRead(req.params.id as string);
      return res.json({ message: "Marked as read" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/contacts/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteContact(req.params.id as string);
      return res.json({ message: "Contact deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/announcements", requireAdmin, async (_req, res) => {
    try {
      const items = await storage.getAllAnnouncements();
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/announcements", requireAdmin, async (req, res) => {
    try {
      const data = insertAnnouncementSchema.parse(req.body);
      const user = req.user as any;
      const announcement = await storage.createAnnouncement(user.id, data);
      return res.json(announcement);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const { title, message, userId } = req.body;
      if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: "Title and message required" });
      if (title.length > 200) return res.status(400).json({ message: "Title too long (max 200 characters)" });
      if (message.length > 2000) return res.status(400).json({ message: "Message too long (max 2000 characters)" });
      if (userId) {
        const targetUser = await storage.getUser(userId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });
        const notification = await storage.createNotification(userId, title.trim(), message.trim(), "admin");
        return res.json(notification);
      } else {
        await storage.sendNotificationToAll(title.trim(), message.trim(), "admin");
        return res.json({ message: "Notification sent to all users" });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/announcements/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAnnouncement(req.params.id as string);
      return res.json({ message: "Announcement deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
