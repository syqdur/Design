import { users, challengeCompletions, type User, type InsertUser, type ChallengeCompletion, type InsertChallengeCompletion } from "@shared/schema";
import { db } from "./db";
import { eq, and, count, desc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Challenge completion methods
  getUserChallengeCompletions(userName: string, deviceId: string): Promise<ChallengeCompletion[]>;
  toggleChallengeCompletion(challengeId: string, userName: string, deviceId: string): Promise<boolean>;
  getChallengeLeaderboard(): Promise<Array<{ userName: string; deviceId: string; completedCount: number }>>;
}

// In-memory storage implementation
export class MemoryStorage implements IStorage {
  private users = new Map<number, User>();
  private usersByUsername = new Map<string, User>();
  private challengeCompletions = new Map<string, ChallengeCompletion>();
  private nextUserId = 1;
  private nextCompletionId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = { ...insertUser, id: this.nextUserId++ };
    this.users.set(user.id, user);
    this.usersByUsername.set(user.username, user);
    return user;
  }

  // Challenge completion methods
  async getUserChallengeCompletions(userName: string, deviceId: string): Promise<ChallengeCompletion[]> {
    const completions: ChallengeCompletion[] = [];
    const entries = Array.from(this.challengeCompletions.entries());
    for (const [_, completion] of entries) {
      if (completion.userName === userName && completion.deviceId === deviceId) {
        completions.push(completion);
      }
    }
    return completions;
  }

  async toggleChallengeCompletion(challengeId: string, userName: string, deviceId: string): Promise<boolean> {
    // Check if the challenge is already completed
    const completionKey = `${challengeId}_${userName}_${deviceId}`;
    const existing = this.challengeCompletions.get(completionKey);

    if (existing) {
      // Remove completion (uncomplete the challenge)
      this.challengeCompletions.delete(completionKey);
      return false; // Challenge is now uncompleted
    } else {
      // Add completion (complete the challenge)
      const completion: ChallengeCompletion = {
        id: this.nextCompletionId++,
        challengeId,
        userName,
        deviceId,
        completedAt: new Date()
      };
      this.challengeCompletions.set(completionKey, completion);
      return true; // Challenge is now completed
    }
  }

  async getChallengeLeaderboard(): Promise<Array<{ userName: string; deviceId: string; completedCount: number }>> {
    const leaderboard = new Map<string, { userName: string; deviceId: string; completedCount: number }>();

    const entries = Array.from(this.challengeCompletions.entries());
    for (const [_, completion] of entries) {
      const userKey = `${completion.userName}_${completion.deviceId}`;
      const existing = leaderboard.get(userKey);
      
      if (existing) {
        existing.completedCount++;
      } else {
        leaderboard.set(userKey, {
          userName: completion.userName,
          deviceId: completion.deviceId,
          completedCount: 1
        });
      }
    }

    return Array.from(leaderboard.values())
      .sort((a, b) => b.completedCount - a.completedCount);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Database error in getUser:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Database error in getUserByUsername:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  }

  // Challenge completion methods
  async getUserChallengeCompletions(userName: string, deviceId: string): Promise<ChallengeCompletion[]> {
    try {
      return await db
        .select()
        .from(challengeCompletions)
        .where(and(
          eq(challengeCompletions.userName, userName),
          eq(challengeCompletions.deviceId, deviceId)
        ));
    } catch (error) {
      console.error('Database error in getUserChallengeCompletions:', error);
      return [];
    }
  }

  async toggleChallengeCompletion(challengeId: string, userName: string, deviceId: string): Promise<boolean> {
    try {
      // Check if the challenge is already completed
      const existing = await db
        .select()
        .from(challengeCompletions)
        .where(and(
          eq(challengeCompletions.challengeId, challengeId),
          eq(challengeCompletions.userName, userName),
          eq(challengeCompletions.deviceId, deviceId)
        ));

      if (existing.length > 0) {
        // Remove completion (uncomplete the challenge)
        await db
          .delete(challengeCompletions)
          .where(and(
            eq(challengeCompletions.challengeId, challengeId),
            eq(challengeCompletions.userName, userName),
            eq(challengeCompletions.deviceId, deviceId)
          ));
        return false; // Challenge is now uncompleted
      } else {
        // Add completion (complete the challenge)
        await db
          .insert(challengeCompletions)
          .values({
            challengeId,
            userName,
            deviceId
          });
        return true; // Challenge is now completed
      }
    } catch (error) {
      console.error('Database error in toggleChallengeCompletion:', error);
      return false;
    }
  }

  async getChallengeLeaderboard(): Promise<Array<{ userName: string; deviceId: string; completedCount: number }>> {
    try {
      const results = await db
        .select({
          userName: challengeCompletions.userName,
          deviceId: challengeCompletions.deviceId,
          completedCount: count(challengeCompletions.id)
        })
        .from(challengeCompletions)
        .groupBy(challengeCompletions.userName, challengeCompletions.deviceId)
        .orderBy(desc(count(challengeCompletions.id)));

      return results.map(r => ({
        userName: r.userName,
        deviceId: r.deviceId,
        completedCount: Number(r.completedCount)
      }));
    } catch (error) {
      console.error('Database error in getChallengeLeaderboard:', error);
      return [];
    }
  }
}

// Use in-memory storage for development when DATABASE_URL is not properly configured
export const storage = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost:5432') 
  ? new DatabaseStorage() 
  : new MemoryStorage();
