import { db, hasDatabase } from "./db";
import { users, projects, files, fileVersions, announcements, contacts, notifications, apiTokens } from "@shared/schema";
import type { User, InsertUser, Project, InsertProject, FileRecord, InsertFile, FileVersion, Announcement, InsertAnnouncement, Contact, InsertContact, Notification, ApiToken } from "@shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  createProject(userId: string, project: InsertProject): Promise<Project>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  getProjectByProjectId(projectId: string): Promise<Project | undefined>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getFilesByProject(projectId: string, parentPath: string): Promise<FileRecord[]>;
  getFileById(id: string): Promise<FileRecord | undefined>;
  getFileByPath(projectId: string, path: string): Promise<FileRecord | undefined>;
  createFile(projectId: string, file: InsertFile): Promise<FileRecord>;
  updateFile(id: string, updates: Partial<FileRecord>): Promise<FileRecord | undefined>;
  deleteFile(id: string): Promise<void>;
  deleteFilesByPath(projectId: string, pathPrefix: string): Promise<void>;
  getAllFilesByProject(projectId: string): Promise<FileRecord[]>;

  createFileVersion(fileId: string, content: string | null, size: number): Promise<FileVersion>;
  getFileVersions(fileId: string): Promise<FileVersion[]>;

  getAdminStats(): Promise<{ users: number; projects: number; files: number; contacts: number; unreadContacts: number }>;

  getAllContacts(): Promise<Contact[]>;
  createContact(data: InsertContact): Promise<Contact>;
  markContactRead(id: string): Promise<void>;
  deleteContact(id: string): Promise<void>;

  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(authorId: string, data: InsertAnnouncement): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(userId: string, title: string, message: string, type?: string): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  sendNotificationToAll(title: string, message: string, type?: string): Promise<void>;

  createApiToken(userId: string, name: string, token: string): Promise<ApiToken>;
  getApiTokensByUser(userId: string): Promise<ApiToken[]>;
  getApiTokenByToken(token: string): Promise<ApiToken | undefined>;
  deleteApiToken(id: string, userId: string): Promise<void>;
  updateTokenLastUsed(id: string): Promise<void>;

  setTotpSecret(userId: string, secret: string): Promise<void>;
  enableTotp(userId: string): Promise<void>;
  disableTotp(userId: string): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashPassword(insertUser.password),
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const projectId = `proj${nanoid(16)}`;
    const [created] = await db
      .insert(projects)
      .values({
        ...project,
        userId,
        projectId,
      })
      .returning();
    return created;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProjectByProjectId(projectId: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.projectId, projectId));
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getFilesByProject(projectId: string, parentPath: string): Promise<FileRecord[]> {
    return db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.parentPath, parentPath)))
      .orderBy(desc(files.isDirectory), files.name);
  }

  async getFileById(id: string): Promise<FileRecord | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFileByPath(projectId: string, path: string): Promise<FileRecord | undefined> {
    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, path)));
    return file;
  }

  async createFile(projectId: string, file: InsertFile): Promise<FileRecord> {
    const [created] = await db
      .insert(files)
      .values({
        ...file,
        projectId,
      })
      .returning();
    return created;
  }

  async updateFile(id: string, updates: Partial<FileRecord>): Promise<FileRecord | undefined> {
    const [updated] = await db
      .update(files)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return updated;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async deleteFilesByPath(projectId: string, pathPrefix: string): Promise<void> {
    const allFiles = await db.select().from(files).where(eq(files.projectId, projectId));
    const dirPrefix = pathPrefix.endsWith("/") ? pathPrefix : pathPrefix + "/";
    for (const file of allFiles) {
      if (file.path === pathPrefix || file.path.startsWith(dirPrefix)) {
        await db.delete(files).where(eq(files.id, file.id));
      }
    }
  }

  async getAllFilesByProject(projectId: string): Promise<FileRecord[]> {
    return db.select().from(files).where(eq(files.projectId, projectId)).orderBy(desc(files.isDirectory), files.name);
  }

  async createFileVersion(fileId: string, content: string | null, size: number): Promise<FileVersion> {
    const versions = await this.getFileVersions(fileId);
    const version = versions.length + 1;
    const [created] = await db
      .insert(fileVersions)
      .values({ fileId, content, size, version })
      .returning();
    return created;
  }

  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    return db
      .select()
      .from(fileVersions)
      .where(eq(fileVersions.fileId, fileId))
      .orderBy(desc(fileVersions.version));
  }

  async getAdminStats() {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [projectCount] = await db.select({ value: count() }).from(projects);
    const [fileCount] = await db.select({ value: count() }).from(files);
    const [contactCount] = await db.select({ value: count() }).from(contacts);
    const [unreadCount] = await db.select({ value: count() }).from(contacts).where(eq(contacts.read, false));
    return {
      users: userCount.value,
      projects: projectCount.value,
      files: fileCount.value,
      contacts: contactCount.value,
      unreadContacts: unreadCount.value,
    };
  }

  async getAllContacts(): Promise<Contact[]> {
    return db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(data).returning();
    return created;
  }

  async markContactRead(id: string): Promise<void> {
    await db.update(contacts).set({ read: true }).where(eq(contacts.id, id));
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(authorId: string, data: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values({ ...data, authorId }).returning();
    return created;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result.value;
  }

  async createNotification(userId: string, title: string, message: string, type: string = "system"): Promise<Notification> {
    const [created] = await db.insert(notifications).values({ userId, title, message, type }).returning();
    return created;
  }

  async markNotificationRead(id: string, userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  }

  async sendNotificationToAll(title: string, message: string, type: string = "admin"): Promise<void> {
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const u of allUsers) {
      await db.insert(notifications).values({ userId: u.id, title, message, type });
    }
  }
  async createApiToken(userId: string, name: string, token: string): Promise<ApiToken> {
    const [created] = await db.insert(apiTokens).values({ userId, name, token }).returning();
    return created;
  }

  async getApiTokensByUser(userId: string): Promise<ApiToken[]> {
    return db.select().from(apiTokens).where(eq(apiTokens.userId, userId)).orderBy(desc(apiTokens.createdAt));
  }

  async getApiTokenByToken(token: string): Promise<ApiToken | undefined> {
    const [found] = await db.select().from(apiTokens).where(eq(apiTokens.token, token));
    return found;
  }

  async deleteApiToken(id: string, userId: string): Promise<void> {
    await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
  }

  async updateTokenLastUsed(id: string): Promise<void> {
    await db.update(apiTokens).set({ lastUsed: new Date() }).where(eq(apiTokens.id, id));
  }

  async setTotpSecret(userId: string, secret: string): Promise<void> {
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));
  }

  async enableTotp(userId: string): Promise<void> {
    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, userId));
  }

  async disableTotp(userId: string): Promise<void> {
    await db.update(users).set({ totpEnabled: false, totpSecret: null }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }
}

