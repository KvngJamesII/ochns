import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, hashPassword, verifyPassword } from "./auth";
import { insertProjectSchema, insertUserSchema, insertContactSchema, insertAnnouncementSchema } from "@shared/schema";
import passport from "passport";
import multer from "multer";
import { z } from "zod";
import { nanoid } from "nanoid";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    return res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(user.id, data);
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
      const project = await storage.getProjectByProjectId(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const owner = await storage.getUser(project.userId);
      const isOwner = req.isAuthenticated() && (req.user as any).id === project.userId;

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
      const project = await storage.getProjectByProjectId(req.params.projectId);
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

      const updated = await storage.updateProject(project.id, updates);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/projects/:projectId", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProjectByProjectId(req.params.projectId);
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
      const project = await storage.getProjectByProjectId(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const pin = nanoid(8);
      await storage.updateProject(project.id, { authPin: pin });
      return res.json({ pin });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const project = await storage.getProjectByProjectId(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const isOwner = req.isAuthenticated() && (req.user as any).id === project.userId;
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
      const project = await storage.getProjectByProjectId(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== (req.user as any).id) return res.status(403).json({ message: "Forbidden" });

      const { name, parentPath = "/", isDirectory = false, content = "" } = req.body;
      const path = parentPath === "/" ? `/${name}` : `${parentPath}/${name}`;

      const existing = await storage.getFileByPath(project.projectId, path);
      if (existing) return res.status(400).json({ message: "File already exists at this path" });

      const file = await storage.createFile(project.projectId, {
        name,
        path,
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
      const project = await storage.getProjectByProjectId(req.params.projectId);
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

      const isOwner = req.isAuthenticated() && (req.user as any).id === project.userId;
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

      const isOwner = req.isAuthenticated() && (req.user as any).id === project.userId;
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
      const project = await storage.getProjectByProjectId(req.params.projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const file = await storage.getFileById(req.params.fileId);
      if (!file || file.isDirectory || file.projectId !== project.projectId) {
        return res.status(404).json({ message: "File not found" });
      }

      const isOwner = req.isAuthenticated() && (req.user as any).id === project.userId;
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
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
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
