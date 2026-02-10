import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Express } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Helper to hash passwords securely
export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

// Helper to compare passwords securely
export async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function findOrCreateOAuthUser(opts: {
    provider: 'google' | 'github' | 'facebook';
    providerId: string;
    email?: string | null;
    displayName?: string | null;
}) {
    const { provider, providerId, email, displayName } = opts;

    // Our users.id is a serial int. We'll store the provider IDs in dedicated columns.
    const whereField =
        provider === 'google' ? users.googleId :
        provider === 'facebook' ? users.facebookId :
        users.githubId;

    const [existingByProvider] = await db.select().from(users).where(eq(whereField as any, providerId as any));
    if (existingByProvider) return existingByProvider;

    // Try link by email if present
    if (email) {
        const [existingByEmail] = await db.select().from(users).where(eq(users.email, email));
        if (existingByEmail) {
            const patch: any = { updatedAt: new Date() };
            if (provider === 'google') patch.googleId = providerId;
            if (provider === 'facebook') patch.facebookId = providerId;
            if (provider === 'github') patch.githubId = providerId;
            const [updated] = await db.update(users).set(patch).where(eq(users.id, existingByEmail.id)).returning();
            return updated;
        }
    }

    // Create a new user. For local auth, password is required.
    // For OAuth-only users, we create a random password hash so local login can't be used unless they reset it.
    const randomPassword = randomBytes(32).toString('hex');
    const password = await hashPassword(randomPassword);

    const baseUsername = (email?.split('@')[0] || displayName || provider).toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 20) || provider;
    let username = baseUsername;

    // Ensure unique username
    for (let i = 0; i < 20; i++) {
        const exists = await storage.getUserByUsername(username);
        if (!exists) break;
        username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
    }

    const createData: any = {
        username,
        email: email || null,
        password,
    };
    if (provider === 'google') createData.googleId = providerId;
    if (provider === 'facebook') createData.facebookId = providerId;
    if (provider === 'github') createData.githubId = providerId;

    const created = await storage.createUser(createData);

    // Create SafePay customer asynchronously (don't block registration)
    // This runs in the background
    (async () => {
      try {
        const { createSafePayCustomer } = await import("./services/safepayPaymentService");
        const result = await createSafePayCustomer({
          userId: created.id,
          email: created.email || undefined,
          firstName: created.username,
          lastName: "",
        });

        if (result.ok && result.customerId) {
          await storage.updateUser(created.id, {
            safepayCustomerId: result.customerId,
          });
          console.log(`✅ SafePay customer created for user ${created.id}:`, result.customerId);
        } else {
          console.warn(`⚠️ Failed to create SafePay customer for user ${created.id}:`, result.reason);
        }
      } catch (error) {
        console.error(`❌ Error creating SafePay customer for user ${created.id}:`, error);
      }
    })();

    return created;
}

