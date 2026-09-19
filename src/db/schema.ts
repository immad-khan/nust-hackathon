import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  tagline: text("tagline").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  categorySlug: varchar("category_slug", { length: 96 }).notNull(),
  categorySlugs: jsonb("category_slugs").$type<string[]>().notNull().default([]),
  price: integer("price").notNull(),
  compareAtPrice: integer("compare_at_price"),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  material: varchar("material", { length: 160 }).notNull().default(""),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  colors: jsonb("colors").$type<string[]>().notNull().default([]),
  details: jsonb("details").$type<string[]>().notNull().default([]),
  rating: integer("rating").notNull().default(50),
  reviewCount: integer("review_count").notNull().default(0),
  badge: varchar("badge", { length: 40 }),
  isBestSeller: boolean("is_best_seller").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  stock: integer("stock").notNull().default(24),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productSlug: varchar("product_slug", { length: 140 }).notNull(),
  author: varchar("author", { length: 120 }).notNull(),
  rating: integer("rating").notNull().default(5),
  title: varchar("title", { length: 160 }).notNull().default(""),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 60 }).notNull().default(""),
  address: text("address").notNull().default(""),
  city: varchar("city", { length: 120 }).notNull().default(""),
  postalCode: varchar("postal_code", { length: 40 }).notNull().default(""),
  country: varchar("country", { length: 120 }).notNull().default("Pakistan"),
  note: text("note").notNull().default(""),
  subtotal: integer("subtotal").notNull().default(0),
  shipping: integer("shipping").notNull().default(0),
  total: integer("total").notNull().default(0),
  status: varchar("status", { length: 40 }).notNull().default("confirmed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 32 }).notNull(),
  productSlug: varchar("product_slug", { length: 140 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  variant: varchar("variant", { length: 80 }).notNull().default(""),
  image: text("image").notNull().default(""),
  unitPrice: integer("unit_price").notNull().default(0),
  quantity: integer("quantity").notNull().default(1),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 60 }).notNull().default(""),
  preferredDate: varchar("preferred_date", { length: 60 }).notNull().default(""),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  originalName: varchar("original_name", { length: 200 }).notNull().default(""),
  mimeType: varchar("mime_type", { length: 60 }).notNull().default("image/jpeg"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  dataBase64: text("data_base64").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
