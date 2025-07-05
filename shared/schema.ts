import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Table for tracking individual challenge completions
export const challengeCompletions = pgTable("challenge_completions", {
  id: serial("id").primaryKey(),
  challengeId: text("challenge_id").notNull(),
  userName: text("user_name").notNull(),
  deviceId: text("device_id").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChallengeCompletionSchema = createInsertSchema(challengeCompletions).pick({
  challengeId: true,
  userName: true,
  deviceId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ChallengeCompletion = typeof challengeCompletions.$inferSelect;
export type InsertChallengeCompletion = z.infer<typeof insertChallengeCompletionSchema>;