class MemoryStorage implements IStorage {
  private users: User[] = [];
  private projects: Project[] = [];
  private files: FileRecord[] = [];
  private fileVersions: FileVersion[] = [];
  private announcements: Announcement[] = [];
  private contacts: Contact[] = [];
  private notifications: Notification[] = [];
  private apiTokens: ApiToken[] = [];

  private genId(): string { return nanoid(21); }

  async getUser(id: string) { return this.users.find(u => u.id === id); }
  async getUserByUsername(username: string) { return this.users.find(u => u.username === username); }
  async createUser(data: InsertUser): Promise<User> {
    const user: User = {
      id: this.genId(), username: data.username, email: data.email,
      password: hashPassword(data.password), displayName: data.displayName ?? null,
      role: "user", totpSecret: null, totpEnabled: false, createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }
  async getAllUsers() { return [...this.users].reverse(); }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const p: Project = {
      id: this.genId(), projectId: `proj${nanoid(16)}`, name: project.name,
      description: project.description ?? null, userId, visibility: project.visibility ?? "public",
      authPin: null, createdAt: new Date(), updatedAt: new Date(),
    };
    this.projects.push(p);
    return p;
  }
  async getProjectsByUser(userId: string) { return this.projects.filter(p => p.userId === userId).reverse(); }
  async getProjectByProjectId(projectId: string) { return this.projects.find(p => p.projectId === projectId); }
  async updateProject(id: string, updates: Partial<Project>) {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = { ...this.projects[idx], ...updates, updatedAt: new Date() };
    return this.projects[idx];
  }
  async deleteProject(id: string) { this.projects = this.projects.filter(p => p.id !== id); }

