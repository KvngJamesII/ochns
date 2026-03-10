import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import type { Express, Request } from "express";

const PgStore = connectPgSimple(session);

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const testBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, testBuffer);
}

export function setupAuth(app: Express) {
  app.use(
    session({
      store: new PgStore({
        pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "vpush-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Invalid username" });
        if (!verifyPassword(password, user.password))
          return done(null, false, { message: "Invalid password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}

export async function tokenAuth(req: Request, res: any, next: any) {
  if (req.isAuthenticated()) return next();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const apiToken = await storage.getApiTokenByToken(token);
      if (apiToken) {
        const user = await storage.getUser(apiToken.userId);
        if (user) {
          (req as any).user = user;
          storage.updateTokenLastUsed(apiToken.id).catch(() => {});
          return next();
        }
      }
    } catch {}
  }
  next();
}

export function requireAuth(req: Request, res: any, next: any) {
  if (req.user) return next();
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
