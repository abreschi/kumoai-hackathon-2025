import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  user_id: integer("user_id").notNull(),
  household_size: integer("household_size").notNull(),
  dietary_preference: text("dietary_preference").notNull(),
  primary_shopping_day: text("primary_shopping_day").notNull(),
});

export const products = pgTable("products", {
  product_id: integer("product_id").primaryKey(),
  product_name: text("product_name").notNull(),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  size: text("size").notNull(),
  unit: text("unit").notNull(),
  price_per_unit: decimal("price_per_unit", { precision: 10, scale: 2 }).notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: integer("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const recipes = pgTable("recipes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  missingItems: text("missing_items").array(),
});

export const userPreferences = pgTable("user_preferences", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  user_id: integer("user_id").notNull(),
  last_delivery_method: text("last_delivery_method").notNull(), // "delivery" or "pickup"
  updated_at: text("updated_at").notNull().default(sql`NOW()`),
});

export const insertUserSchema = createInsertSchema(users);

export const insertProductSchema = createInsertSchema(products);

export const insertCartItemSchema = createInsertSchema(cartItems);

export const insertRecipeSchema = createInsertSchema(recipes);

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ id: true, updated_at: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
