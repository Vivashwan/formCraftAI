import { boolean, integer, pgTable, serial, text, uuid, varchar } from "drizzle-orm/pg-core";

export const Users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  paymentSuccess: boolean("paymentSuccess").default(false),
});

export const JsonForms = pgTable("jsonForms", {
  id: serial("id").primaryKey(),
  // Public/URL identifier — unguessable, so forms can't be enumerated by id.
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  jsonform: text("jsonform").notNull(),
  theme: varchar("theme"),
  background: varchar("background"),
  style: varchar("style"),
  createdBy: varchar("createdBy").notNull(),
  createdAt: varchar("createdAt").notNull(),
  enabledSignIn: boolean('enabledSignIn').default(false),
  // Form settings
  closed: boolean("closed").default(false),
  maxResponses: integer("maxResponses"),
  limitOneResponse: boolean("limitOneResponse").default(false),
  thankYouMessage: varchar("thankYouMessage"),
  thankYouDescription: varchar("thankYouDescription"),
  redirectUrl: varchar("redirectUrl"),
  googleSheetId: varchar("googleSheetId"),
});

// Tracks each PhonePe checkout so the (unauthenticated) payment callback can
// map a transactionId back to the user who initiated it and unlock their plan.
export const Payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  transactionId: varchar("transactionId").notNull(),
  email: varchar("email").notNull(),
  status: varchar("status").default("PENDING"),
  createdAt: varchar("createdAt"),
});

export const userResponses = pgTable("userResponses", {
  id: serial("id").primaryKey(),
  jsonResponse: text("jsonResponse").notNull(),
  createdBy: varchar("createdBy").default("anonymous"),
  createdAt: varchar("createdAt").notNull(),
  formReference: integer("formReference").references(() => JsonForms.id),
});
