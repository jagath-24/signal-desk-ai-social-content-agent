import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the generated Manus auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const socialPosts = mysqlTable("socialPosts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  topic: varchar("topic", { length: 255 }).notNull(),
  tone: mysqlEnum("tone", ["professional", "casual", "punchy"]).notNull(),
  copy: text("copy").notNull(),
  hashtags: varchar("hashtags", { length: 500 }),
  platform: mysqlEnum("platform", ["LinkedIn", "X", "Instagram"]).default("LinkedIn").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "rejected", "scheduled", "posted"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;