  async getFilesByProject(projectId: string, parentPath: string) {
    return this.files.filter(f => f.projectId === projectId && f.parentPath === parentPath)
      .sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));
  }
  async getFileById(id: string) { return this.files.find(f => f.id === id); }
  async getFileByPath(projectId: string, path: string) { return this.files.find(f => f.projectId === projectId && f.path === path); }
  async createFile(projectId: string, file: InsertFile): Promise<FileRecord> {
    const f: FileRecord = {
      id: this.genId(), projectId, name: file.name, path: file.path,
      isDirectory: file.isDirectory ?? false, content: file.content ?? null,
      size: file.size ?? 0, mimeType: file.mimeType ?? null,
      parentPath: file.parentPath ?? "/", createdAt: new Date(), updatedAt: new Date(),
    };
    this.files.push(f);
    return f;
  }
  async updateFile(id: string, updates: Partial<FileRecord>) {
    const idx = this.files.findIndex(f => f.id === id);
    if (idx === -1) return undefined;
    this.files[idx] = { ...this.files[idx], ...updates, updatedAt: new Date() };
    return this.files[idx];
  }
  async deleteFile(id: string) { this.files = this.files.filter(f => f.id !== id); }
  async deleteFilesByPath(projectId: string, pathPrefix: string) {
    const dirPrefix = pathPrefix.endsWith("/") ? pathPrefix : pathPrefix + "/";
    this.files = this.files.filter(f => !(f.projectId === projectId && (f.path === pathPrefix || f.path.startsWith(dirPrefix))));
  }
  async getAllFilesByProject(projectId: string) {
    return this.files.filter(f => f.projectId === projectId)
      .sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));
  }

  async createFileVersion(fileId: string, content: string | null, size: number): Promise<FileVersion> {
    const versions = await this.getFileVersions(fileId);
    const fv: FileVersion = { id: this.genId(), fileId, content, size, version: versions.length + 1, createdAt: new Date() };
    this.fileVersions.push(fv);
    return fv;
  }
  async getFileVersions(fileId: string) { return this.fileVersions.filter(v => v.fileId === fileId).sort((a, b) => b.version - a.version); }

  async getAdminStats() {
    const unread = this.contacts.filter(c => !c.read).length;
    return { users: this.users.length, projects: this.projects.length, files: this.files.length, contacts: this.contacts.length, unreadContacts: unread };
  }

  async getAllContacts() { return [...this.contacts].reverse(); }
  async createContact(data: InsertContact): Promise<Contact> {
    const c: Contact = { id: this.genId(), name: data.name, email: data.email, subject: data.subject ?? null, message: data.message, read: false, createdAt: new Date() };
    this.contacts.push(c);
    return c;
  }
  async markContactRead(id: string) { const c = this.contacts.find(x => x.id === id); if (c) c.read = true; }
  async deleteContact(id: string) { this.contacts = this.contacts.filter(c => c.id !== id); }

  async getAllAnnouncements() { return [...this.announcements].reverse(); }
  async createAnnouncement(authorId: string, data: InsertAnnouncement): Promise<Announcement> {
    const a: Announcement = { id: this.genId(), title: data.title, content: data.content, authorId, createdAt: new Date() };
    this.announcements.push(a);
    return a;
  }
  async deleteAnnouncement(id: string) { this.announcements = this.announcements.filter(a => a.id !== id); }

  async getNotificationsByUser(userId: string) { return this.notifications.filter(n => n.userId === userId).reverse(); }
  async getUnreadNotificationCount(userId: string) { return this.notifications.filter(n => n.userId === userId && !n.read).length; }
  async createNotification(userId: string, title: string, message: string, type = "system"): Promise<Notification> {
    const n: Notification = { id: this.genId(), userId, title, message, type, read: false, createdAt: new Date() };
    this.notifications.push(n);
    return n;
  }
  async markNotificationRead(id: string, userId: string) { const n = this.notifications.find(x => x.id === id && x.userId === userId); if (n) n.read = true; }
  async markAllNotificationsRead(userId: string) { this.notifications.filter(n => n.userId === userId).forEach(n => n.read = true); }
  async sendNotificationToAll(title: string, message: string, type = "admin") {
    for (const u of this.users) { this.notifications.push({ id: this.genId(), userId: u.id, title, message, type, read: false, createdAt: new Date() }); }
  }

  async createApiToken(userId: string, name: string, token: string): Promise<ApiToken> {
    const t: ApiToken = { id: this.genId(), userId, name, token, lastUsed: null, createdAt: new Date() };
    this.apiTokens.push(t);
    return t;
  }
  async getApiTokensByUser(userId: string) { return this.apiTokens.filter(t => t.userId === userId).reverse(); }
  async getApiTokenByToken(token: string) { return this.apiTokens.find(t => t.token === token); }
  async deleteApiToken(id: string, userId: string) { this.apiTokens = this.apiTokens.filter(t => !(t.id === id && t.userId === userId)); }
  async updateTokenLastUsed(id: string) { const t = this.apiTokens.find(x => x.id === id); if (t) t.lastUsed = new Date(); }

  async setTotpSecret(userId: string, secret: string) { const u = this.users.find(x => x.id === userId); if (u) u.totpSecret = secret; }
  async enableTotp(userId: string) { const u = this.users.find(x => x.id === userId); if (u) u.totpEnabled = true; }
  async disableTotp(userId: string) { const u = this.users.find(x => x.id === userId); if (u) { u.totpEnabled = false; u.totpSecret = null; } }
  async updatePassword(userId: string, hashedPassword: string) { const u = this.users.find(x => x.id === userId); if (u) u.password = hashedPassword; }
}

export const storage: IStorage = hasDatabase ? new DatabaseStorage() : new MemoryStorage();
