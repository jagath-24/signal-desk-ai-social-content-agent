import { and, asc, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSocialPost, InsertUser, SocialPost, socialPosts, User, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let seeded = false;
let demoPosts: SocialPost[] = [
  {
    id: 1,
    title: "The quiet advantage of consistent publishing",
    topic: "Building a consistent content system",
    tone: "professional",
    copy: "Consistency is not about posting more. It is about making your best ideas easier to find.\n\nA lightweight system helps you turn one sharp insight into a week of useful conversations — without losing your voice in the process.",
    hashtags: "#ContentStrategy #CreatorWorkflow",
    platform: "LinkedIn",
    status: "draft",
    scheduledAt: null,
    usedAt: null,
    createdAt: new Date("2026-09-17T06:30:00Z"),
    updatedAt: new Date("2026-09-17T06:30:00Z"),
  },
  {
    id: 2,
    title: "One idea, three useful angles",
    topic: "Repurposing ideas without sounding repetitive",
    tone: "casual",
    copy: "One good idea can do more than one job.\n\nTry this: share the lesson, the behind-the-scenes, and the unpopular opinion. Same source material. Three ways to help someone move forward.",
    hashtags: "#BuildInPublic #ContentTips",
    platform: "X",
    status: "approved",
    scheduledAt: null,
    usedAt: null,
    createdAt: new Date("2026-09-16T12:15:00Z"),
    updatedAt: new Date("2026-09-16T12:15:00Z"),
  },
  {
    id: 3,
    title: "A sharper way to think about AI workflows",
    topic: "Human judgment in AI-assisted work",
    tone: "punchy",
    copy: "AI can make the first draft faster.\n\nIt cannot decide what deserves to be said.\n\nKeep the judgment. Automate the blank page.",
    hashtags: "#AIWorkflows #FutureOfWork",
    platform: "LinkedIn",
    status: "scheduled",
    scheduledAt: new Date("2026-09-19T09:00:00Z"),
    usedAt: null,
    createdAt: new Date("2026-09-15T09:00:00Z"),
    updatedAt: new Date("2026-09-18T07:00:00Z"),
  },
  {
    id: 4,
    title: "The post-workout content check",
    topic: "Creating a sustainable publishing habit",
    tone: "casual",
    copy: "Before you publish, ask one simple question: does this give someone a next step?\n\nA little useful beats a lot polished.",
    hashtags: "#CreatorEconomy #Writing",
    platform: "Instagram",
    status: "posted",
    scheduledAt: new Date("2026-09-12T14:00:00Z"),
    usedAt: new Date("2026-09-12T14:01:00Z"),
    createdAt: new Date("2026-09-11T11:30:00Z"),
    updatedAt: new Date("2026-09-12T14:01:00Z"),
  },
];

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect, using demo memory store:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function ensureSeeded() {
  if (seeded) return;
  const db = await getDb();
  if (!db) {
    seeded = true;
    return;
  }
  const existing = await db.select({ id: socialPosts.id }).from(socialPosts).limit(1);
  if (existing.length === 0) {
    await db.insert(socialPosts).values(demoPosts.map(({ id: _id, ...post }) => post));
  }
  seeded = true;
}

export async function listPosts(status?: SocialPost["status"]): Promise<SocialPost[]> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) {
    return [...demoPosts]
      .filter((post) => !status || post.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const query = db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));
  const rows = status ? await query.where(eq(socialPosts.status, status)) : await query;
  return rows;
}

export async function getPost(id: number): Promise<SocialPost | undefined> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) return demoPosts.find((post) => post.id === id);
  return (await db.select().from(socialPosts).where(eq(socialPosts.id, id)).limit(1))[0];
}

export async function createPosts(posts: InsertSocialPost[]): Promise<SocialPost[]> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const created = posts.map((post, index) => ({
      id: Math.max(...demoPosts.map((item) => item.id), 0) + index + 1,
      title: post.title,
      topic: post.topic,
      tone: post.tone!,
      copy: post.copy,
      hashtags: post.hashtags ?? null,
      platform: post.platform ?? "LinkedIn",
      status: post.status ?? "draft",
      scheduledAt: post.scheduledAt ?? null,
      usedAt: post.usedAt ?? null,
      createdAt: now,
      updatedAt: now,
    } as SocialPost));
    demoPosts = [...created, ...demoPosts];
    return created;
  }
  await db.insert(socialPosts).values(posts);
  const topic = posts[0]?.topic;
  return topic ? (await db.select().from(socialPosts).where(eq(socialPosts.topic, topic)).orderBy(desc(socialPosts.createdAt))).slice(0, posts.length) : [];
}

export async function updatePost(id: number, patch: Partial<InsertSocialPost>): Promise<SocialPost | undefined> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) {
    const index = demoPosts.findIndex((post) => post.id === id);
    if (index === -1) return undefined;
    demoPosts[index] = { ...demoPosts[index], ...patch, updatedAt: new Date() } as SocialPost;
    return demoPosts[index];
  }
  await db.update(socialPosts).set({ ...patch, updatedAt: new Date() }).where(eq(socialPosts.id, id));
  return getPost(id);
}

export async function listCalendarPosts(from: Date, to: Date): Promise<SocialPost[]> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) {
    // Include scheduled posts within the date range AND all approved posts (no scheduledAt yet)
    return demoPosts.filter(
      (post) =>
        post.status === "approved" ||
        (post.scheduledAt && post.scheduledAt >= from && post.scheduledAt <= to),
    );
  }
  // scheduled posts within range
  const scheduled = await db
    .select()
    .from(socialPosts)
    .where(and(isNotNull(socialPosts.scheduledAt), gte(socialPosts.scheduledAt, from), lte(socialPosts.scheduledAt, to)))
    .orderBy(asc(socialPosts.scheduledAt));
  // approved posts (no scheduledAt)
  const approved = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.status, "approved"))
    .orderBy(desc(socialPosts.createdAt));
  return [...scheduled, ...approved];
}

export async function markDuePosts(now = new Date()): Promise<number> {
  const posts = await listPosts("scheduled");
  const due = posts.filter((post) => post.scheduledAt && post.scheduledAt <= now);
  for (const post of due) await updatePost(post.id, { status: "posted", usedAt: now });
  return due.length;
}

export async function getAnalytics() {
  const posts = await listPosts();
  const used = posts.filter((post) => post.usedAt || post.status === "posted");
  const toneCounts = ["professional", "casual", "punchy"].map((tone) => ({
    tone,
    used: used.filter((post) => post.tone === tone).length,
    total: posts.filter((post) => post.tone === tone).length,
  }));
  const platformCounts = ["LinkedIn", "X", "Instagram"].map((platform) => ({
    platform,
    used: used.filter((post) => post.platform === platform).length,
    total: posts.filter((post) => post.platform === platform).length,
  }));
  return { total: posts.length, used: used.length, toneCounts, platformCounts };
}