export function setupAuth(app: Express) {
    const PostgresqlStore = pgSession(session);
    const sessionStore = new PostgresqlStore({
        pool,
        // Use the singular table name to match the DB migration/schema.
        tableName: "session",
        createTableIfMissing: true,
    });

    // Determine if we're using HTTPS (production or via tunnel)
    const isHttps = (process.env.PUBLIC_BASE_URL || '').startsWith('https://') ||
                    process.env.NODE_ENV === 'production' ||
                    process.env.APP_ENV === 'production';

    app.use(
        session({
            secret: process.env.SESSION_SECRET || "super secret key",
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            cookie: {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                httpOnly: true,
                secure: isHttps, // Secure if using HTTPS
                sameSite: isHttps ? 'none' : 'lax', // 'none' required for cross-site cookies with secure
            },
            proxy: true, // Trust proxy headers for secure cookies
        })
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(async (username, password, done) => {
            try {
                const user = await storage.getUserByUsername(username);
                if (!user || !(await comparePasswords(password, user.password))) {
                    return done(null, false);
                } else {
                    return done(null, user);
                }
            } catch (err) {
                return done(err);
            }
        })
    );

    // Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
        const callbackURL = `${baseUrl}/api/auth/google/callback`;

        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: callbackURL,
        }, async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || null;
                const user = await findOrCreateOAuthUser({
                    provider: 'google',
                    providerId: profile.id,
                    email,
                    displayName: profile.displayName,
                });
                return done(null, user);
            } catch (e) {
                return done(e as any);
            }
        }));
    }

    // GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
        const callbackURL = `${baseUrl}/api/auth/github/callback`;

        passport.use(new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: callbackURL,
            scope: ['user:email'],
        }, async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = (profile.emails && profile.emails[0]?.value) || null;
                const user = await findOrCreateOAuthUser({
                    provider: 'github',
                    providerId: profile.id,
                    email,
                    displayName: profile.username || profile.displayName,
                });
                return done(null, user);
            } catch (e) {
                return done(e as any);
            }
        }));
    }

    // Facebook OAuth
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://vidgrabber.online';
        const callbackURL = `${baseUrl}/api/auth/facebook/callback`;

        passport.use(new FacebookStrategy({
            clientID: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            callbackURL: callbackURL,
            profileFields: ['id', 'displayName', 'emails'],
        }, async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = (profile.emails && profile.emails[0]?.value) || null;
                const user = await findOrCreateOAuthUser({
                    provider: 'facebook',
                    providerId: profile.id,
                    email,
                    displayName: profile.displayName,
                });
                return done(null, user);
            } catch (e) {
                return done(e as any);
            }
        }));
    }

    passport.serializeUser((user, done) => done(null, (user as any).id));
    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await storage.getUser(id);
            done(null, user);
        } catch (err) {
            done(err);
        }
    });

    // API Routes for Auth
    app.post("/api/register", async (req, res, next) => {
        try {
            const existingUser = await storage.getUserByUsername(req.body.username);
            if (existingUser) {
                return res.status(400).send("Username already exists");
            }

            const hashedPassword = await hashPassword(req.body.password);
            const user = await storage.createUser({
                ...req.body,
                password: hashedPassword,
            });

            req.login(user, (err) => {
                if (err) return next(err);
                res.status(201).json(user);
            });
        } catch (err) {
            next(err);
        }
    });

    app.post("/api/login", passport.authenticate("local"), (req, res) => {
        res.status(200).json(req.user);
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.sendStatus(200);
        });
    });

    app.get("/api/auth/user", (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).send("Not logged in");
        }
        res.json(req.user);
    });

    app.put("/api/user/profile", async (req: any, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ ok: false, error: "Not logged in" });
        }

        try {
            const userId = Number(req.user.id);
            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ ok: false, error: "User not found" });
            }

            const { email, username, currentPassword, newPassword } = req.body;
            const updates: any = {};

            // Check if user is OAuth user
            const isOAuthUser = !!(user.googleId || user.facebookId || user.githubId);

            // Email update validation
            if (email && email !== user.email) {
                // Prevent OAuth users from changing email
                if (isOAuthUser) {
                    return res.status(403).json({
                        ok: false,
                        error: "Cannot change email for OAuth accounts. Email is managed by your OAuth provider."
                    });
                }

                // Check if email is already in use
                const existingUser = await storage.getUserByEmail(email);
                if (existingUser && existingUser.id !== userId) {
                    return res.status(400).json({ ok: false, error: "Email already in use" });
                }

                updates.email = email;
            }

            // Username update
            if (username && username !== user.username) {
                // Check if username is already in use
                const existingUser = await storage.getUserByUsername(username);
                if (existingUser && existingUser.id !== userId) {
                    return res.status(400).json({ ok: false, error: "Username already in use" });
                }

                updates.username = username;
            }

            // Password update validation
            if (newPassword) {
                // Prevent OAuth users from changing password
                if (isOAuthUser) {
                    return res.status(403).json({
                        ok: false,
                        error: "Cannot change password for OAuth accounts. Password is managed by your OAuth provider."
                    });
                }

                if (!currentPassword) {
                    return res.status(400).json({ ok: false, error: "Current password is required to change password" });
                }

                // Verify current password
                const isValidPassword = await comparePasswords(currentPassword, user.password);
                if (!isValidPassword) {
                    return res.status(400).json({ ok: false, error: "Current password is incorrect" });
                }

                if (newPassword.length < 8) {
                    return res.status(400).json({ ok: false, error: "New password must be at least 8 characters" });
                }

                // Hash new password
                updates.password = await hashPassword(newPassword);
            }

            // Update user if there are changes
            if (Object.keys(updates).length > 0) {
                updates.updatedAt = new Date();
                await storage.updateUser(userId, updates);
            }

            // Fetch updated user
            const updatedUser = await storage.getUser(userId);
            res.json({ ok: true, user: updatedUser });
        } catch (error: any) {
            console.error("Profile update error:", error);
            res.status(500).json({ ok: false, error: error.message || "Failed to update profile" });
        }
    });
}