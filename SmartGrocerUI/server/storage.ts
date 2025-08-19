import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { userPreferences, type InsertUserPreferences } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // User preference methods
  getUserLastDeliveryMethod(userId: number): Promise<string | null>;
  updateUserDeliveryMethod(userId: number, deliveryMethod: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUserLastDeliveryMethod(userId: number): Promise<string | null> {
    try {
      const [preference] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .orderBy(desc(userPreferences.updated_at))
        .limit(1);
      
      return preference?.last_delivery_method || null;
    } catch (error) {
      console.error('Failed to get user delivery preference:', error);
      return null;
    }
  }

  async updateUserDeliveryMethod(userId: number, deliveryMethod: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Check if user already has a preference record
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .limit(1);

      if (existing) {
        // Update existing preference
        await db
          .update(userPreferences)
          .set({
            last_delivery_method: deliveryMethod,
            updated_at: now,
          })
          .where(eq(userPreferences.user_id, userId));
      } else {
        // Insert new preference
        await db.insert(userPreferences).values({
          user_id: userId,
          last_delivery_method: deliveryMethod,
          updated_at: now,
        });
      }
    } catch (error) {
      console.error('Failed to update user delivery preference:', error);
    }
  }
}

export const storage = new MemStorage();
