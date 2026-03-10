import { db } from "./db";
import { users, projects, files, fileVersions } from "@shared/schema";
import type { User, InsertUser, Project, InsertProject, FileRecord, InsertFile, FileVersion } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export const storage = new DatabaseStorage();
